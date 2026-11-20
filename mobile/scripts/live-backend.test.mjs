// Live regression test: every app feature, end to end, against the local Supabase stack.
// Needs `npx supabase start` (from the project root). Safe to run repeatedly.
//
//   npm run test:live            (or: node scripts/live-backend.test.mjs)
//
// Uses the test phones from supabase/config.toml ([auth.sms.test_otp], code 123456).
// Reads EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY from the environment or .env.local.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const lines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').map((l) => l.trim());
    const line = lines.find((l) => l.startsWith(name + '='));
    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}
const URL_ = env('EXPO_PUBLIC_SUPABASE_URL');
const KEY = env('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
if (!URL_ || !KEY) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or create .env.local).');
  process.exit(2);
}
const RUN = Date.now().toString(36); // keeps names unique so the test can be rerun

let fails = 0;
const check = (label, cond, extra = '') => { console.log(cond ? 'PASS' : 'FAIL', label, extra); if (!cond) fails++; };
const ok = (label, r) => {
  if (r.error) { fails++; console.log('FAIL', label, '-', r.error.message); throw new Error(label); }
  console.log('PASS', label); return r.data;
};

async function login(phone) {
  const c = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  // Supabase allows one code request per number per second; wait and retry if we hit that.
  let sent = await c.auth.signInWithOtp({ phone });
  for (let i = 0; i < 5 && sent.error && /security purposes/i.test(sent.error.message); i++) {
    await new Promise((r) => setTimeout(r, 1500));
    sent = await c.auth.signInWithOtp({ phone });
  }
  ok(`send OTP ${phone}`, sent);
  ok(`verify OTP ${phone}`, await c.auth.verifyOtp({ phone, token: '123456', type: 'sms' }));
  return c;
}

