// Demo versions of the server functions (supabase/migrations/*). Same rules, same
// booking state machine, same notifications — just running on the phone.
import type { Ctx } from './client';
import { DemoError, localDate, nowISO, uid, type Row } from './store';

// Copied from public.booking_transitions in 20261120000000_core_booking.sql
const TRANSITIONS: [string, string, 'customer' | 'agency', boolean][] = [
  ['enquiry_submitted', 'under_review', 'agency', false],
  ['under_review', 'quotation_sent', 'agency', false],
  ['quotation_sent', 'under_review', 'agency', true],
  ['staff_matching', 'staff_proposed', 'agency', false],
  ['staff_proposed', 'staff_matching', 'agency', true],
  ['confirmed', 'active', 'agency', false],
  ['active', 'completed', 'agency', false],
  ['enquiry_submitted', 'unable_to_serve', 'agency', true],
  ['under_review', 'unable_to_serve', 'agency', true],
  ['enquiry_submitted', 'cancelled_by_agency', 'agency', true],
  ['under_review', 'cancelled_by_agency', 'agency', true],
  ['quotation_sent', 'cancelled_by_agency', 'agency', true],
  ['staff_matching', 'cancelled_by_agency', 'agency', true],
  ['staff_proposed', 'cancelled_by_agency', 'agency', true],
  ['confirmed', 'cancelled_by_agency', 'agency', true],
  ['active', 'cancelled_by_agency', 'agency', true],
  ['quotation_sent', 'staff_matching', 'customer', false],
  ['quotation_sent', 'under_review', 'customer', true],
  ['staff_proposed', 'confirmed', 'customer', false],
  ['staff_proposed', 'staff_matching', 'customer', true],
  ['enquiry_submitted', 'cancelled_by_customer', 'customer', true],
  ['under_review', 'cancelled_by_customer', 'customer', true],
  ['quotation_sent', 'cancelled_by_customer', 'customer', true],
  ['staff_matching', 'cancelled_by_customer', 'customer', true],
  ['staff_proposed', 'cancelled_by_customer', 'customer', true],
  ['confirmed', 'cancelled_by_customer', 'customer', true],
];

const LABEL: Record<string, string> = {
  enquiry_submitted: 'Enquiry submitted',
  under_review: 'Under review',
  quotation_sent: 'Quotation ready',
  staff_matching: 'Finding your staff',
  staff_proposed: 'Staff proposed',
  confirmed: 'Confirmed',
  active: 'Service active',
  completed: 'Completed',
  cancelled_by_customer: 'Cancelled by you',
  cancelled_by_agency: 'Cancelled by agency',
  unable_to_serve: 'Unable to serve',
};

const fail = (m: string, code = 'P0001'): never => {
  throw new DemoError(m, code);
};
const trimOrNull = (s: any) => (typeof s === 'string' && s.trim() ? s.trim() : null);
/** Same rules as public._clean_languages: trim, drop blanks, "Any" and duplicates. */
const cleanLanguages = (v: any): string[] => [
  ...new Set((Array.isArray(v) ? v : []).map((x) => String(x ?? '').trim()).filter((x) => x && x.toLowerCase() !== 'any')),
];
/** Demo data saved before languages became multi-select used a single `language_pref`. */
const bookingLanguages = (b: any): string[] => b.language_prefs ?? (b.language_pref ? [b.language_pref] : []);
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const RESPONSE: Record<string, string> = { urgent: 'within 1 hour', high: 'within 4 hours', normal: 'within 24 hours' };

export function runRpc(ctx: Ctx, name: string, a: Record<string, any>): any {
  const db = ctx.db;
  const me = ctx.uid()!;
  const agency = ctx.isAgency();
  const agencyIds = () => db.profiles.filter((p) => p.role === 'admin' || p.role === 'coordinator').map((p) => p.id);
  const requireAgency = () => {
    if (!agency) fail('Agency access required', '42501');
  };
  const booking = (id: string) => db.bookings.find((b) => b.id === id && (agency || b.customer_id === me)) ?? fail('Booking not found', 'P0002');

  function event(b: Row, from: string | null, to: string, reason: string | null, kind = 'status') {
    db.booking_events.push({ id: db._seq.event++, booking_id: b.id, from_status: from, to_status: to, actor_id: me, actor_role: ctx.role(), reason, kind, created_at: nowISO() });
  }

  function transition(id: string, to: string, reason?: string | null): Row {
    const b = booking(id);
    const actor = agency ? 'agency' : 'customer';
    const rule = TRANSITIONS.find(([f, t, who]) => f === b.status && t === to && who === actor);
    if (!rule) fail(`Cannot move booking from ${b.status} to ${to}`);
    if (rule![3] && !trimOrNull(reason)) fail('A reason is required for this change');
    const from = b.status;
    b.status = to;
    b.status_reason = trimOrNull(reason) ?? b.status_reason;
    b.updated_at = nowISO();
    event(b, from, to, trimOrNull(reason));
    const title = `${b.reference}: ${LABEL[to]}`;
    if (agency) ctx.notify([b.customer_id], { title, body: trimOrNull(reason) ?? 'Your booking status has been updated.', booking_id: b.id });
    else ctx.notify(agencyIds(), { title, body: trimOrNull(reason) ?? 'The customer updated this booking.', booking_id: b.id });
    return b;
  }

  const overlaps = (x: Row, y: Row) =>
    x.days_of_week.some((d: number) => y.days_of_week.includes(d)) &&
    (!x.time_start || !x.time_end || !y.time_start || !y.time_end || (x.time_start < y.time_end && y.time_start < x.time_end));
  const conflicts = (staffId: string, bookingId: string) => {
    const target = db.bookings.find((b) => b.id === bookingId)!;
    return db.assignments
      .filter((s) => s.staff_id === staffId && s.status === 'approved')
      .map((s) => db.bookings.find((b) => b.id === s.booking_id)!)
      .some((o) => o && o.id !== target.id && ['confirmed', 'active'].includes(o.status) && overlaps(target, o));
  };
  const commitAll = () => ctx.commit('bookings', 'quotations', 'assignments', 'booking_events', 'notifications', 'staff', 'support_tickets', 'ticket_messages');

  switch (name) {
    // ---------------------------------------------------------------- shared
    case 'check_serviceable':
      return db.service_zones.some((z) => z.pincode === a.p_pincode && z.active);

    case 'mark_notifications_read': {
      for (const n of db.notifications) {
        if (n.user_id === me && !n.read_at && (!a.p_ids || a.p_ids.includes(n.id))) n.read_at = nowISO();
      }
      ctx.commit('notifications');
      return null;
    }

    case 'get_agency_support': {
      const s = db.agency_settings[0];
      const canPay = agency || db.bookings.some((b) => b.customer_id === me && ['confirmed', 'active', 'completed'].includes(b.status));
      const unlocked = agency || db.bookings.some((b) => b.customer_id === me && b.payment_status === 'paid');
      return {
        agency_name: s.agency_name,
        support_hours: s.support_hours,
        unlocked,
        upi_id: canPay ? s.upi_id : null,
        upi_payee_name: canPay ? s.upi_payee_name : null,
        support_phone: unlocked ? s.support_phone : null,
        whatsapp_phone: unlocked ? s.whatsapp_phone : null,
        alternate_phone: unlocked ? s.alternate_phone : null,
        support_email: unlocked ? s.support_email : null,
      };
    }

    case 'get_booking_staff': {
      const b = db.bookings.find((x) => x.id === a.p_booking_id && (agency || x.customer_id === me));
      if (!b) return [];
      return db.assignments
        .filter((s) => s.booking_id === b.id)
        .sort((x, y) => (x.proposed_at < y.proposed_at ? 1 : -1))
        .map((s) => {
          const st = db.staff.find((x) => x.id === s.staff_id)!;
          return {
            assignment_id: s.id,
            assignment_status: s.status,
            agency_note: s.agency_note,
            proposed_at: s.proposed_at,
            staff_id: st.id,
            full_name: st.full_name,
            photo_url: st.photo_url,
            categories: st.categories,
            skills: st.skills,
            languages: st.languages,
            experience_years: st.experience_years,
            bio: st.bio,
            verification_status: st.verification_status,
            verified_at: st.verified_at,
            rating: st.rating,
          };
        });
    }

    case 'update_booking_status': {
      if (['quotation_sent', 'staff_proposed', 'confirmed'].includes(a.p_to)) fail('Use the dedicated action for this step');
      const before = booking(a.p_booking_id);
      const from = before.status;
      if (from === 'quotation_sent' && a.p_to === 'staff_matching') fail('Use the dedicated action for this step');
      const b = transition(a.p_booking_id, a.p_to, a.p_reason);
      const forBooking = (r: Row) => r.booking_id === b.id;
      if (a.p_to === 'under_review' && from === 'quotation_sent') {
        db.quotations.filter((q) => forBooking(q) && q.status === 'sent').forEach((q) => (q.status = 'superseded'));
      } else if (a.p_to === 'staff_matching' && from === 'staff_proposed') {
        db.assignments.filter((s) => forBooking(s) && s.status === 'proposed').forEach((s) => Object.assign(s, { status: 'withdrawn', decided_at: nowISO() }));
      } else if (['cancelled_by_customer', 'cancelled_by_agency', 'unable_to_serve', 'completed'].includes(a.p_to)) {
        db.quotations.filter((q) => forBooking(q) && q.status === 'sent').forEach((q) => (q.status = 'superseded'));
        db.assignments
          .filter((s) => forBooking(s) && ['proposed', 'approved'].includes(s.status))
          .forEach((s) => Object.assign(s, { status: s.status === 'approved' ? 'ended' : 'withdrawn', decided_at: nowISO() }));
        const st = db.staff.find((x) => x.id === b.assigned_staff_id);
        if (st && st.status === 'assigned') {
          const stillBusy = db.assignments.some(
            (s) => s.staff_id === st.id && s.status === 'approved' && ['confirmed', 'active'].includes(db.bookings.find((x) => x.id === s.booking_id)?.status),
          );
          if (!stillBusy) st.status = 'available';
        }
      }
      commitAll();
      return b;
    }

    // ---------------------------------------------------------------- customer: booking
    case 'submit_enquiry': {
      if (agency) fail('Agency users cannot book', '42501');
      const addr = db.customer_addresses.find((x) => x.id === a.p_address_id && x.customer_id === me) ?? fail('Address not found', 'P0002');
      if (!db.service_zones.some((z) => z.pincode === addr.pincode && z.active)) fail(`Sorry, we do not serve PIN code ${addr.pincode} yet`);
      if (!db.service_categories.some((c) => c.code === a.p_category_code && c.active)) fail('Unknown service');
      if (a.p_start_date < localDate()) fail('Start date cannot be in the past');
      const t = (v: any) => (v ? (String(v).length === 5 ? `${v}:00` : String(v)) : null);
      const b: Row = {
        id: uid(),
        reference: `BK-${db._seq.booking++}`,
        customer_id: me,
        address_id: addr.id,
        category_code: a.p_category_code,
        engagement_type: a.p_engagement_type,
        start_date: a.p_start_date,
        days_of_week: a.p_days_of_week ?? [1, 2, 3, 4, 5, 6],
        time_start: t(a.p_time_start),
        time_end: t(a.p_time_end),
        hours_per_day: a.p_hours_per_day ?? null,
        household_size: a.p_household_size ?? null,
        rooms: a.p_rooms ?? null,
        language_prefs: cleanLanguages(a.p_language_prefs),
        special_instructions: trimOrNull(a.p_special_instructions),
        trial_requested: !!a.p_trial_requested,
        status: 'enquiry_submitted',
        agreed_price: null,
        assigned_staff_id: null,
        status_reason: null,
        payment_status: 'unpaid',
        payment_method: null,
        payment_reference: null,
        paid_amount: null,
        paid_at: null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      if (b.time_start && b.time_end && b.time_start >= b.time_end) fail('End time must be after start time');
      db.bookings.push(b);
      event(b, null, 'enquiry_submitted', null);
      ctx.notify([me], { title: `${b.reference}: Enquiry received`, body: 'Thanks! The agency will review your request and send a quotation.', booking_id: b.id });
      ctx.notify(agencyIds(), { title: `New enquiry ${b.reference}`, body: 'A customer submitted a new service request.', booking_id: b.id });
      commitAll();
      return b;
    }

    case 'respond_quotation': {
      const q = db.quotations.find((x) => x.id === a.p_quotation_id && db.bookings.some((b) => b.id === x.booking_id && b.customer_id === me)) ?? fail('Quotation not found', 'P0002');
      if (q.status !== 'sent') fail('This quotation is no longer open');
      if (a.p_accept && q.valid_until < localDate()) fail('This quotation has expired; please ask the agency for a new one');
      Object.assign(q, { status: a.p_accept ? 'accepted' : 'rejected', customer_note: trimOrNull(a.p_note), responded_at: nowISO() });
      const b = transition(q.booking_id, a.p_accept ? 'staff_matching' : 'under_review', trimOrNull(a.p_note) ?? (a.p_accept ? 'Quotation accepted' : 'Quotation declined'));
      if (a.p_accept) b.agreed_price = Number(q.monthly_price) + Number(q.agency_fee) + Number(q.tax);
      commitAll();
      return b;
    }

    case 'respond_staff_proposal': {
      const s = db.assignments.find((x) => x.id === a.p_assignment_id && db.bookings.some((b) => b.id === x.booking_id && b.customer_id === me)) ?? fail('Proposal not found', 'P0002');
      if (s.status !== 'proposed') fail('This proposal is no longer open');
      let b: Row;
      if (a.p_approve) {
        if (conflicts(s.staff_id, s.booking_id)) fail('This staff member is no longer available for your schedule');
        Object.assign(s, { status: 'approved', customer_note: trimOrNull(a.p_note), decided_at: nowISO() });
        b = transition(s.booking_id, 'confirmed', trimOrNull(a.p_note) ?? 'Staff approved');
        b.assigned_staff_id = s.staff_id;
        const st = db.staff.find((x) => x.id === s.staff_id);
        if (st) st.status = 'assigned';
      } else {
        Object.assign(s, { status: 'rejected', customer_note: trimOrNull(a.p_note), decided_at: nowISO() });
        b = transition(s.booking_id, 'staff_matching', trimOrNull(a.p_note) ?? 'Customer asked for another option');
      }
      commitAll();
      return b;
    }

    // ---------------------------------------------------------------- agency: booking
    case 'send_quotation': {
      requireAgency();
      const b = booking(a.p_booking_id);
      if (a.p_valid_until < localDate()) fail('Validity date cannot be in the past');
      if (!trimOrNull(a.p_scope)) fail('Scope of work is required');
      if (b.status === 'enquiry_submitted') transition(b.id, 'under_review', null);
      db.quotations.filter((q) => q.booking_id === b.id && q.status === 'sent').forEach((q) => (q.status = 'superseded'));
      const q = {
        id: uid(),
        booking_id: b.id,
        scope: a.p_scope.trim(),
        monthly_price: Number(a.p_monthly_price),
        agency_fee: Number(a.p_agency_fee ?? 0),
        deposit: Number(a.p_deposit ?? 0),
        tax: Number(a.p_tax ?? 0),
        terms: trimOrNull(a.p_terms),
        valid_until: a.p_valid_until,
        status: 'sent',
        customer_note: null,
        created_by: me,
        created_at: nowISO(),
        responded_at: null,
      };
      db.quotations.push(q);
      transition(b.id, 'quotation_sent', `Your quotation is ready: ${inr(q.monthly_price)} per month. Please review and respond.`);
      commitAll();
      return q;
    }

    case 'staff_candidates': {
      requireAgency();
      const b = booking(a.p_booking_id);
      const addr = db.customer_addresses.find((x) => x.id === b.address_id);
      return db.staff
        .filter((s) => s.status !== 'inactive' && s.categories.includes(b.category_code))
        .map((s) => ({
          staff_id: s.id,
          code: s.code,
          full_name: s.full_name,
          status: s.status,
          verification_status: s.verification_status,
          experience_years: s.experience_years,
          languages: s.languages,
          rating: s.rating,
          zone_pincode: s.zone_pincode,
          zone_match: s.zone_pincode === addr?.pincode,
          language_match: bookingLanguages(b).length === 0 || bookingLanguages(b).some((l) => s.languages.includes(l)),
          has_conflict: conflicts(s.id, b.id),
        }))
        .sort(
          (x, y) =>
            Number(y.verification_status === 'verified') - Number(x.verification_status === 'verified') ||
            Number(x.has_conflict) - Number(y.has_conflict) ||
            Number(y.zone_match) - Number(x.zone_match) ||
            Number(y.language_match) - Number(x.language_match) ||
            (y.rating ?? 0) - (x.rating ?? 0),
        );
    }

    case 'propose_staff': {
      requireAgency();
      const b = booking(a.p_booking_id);
      if (b.status !== 'staff_matching') fail(`Staff can only be proposed while matching (current: ${b.status})`);
      const st = db.staff.find((x) => x.id === a.p_staff_id) ?? fail('Staff member not found', 'P0002');
      if (st.verification_status !== 'verified') fail('Only verified staff can be proposed');
      if (['inactive', 'on_leave'].includes(st.status)) fail('This staff member is not available');
      if (!st.categories.includes(b.category_code)) fail('This staff member does not offer the requested service');
      if (conflicts(st.id, b.id)) fail('This staff member already has a booking at that time');
      const s = { id: uid(), booking_id: b.id, staff_id: st.id, status: 'proposed', agency_note: trimOrNull(a.p_note), customer_note: null, proposed_by: me, proposed_at: nowISO(), decided_at: null };
      db.assignments.push(s);
      transition(b.id, 'staff_proposed', `${st.full_name} has been proposed for your booking. Please review and approve.`);
      commitAll();
      return s;
    }

    // ---------------------------------------------------------------- payments
    case 'submit_payment': {
      const b = db.bookings.find((x) => x.id === a.p_booking_id && x.customer_id === me) ?? fail('Booking not found', 'P0002');
      if (!['confirmed', 'active'].includes(b.status)) fail('Payment opens once your staff member is confirmed');
      if (b.payment_status !== 'unpaid') fail('A payment is already recorded for this booking');
      if (!['upi', 'bank_transfer'].includes(a.p_method)) fail('Choose UPI or bank transfer');
      if (!trimOrNull(a.p_reference)) fail('Please enter the transaction reference');
      Object.assign(b, { payment_status: 'pending_verification', payment_method: a.p_method, payment_reference: a.p_reference.trim() });
      event(b, b.status, b.status, `Payment submitted · ref ${a.p_reference.trim()}`, 'payment');
      ctx.notify(agencyIds(), { title: `${b.reference}: payment to verify`, body: `Customer submitted payment reference ${a.p_reference.trim()}.`, booking_id: b.id });
      commitAll();
      return b;
    }

    case 'confirm_payment': {
      requireAgency();
      const b = booking(a.p_booking_id);
      if (!['confirmed', 'active', 'completed'].includes(b.status)) fail('Payments can be recorded once the booking is confirmed');
      if (b.payment_status === 'paid') fail('This booking is already paid');
      Object.assign(b, {
        payment_status: 'paid',
        payment_method: a.p_method ?? b.payment_method ?? 'cash',
        payment_reference: trimOrNull(a.p_reference) ?? b.payment_reference,
        paid_amount: a.p_amount ?? b.agreed_price,
        paid_at: nowISO(),
      });
      event(b, b.status, b.status, `Payment received · ${inr(Number(b.paid_amount ?? 0))}`, 'payment');
      ctx.notify([b.customer_id], { title: `${b.reference}: payment received`, body: 'Thank you! Your dedicated support line is now unlocked in the app.', booking_id: b.id });
      commitAll();
      return b;
    }

    case 'reject_payment': {
      requireAgency();
      if (!trimOrNull(a.p_reason)) fail('A reason is required for this change');
      const b = booking(a.p_booking_id);
      if (b.payment_status !== 'pending_verification') fail('There is no payment waiting for verification');
      Object.assign(b, { payment_status: 'unpaid', payment_reference: null, payment_method: null });
      event(b, b.status, b.status, `Payment not verified · ${a.p_reason.trim()}`, 'payment');
      ctx.notify([b.customer_id], { title: `${b.reference}: payment not verified`, body: a.p_reason.trim(), booking_id: b.id });
      commitAll();
      return b;
    }

    // ---------------------------------------------------------------- support
    case 'create_support_ticket': {
      if (agency) fail('Support requests are raised by customers', '42501');
      if (!trimOrNull(a.p_message)) fail('Please describe the issue');
      if (!trimOrNull(a.p_subject) || a.p_subject.trim().length < 3) fail('Please add a short title');
      if (a.p_booking_id && !db.bookings.some((b) => b.id === a.p_booking_id && b.customer_id === me)) fail('Booking not found', 'P0002');
      const paid = db.bookings.some((b) => b.customer_id === me && b.payment_status === 'paid');
      const priority = a.p_category === 'safety' ? 'urgent' : paid ? 'high' : 'normal';
      const t = {
        id: uid(),
        reference: `SR-${db._seq.ticket++}`,
        customer_id: me,
        booking_id: a.p_booking_id ?? null,
        category: a.p_category,
        subject: a.p_subject.trim(),
        priority,
        is_priority_customer: paid,
        status: 'open',
        last_message_at: nowISO(),
        resolved_at: null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      db.support_tickets.push(t);
      db.ticket_messages.push({ id: db._seq.message++, ticket_id: t.id, author_id: me, author_role: 'customer', body: a.p_message.trim(), created_at: nowISO() });
      const tag = priority === 'urgent' ? '🚨 URGENT ' : priority === 'high' ? '⭐ Priority ' : '';
      ctx.notify(agencyIds(), { title: `${tag}support request ${t.reference}`, body: t.subject, booking_id: t.booking_id, ticket_id: t.id });
      ctx.notify([me], { title: `${t.reference}: request received`, body: `We will respond ${RESPONSE[priority]}.`, booking_id: t.booking_id, ticket_id: t.id });
      commitAll();
      return t;
    }

    case 'reply_to_ticket': {
      const t = db.support_tickets.find((x) => x.id === a.p_ticket_id && (agency || x.customer_id === me)) ?? fail('Request not found', 'P0002');
      if (!trimOrNull(a.p_message)) fail('Message cannot be empty');
      if (t.status === 'closed' && !agency) fail('This request is closed. Please raise a new one.');
      const m = { id: db._seq.message++, ticket_id: t.id, author_id: me, author_role: ctx.role(), body: a.p_message.trim(), created_at: nowISO() };
      db.ticket_messages.push(m);
      t.last_message_at = nowISO();
      if (agency && t.status === 'open') t.status = 'in_progress';
      if (!agency && t.status === 'resolved') Object.assign(t, { status: 'open', resolved_at: null });
      const recipients = agency ? [t.customer_id] : agencyIds();
      ctx.notify(recipients, { title: `${t.reference}: new reply`, body: m.body.slice(0, 140), booking_id: t.booking_id, ticket_id: t.id });
      commitAll();
      return m;
    }

    case 'set_ticket_status': {
      const t = db.support_tickets.find((x) => x.id === a.p_ticket_id && (agency || x.customer_id === me)) ?? fail('Request not found', 'P0002');
      const to = a.p_status;
      if (!agency && !(to === 'closed' || (to === 'open' && ['resolved', 'closed'].includes(t.status)))) {
        fail('You can close this request or reopen it once resolved', '42501');
      }
      if (t.status === to) return t;
      t.status = to;
      t.resolved_at = to === 'resolved' ? nowISO() : to === 'open' ? null : t.resolved_at;
      t.updated_at = nowISO();
      const label = { open: 'reopened', in_progress: 'in progress', resolved: 'resolved', closed: 'closed' }[to as string];
      const note = trimOrNull(a.p_note);
      db.ticket_messages.push({ id: db._seq.message++, ticket_id: t.id, author_id: me, author_role: ctx.role(), body: `Marked ${label}${note ? ` · ${note}` : ''}`, created_at: nowISO() });
      ctx.notify(agency ? [t.customer_id] : agencyIds(), { title: `${t.reference}: ${label}`, body: note ?? 'Your support request was updated.', booking_id: t.booking_id, ticket_id: t.id });
      commitAll();
      return t;
    }

    case 'set_ticket_priority': {
      requireAgency();
      const t = db.support_tickets.find((x) => x.id === a.p_ticket_id) ?? fail('Request not found', 'P0002');
      t.priority = a.p_priority;
      commitAll();
      return t;
    }
  }
  return fail(`Demo: function ${name} is not available`);
}