async function main() {
  const anon = createClient(URL_, KEY, { auth: { persistSession: false } });
  check('wrong OTP rejected', !!(await anon.auth.verifyOtp({ phone: '+919999900001', token: '000000', type: 'sms' })).error);

  const A = await login('+919999900001');
  const ADM = await login('+919999900099');
  const B = await login('+919999900002');

  // ---------- customer profile & addresses
  const meA = ok('customer profile', await A.from('profiles').select('*').single());
  check('customer role', meA.role === 'customer');
  ok('update profile name', await A.from('profiles').update({ full_name: 'Test Customer A' }).eq('id', meA.id));
  check('role change blocked', (await A.from('profiles').update({ role: 'admin' }).eq('id', meA.id).select().maybeSingle()).data?.role !== 'admin');
  const admId = (await ADM.auth.getUser()).data.user.id; const adm = ok('agency profile', await ADM.from('profiles').select('*').eq('id', admId).single());
  check('agency role from allowlist', adm.role !== 'customer', adm.role);

  check('serviceable PIN', !!ok('check_serviceable 560038', await A.rpc('check_serviceable', { p_pincode: '560038' })));
  check('non-serviceable PIN', !ok('check_serviceable 110001', await A.rpc('check_serviceable', { p_pincode: '110001' })));
  check('categories visible', ok('categories', await A.from('service_categories').select('*')).length === 6);
  check('zones visible', ok('zones', await A.from('service_zones').select('*')).length >= 5);

  await A.from('customer_addresses').update({ is_default: false }).eq('is_default', true);
  const addr = ok('add address', await A.from('customer_addresses').insert({ label: 'Home', line1: '12 Test Road', flat_no: '4B', building: 'Lake View', landmark: 'Near park', pincode: '560038', city: 'Bengaluru', is_default: true }).select().single());

  // ---------- booking flow
  const start = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const bk = ok('submit enquiry', await A.rpc('submit_enquiry', { p_address_id: addr.id, p_category_code: 'home_care', p_engagement_type: 'part_time', p_start_date: start, p_days_of_week: [1, 3, 5], p_time_start: '07:00', p_time_end: '09:00', p_language_prefs: ['Tamil', ' Kannada ', 'Tamil', 'Any'] }));
  const bookingId = bk?.id ?? bk;
  const saved = ok('read booking', await A.from('bookings').select('language_prefs').eq('id', bookingId).single());
  check('multi-language preference saved (cleaned)', JSON.stringify(saved.language_prefs) === '["Tamil","Kannada"]', JSON.stringify(saved.language_prefs));
  check('customer cannot read staff table', ok('staff (customer)', await A.from('staff').select('*')).length === 0);
  check('customer blocked from agency RPC', !!(await A.rpc('send_quotation', { p_booking_id: bookingId, p_scope: 'x', p_monthly_price: 1, p_valid_until: start })).error);

  const queue = ok('agency queue', await ADM.from('bookings').select('*, customer_addresses(*), service_categories(name), profiles(full_name, phone, avatar_path)').order('updated_at', { ascending: false }));
  check('agency sees booking', queue.some((b) => b.id === bookingId));
  ok('agency notifications', await ADM.from('notifications').select('*').limit(5));
  ok('mark review', await ADM.rpc('update_booking_status', { p_booking_id: bookingId, p_to: 'under_review' }));

  const tpls = ok('scope templates', await ADM.from('scope_templates').select('*'));
  check('default templates present', tpls.length >= 6, `(got ${tpls.length})`);
  const tpl = ok('add template', await ADM.from('scope_templates').insert({ title: `E2E template ${RUN}`, body: 'Test scope', category_code: 'home_care' }).select().single());
  ok('edit template', await ADM.from('scope_templates').update({ body: 'Edited scope' }).eq('id', tpl.id));
  ok('delete template', await ADM.from('scope_templates').delete().eq('id', tpl.id));

  ok('send quotation', await ADM.rpc('send_quotation', { p_booking_id: bookingId, p_scope: tpls[0]?.body ?? 'Cleaning', p_monthly_price: 6000, p_valid_until: start, p_tax: 1080 }));

  const [q1] = ok('customer sees quote', await A.from('quotations').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1));
  ok('ask for changes', await A.rpc('respond_quotation', { p_quotation_id: q1.id, p_accept: false, p_note: 'Can it be 5500?' }));
  ok('re-send quotation', await ADM.rpc('send_quotation', { p_booking_id: bookingId, p_scope: 'Cleaning revised', p_monthly_price: 5500, p_valid_until: start }));
  const [q2] = ok('customer sees revised quote', await A.from('quotations').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1));
  ok('accept quote', await A.rpc('respond_quotation', { p_quotation_id: q2.id, p_accept: true }));

  // staff roster
  const roster = ok('staff roster', await ADM.from('staff').select('*'));
  check('5 seeded staff', roster.length >= 5);
  const newStaff = ok('add staff', await ADM.from('staff').insert({ full_name: `E2E Staff ${RUN}`, phone: `98${String(Date.now()).slice(-8)}`, categories: ['home_care'], languages: ['Kannada'], verification_status: 'verified', zone_pincode: '560038' }).select().single());
  ok('edit staff', await ADM.from('staff').update({ bio: 'Edited bio' }).eq('id', newStaff.id));

  const cands = ok('ranked candidates', await ADM.rpc('staff_candidates', { p_booking_id: bookingId }));
  check('candidates returned', cands.length > 0, `(${cands.length})`);
  for (const c of cands) {
    const expected = c.languages.some((l) => ['Tamil', 'Kannada'].includes(l));
    check(`language match for ${c.full_name}`, c.language_match === expected, `(${c.languages.join('/')})`);
  }
  const unverified = roster.find((s) => s.verification_status !== 'verified');
  if (unverified) check('unverified staff blocked', !!(await ADM.rpc('propose_staff', { p_booking_id: bookingId, p_staff_id: unverified.id })).error);
  const sunita = roster.find((s) => s.code === 'ST-0184');
  ok('propose staff #1', await ADM.rpc('propose_staff', { p_booking_id: bookingId, p_staff_id: sunita.id, p_note: 'Experienced' }));
  let bs = ok('customer views proposed staff', await A.rpc('get_booking_staff', { p_booking_id: bookingId }));
  check('limited staff profile (no phone)', bs.length > 0 && !('phone' in bs[0]));
  ok('reject staff', await A.rpc('respond_staff_proposal', { p_assignment_id: bs[0].assignment_id, p_approve: false, p_note: 'Prefer someone else' }));
  ok('propose staff #2', await ADM.rpc('propose_staff', { p_booking_id: bookingId, p_staff_id: newStaff.id }));
  bs = ok('customer views new proposal', await A.rpc('get_booking_staff', { p_booking_id: bookingId }));
  const pending = bs.find((s) => s.assignment_status === 'proposed') ?? bs[bs.length - 1];
  ok('approve staff', await A.rpc('respond_staff_proposal', { p_assignment_id: pending.assignment_id, p_approve: true }));

  // payments & support unlock
  let sup = ok('agency support (before pay)', await A.rpc('get_agency_support'));
  // Unlocks after the first confirmed payment, so this only applies to a customer who never paid.
  const paidBefore = ok('earlier paid bookings', await A.from('bookings').select('id').eq('payment_status', 'paid')).length > 0;
  check('support locked before first payment', paidBefore || !sup.unlocked, paidBefore ? '(already paid on an earlier run)' : '');
  ok('submit UPI payment', await A.rpc('submit_payment', { p_booking_id: bookingId, p_method: 'upi', p_reference: 'UTR000111' }));
  check('customer cannot confirm payment', !!(await A.rpc('confirm_payment', { p_booking_id: bookingId })).error);
  ok('agency rejects payment', await ADM.rpc('reject_payment', { p_booking_id: bookingId, p_reason: 'UTR not found' }));
  ok('resubmit payment', await A.rpc('submit_payment', { p_booking_id: bookingId, p_method: 'upi', p_reference: 'UTR000222' }));
  ok('agency confirms payment', await ADM.rpc('confirm_payment', { p_booking_id: bookingId }));
  sup = ok('agency support (after pay)', await A.rpc('get_agency_support'));
  check('support unlocked after payment', !!sup.unlocked);

  ok('agency settings read', await ADM.from('agency_settings').select('*').single());
  ok('agency settings update', await ADM.from('agency_settings').update({ upi_id: 'manemaid@upi' }).not('id', 'is', null));

  ok('start service', await ADM.rpc('update_booking_status', { p_booking_id: bookingId, p_to: 'active' }));
  ok('complete service', await ADM.rpc('update_booking_status', { p_booking_id: bookingId, p_to: 'completed' }));
  const evs = ok('timeline', await A.from('booking_events').select('*').eq('booking_id', bookingId));
  check('audit trail recorded', evs.length >= 8, `(${evs.length} events)`);

  // cancel flow on a second booking
  const bk2 = ok('submit 2nd enquiry', await A.rpc('submit_enquiry', { p_address_id: addr.id, p_category_code: 'cooking', p_engagement_type: 'part_time', p_start_date: start, p_days_of_week: [2], p_time_start: '18:00', p_time_end: '19:00' }));
  const bk2Id = bk2?.id ?? bk2;
  check('no preference stored as empty list', ok('bk2', await A.from('bookings').select('language_prefs').eq('id', bk2Id).single()).language_prefs.length === 0);
  check('no preference -> every candidate matches', ok('bk2 candidates', await ADM.rpc('staff_candidates', { p_booking_id: bk2Id })).every((c) => c.language_match));
  check('cancel without reason rejected', !!(await A.rpc('update_booking_status', { p_booking_id: bk2?.id ?? bk2, p_to: 'cancelled_by_customer' })).error);
  ok('cancel with reason', await A.rpc('update_booking_status', { p_booking_id: bk2?.id ?? bk2, p_to: 'cancelled_by_customer', p_reason: 'Plans changed' }));

  // support tickets
  const t = ok('raise ticket (paid → high)', await A.rpc('create_support_ticket', { p_category: 'quality', p_subject: 'Kitchen skipped', p_message: 'Please check', p_booking_id: bookingId }));
  const tid = t?.id ?? t;
  const tk = ok('ticket row', await A.from('support_tickets').select('*').eq('id', tid).single());
  check('paying customer gets high priority', tk.priority === 'high', tk.priority);
  const ts = ok('raise safety ticket', await B.rpc('create_support_ticket', { p_category: 'safety', p_subject: 'Safety concern', p_message: 'Urgent' }));
  check('safety → urgent', ok('safety row', await B.from('support_tickets').select('priority').eq('id', ts?.id ?? ts).single()).priority === 'urgent');
  ok('customer message', await A.rpc('reply_to_ticket', { p_ticket_id: tid, p_message: 'Any update?' }));
  ok('agency reply', await ADM.rpc('reply_to_ticket', { p_ticket_id: tid, p_message: 'On it' }));
  ok('agency re-prioritise', await ADM.rpc('set_ticket_priority', { p_ticket_id: tid, p_priority: 'urgent' }));
  ok('agency resolve', await ADM.rpc('set_ticket_status', { p_ticket_id: tid, p_status: 'resolved', p_note: 'Done' }));
  check('thread visible', ok('messages', await A.from('ticket_messages').select('*').eq('ticket_id', tid)).length >= 3);

  // inbox
  const notes = ok('customer inbox', await A.from('notifications').select('*'));
  check('customer got notifications', notes.length > 0, `(${notes.length})`);
  ok('mark all read', await A.rpc('mark_notifications_read', {}));

  // privacy
  const bId = (await B.auth.getUser()).data.user.id;
  check('B sees no other customer bookings', ok('B bookings', await B.from('bookings').select('customer_id')).every((r) => r.customer_id === bId));
  check('B sees no other customer addresses', ok('B addresses', await B.from('customer_addresses').select('customer_id')).every((r) => r.customer_id === bId));
  const bTickets = ok('B tickets', await B.from('support_tickets').select('customer_id'));
  check('B sees only own tickets', bTickets.length >= 1 && bTickets.every((t) => t.customer_id === bId));

  // storage buckets (photo upload)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  ok('upload avatar', await A.storage.from('avatars').upload(`${meA.id}/e2e-${Date.now()}.png`, png, { contentType: 'image/png' }));
  ok('upload staff photo', await ADM.storage.from('staff-photos').upload(`${newStaff.id}/e2e-${Date.now()}.png`, png, { contentType: 'image/png' }));
  check('customer cannot upload staff photo', !!(await A.storage.from('staff-photos').upload(`x/e2e-${Date.now()}.png`, png, { contentType: 'image/png' })).error);
}

main().catch((e) => console.log('STOPPED at:', e.message)).finally(() => {
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
});
