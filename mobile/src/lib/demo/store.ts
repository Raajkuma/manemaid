// Offline demo database: a small JSON store kept on the phone.
// Pure TypeScript (no React Native imports) so it can also be tested under Node.

export type Row = Record<string, any>;

export class DemoError extends Error {
  code: string;
  constructor(message: string, code = 'P0001') {
    super(message);
    this.code = code;
  }
}
export type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export const TABLES = [
  'profiles',
  'customer_addresses',
  'service_categories',
  'service_zones',
  'staff',
  'bookings',
  'quotations',
  'assignments',
  'booking_events',
  'notifications',
  'agency_settings',
  'scope_templates',
  'support_tickets',
  'ticket_messages',
  'offers',
  'app_config',
  'legal_documents',
  'greetings',
  'greeting_deliveries',
] as const;
export type Table = (typeof TABLES)[number];

export type DB = Record<Table, Row[]> & { _seq: Record<string, number>; _version: number };

export const DB_KEY = 'manemaid-demo-db-v1';
export const SESSION_KEY = 'manemaid-demo-session-v1';
export const PHOTO_PREFIX = 'manemaid-demo-photo:';

/** Demo logins. The verification code is always 123456. */
export const DEMO_CUSTOMER_PHONE = '919999900001';
export const DEMO_AGENCY_PHONE = '919999900099';
export const DEMO_CUSTOMER_ID = 'demo-customer';
export const DEMO_AGENCY_ID = 'demo-agency';
export const AGENCY_PHONES: Record<string, { id: string; role: 'admin' | 'coordinator'; name: string }> = {
  [DEMO_AGENCY_PHONE]: { id: DEMO_AGENCY_ID, role: 'admin', name: 'ManeMaid Admin' },
};

export function uid(): string {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
}
export const nowISO = () => new Date().toISOString();
/** Local calendar date (not UTC). */
export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export function loadDB(kv: KV): DB {
  const raw = kv.getItem(DB_KEY);
  if (raw) {
    try {
      const db = JSON.parse(raw) as DB;
      for (const t of TABLES) db[t] ??= [];
      db._seq ??= {};
      // Data saved before preferred languages became multi-select.
      for (const b of db.bookings) {
        if (!Array.isArray(b.language_prefs)) b.language_prefs = b.language_pref ? [b.language_pref] : [];
        delete b.language_pref;
      }
      return db;
    } catch {
      // fall through to a fresh seed
    }
  }
  const db = seed();
  kv.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

export function seed(): DB {
  const db = Object.fromEntries(TABLES.map((t) => [t, [] as Row[]])) as unknown as DB;
  db._seq = { booking: 2049, staff: 300, ticket: 1001, event: 1, message: 1 };
  db._version = 1;

  db.service_categories = [
    { code: 'home_care', name: 'Home care', description: 'Daily cleaning, dusting, mopping and laundry', sort_order: 1, active: true },
    { code: 'cooking', name: 'Cooking', description: "Home-style meals prepared to your family's taste", sort_order: 2, active: true },
    { code: 'child_care', name: 'Child care', description: 'Trained nannies for infants and young children', sort_order: 3, active: true },
    { code: 'elder_care', name: 'Elder care', description: 'Companionship and daily assistance for seniors', sort_order: 4, active: true },
    { code: 'housekeeping', name: 'Housekeeping', description: 'Deep cleaning and full home upkeep', sort_order: 5, active: true },
    { code: 'live_in', name: 'Live-in help', description: 'Full-time help who stays with your family', sort_order: 6, active: true },
  ];
  db.service_zones = [
    { pincode: '560038', area_name: 'Indiranagar', city: 'Bengaluru', active: true },
    { pincode: '560034', area_name: 'Koramangala', city: 'Bengaluru', active: true },
    { pincode: '560102', area_name: 'HSR Layout', city: 'Bengaluru', active: true },
    { pincode: '560066', area_name: 'Whitefield', city: 'Bengaluru', active: true },
    { pincode: '560041', area_name: 'Jayanagar', city: 'Bengaluru', active: true },
  ];

  const staff = (code: string, full_name: string, categories: string[], skills: string[], languages: string[], years: number, zone: string, bio: string, verified: boolean, rating: number | null) => ({
    id: `staff-${code}`,
    code,
    full_name,
    photo_url: null,
    phone: null, // demo: no real numbers
    alternate_phone: null,
    whatsapp_phone: null,
    email: null,
    preferred_contact: 'call',
    address: `${zone === '560038' ? 'Indiranagar' : 'Bengaluru'} (demo address)`,
    categories,
    skills,
    languages,
    experience_years: years,
    zone_pincode: zone,
    bio,
    verification_status: verified ? 'verified' : 'in_progress',
    verified_at: verified ? ago(24 * 60) : null,
    status: 'available',
    rating,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    created_at: ago(24 * 90),
    updated_at: ago(24 * 90),
  });
  db.staff = [
    staff('ST-0184', 'Sunita Sharma', ['home_care', 'housekeeping'], ['cleaning', 'laundry', 'ironing'], ['Hindi', 'Kannada'], 8, '560038', 'Reliable and detail-oriented, with eight years of experience in family homes.', true, 4.9),
    staff('ST-0217', 'Meena Kumari', ['cooking'], ['north_indian', 'south_indian', 'tiffin'], ['Hindi', 'Tamil'], 6, '560034', 'Cooks fresh North and South Indian meals; comfortable with dietary requirements.', true, 4.8),
    staff('ST-0096', 'Asha Devi', ['child_care'], ['infant_care', 'first_aid', 'homework_help'], ['Hindi', 'English'], 10, '560102', 'Experienced nanny with first-aid training.', true, 4.9),
    staff('ST-0241', 'Lakshmi Rao', ['housekeeping', 'home_care'], ['deep_cleaning', 'organising'], ['Kannada', 'Telugu'], 3, '560066', 'New to the agency; verification in progress.', false, null),
    staff('ST-0159', 'Farida Begum', ['elder_care', 'home_care'], ['mobility_support', 'medication_reminders', 'companionship'], ['Urdu', 'Hindi', 'Kannada'], 12, '560041', 'Patient and caring; experienced with seniors who need daily support.', true, 4.7),
  ];

  db.agency_settings = [
    {
      id: true,
      agency_name: 'ManeMaid',
      support_phone: '918000000000',
      whatsapp_phone: '918000000000',
      alternate_phone: '918000000001',
      support_email: 'support@manemaid.demo',
      support_hours: 'Mon–Sat, 8 AM – 8 PM',
      upi_id: 'manemaid.demo@upi',
      upi_payee_name: 'ManeMaid (demo)',
      updated_at: nowISO(),
    },
  ];

  db.scope_templates = [
    ['Daily home cleaning', 'Sweeping and mopping all rooms, dusting furniture, cleaning kitchen counters and sink, washing utensils and taking out the trash.', 'home_care'],
    ['Cooking – breakfast & lunch', "Preparing breakfast and lunch for the household as per the family's menu, chopping and prep, and cleaning the kitchen after cooking.", 'cooking'],
    ['Nanny – day care', "Feeding, bathing and dressing the child, play and nap routine, keeping the child's room tidy and sharing daily updates with parents.", 'child_care'],
    ['Elder care – daytime', 'Companionship, help with mobility and bathing, medication reminders, simple meals and light housekeeping of the room.', 'elder_care'],
    ['Deep cleaning', 'Full home deep clean: bathrooms, kitchen degreasing, windows, fans and fixtures, cupboards and balconies.', 'housekeeping'],
    ['Live-in help', 'Full-time live-in help: daily cleaning, cooking assistance, laundry and household support. Weekly off as agreed.', 'live_in'],
  ].map(([title, body, category_code], i) => ({
    id: `tpl-${i + 1}`,
    title,
    body,
    category_code,
    sort_order: i + 1,
    active: true,
    created_at: ago(24 * 30),
    updated_at: ago(24 * 30),
  }));

  // The demo agency account exists from the start, so customer actions reach its inbox.
  db.profiles.push({ id: DEMO_AGENCY_ID, role: 'admin', full_name: 'ManeMaid Admin', phone: DEMO_AGENCY_PHONE, email: null, preferred_language: 'en', avatar_path: null, created_at: ago(24 * 90), updated_at: ago(24 * 90) });

  // Sample customers so the agency side has something to work with.
  const people = [
    { id: 'demo-riya', name: 'Riya Malhotra', phone: '919000000101', pin: '560038', street: '12 CMH Road', flat: '4B', building: 'Lake View', landmark: 'Near metro' },
    { id: 'demo-arjun', name: 'Arjun Mehta', phone: '919000000102', pin: '560034', street: '80 Feet Road', flat: '12', building: 'Sunrise Apts', landmark: 'Opp. park' },
    { id: 'demo-neha', name: 'Neha & Vikram', phone: '919000000103', pin: '560102', street: '27th Main', flat: '301', building: 'Green Woods', landmark: 'Near BDA complex' },
  ];
  for (const p of people) {
    db.profiles.push({ id: p.id, role: 'customer', full_name: p.name, phone: p.phone, email: null, preferred_language: 'en', avatar_path: null, created_at: ago(24 * 20), updated_at: ago(24 * 20) });
    db.customer_addresses.push({
      id: `addr-${p.id}`, customer_id: p.id, label: 'Home', line1: p.street, flat_no: p.flat, building: p.building, landmark: p.landmark,
      access_notes: null, pincode: p.pin, city: 'Bengaluru', latitude: null, longitude: null, is_default: true, created_at: ago(24 * 20), updated_at: ago(24 * 20),
    });
  }

  const booking = (id: string, customer: string, category: string, status: string, extra: Row = {}) => ({
    id, reference: `BK-${db._seq.booking++}`, customer_id: customer, address_id: `addr-${customer}`, category_code: category,
    engagement_type: 'part_time', start_date: localDate(3), days_of_week: [1, 2, 3, 4, 5, 6], time_start: '09:00:00', time_end: '11:00:00',
    hours_per_day: 2, household_size: 4, rooms: 3, language_prefs: [], special_instructions: null, trial_requested: false,
    status, agreed_price: null, assigned_staff_id: null, status_reason: null, payment_status: 'unpaid', payment_method: null,
    payment_reference: null, paid_amount: null, paid_at: null, created_at: ago(72), updated_at: ago(2), ...extra,
  });
  const ev = (booking_id: string, from: string | null, to: string, role: string, hoursAgo: number, reason: string | null = null, kind = 'status') => ({
    id: db._seq.event++, booking_id, from_status: from, to_status: to, actor_id: null, actor_role: role, reason, kind, created_at: ago(hoursAgo),
  });

  // Riya: active, paid, Sunita assigned.
  const b1 = booking('bk-riya', 'demo-riya', 'home_care', 'active', {
    agreed_price: 8500, assigned_staff_id: 'staff-ST-0184', payment_status: 'paid', payment_method: 'upi', payment_reference: 'UTR 4471 2093', paid_amount: 8500, paid_at: ago(30),
    special_instructions: 'Please use the eco-friendly floor cleaner kept under the sink.',
  });
  db.bookings.push(b1);
  db.staff[0].status = 'assigned';
  db.quotations.push({ id: 'q-riya', booking_id: b1.id, scope: db.scope_templates[0].body, monthly_price: 8500, agency_fee: 0, deposit: 0, tax: 0, terms: 'Free replacement within 7 days. One month notice for cancellation.', valid_until: localDate(5), status: 'accepted', customer_note: null, created_by: DEMO_AGENCY_ID, created_at: ago(66), responded_at: ago(60) });
  db.assignments.push({ id: 'as-riya', booking_id: b1.id, staff_id: 'staff-ST-0184', status: 'approved', agency_note: 'Lives close by and has 8 years of experience.', customer_note: null, proposed_by: DEMO_AGENCY_ID, proposed_at: ago(50), decided_at: ago(48) });
  db.booking_events.push(
    ev(b1.id, null, 'enquiry_submitted', 'customer', 72),
    ev(b1.id, 'enquiry_submitted', 'under_review', 'admin', 70),
    ev(b1.id, 'under_review', 'quotation_sent', 'admin', 66, 'Your quotation is ready: ₹8,500 per month.'),
    ev(b1.id, 'quotation_sent', 'staff_matching', 'customer', 60, 'Quotation accepted'),
    ev(b1.id, 'staff_matching', 'staff_proposed', 'admin', 50, 'Sunita Sharma has been proposed for your booking.'),
    ev(b1.id, 'staff_proposed', 'confirmed', 'customer', 48, 'Staff approved'),
    ev(b1.id, 'confirmed', 'confirmed', 'customer', 32, 'Payment submitted · ref UTR 4471 2093', 'payment'),
    ev(b1.id, 'confirmed', 'confirmed', 'admin', 30, 'Payment received · ₹8,500', 'payment'),
    ev(b1.id, 'confirmed', 'active', 'admin', 24),
  );

  // Arjun: quotation waiting for the customer.
  const b2 = booking('bk-arjun', 'demo-arjun', 'cooking', 'quotation_sent', { time_start: '07:00:00', time_end: '09:00:00', language_prefs: ['Hindi', 'Kannada'], created_at: ago(20) });
  db.bookings.push(b2);
  db.quotations.push({ id: 'q-arjun', booking_id: b2.id, scope: db.scope_templates[1].body, monthly_price: 6200, agency_fee: 0, deposit: 0, tax: 0, terms: 'Free replacement within 7 days.', valid_until: localDate(6), status: 'sent', customer_note: null, created_by: DEMO_AGENCY_ID, created_at: ago(10), responded_at: null });
  db.booking_events.push(
    ev(b2.id, null, 'enquiry_submitted', 'customer', 20),
    ev(b2.id, 'enquiry_submitted', 'under_review', 'admin', 12),
    ev(b2.id, 'under_review', 'quotation_sent', 'admin', 10, 'Your quotation is ready: ₹6,200 per month.'),
  );

  // Neha: brand-new enquiry for the agency to handle.
  const b3 = booking('bk-neha', 'demo-neha', 'child_care', 'enquiry_submitted', { trial_requested: true, special_instructions: 'Toddler, 2 years old. Need someone patient and gentle.', created_at: ago(1) });
  db.bookings.push(b3);
  db.booking_events.push(ev(b3.id, null, 'enquiry_submitted', 'customer', 1));

  // A support request in progress.
  db.support_tickets.push({
    id: 'tk-riya', reference: `SR-${db._seq.ticket++}`, customer_id: 'demo-riya', booking_id: b1.id, category: 'punctuality',
    subject: 'Staff arrived 40 minutes late', priority: 'high', is_priority_customer: true, status: 'in_progress',
    last_message_at: ago(3), resolved_at: null, created_at: ago(6), updated_at: ago(3),
  });
  db.ticket_messages.push(
    { id: db._seq.message++, ticket_id: 'tk-riya', author_id: 'demo-riya', author_role: 'customer', body: 'Sunita came 40 minutes late today without informing us.', created_at: ago(6) },
    { id: db._seq.message++, ticket_id: 'tk-riya', author_id: DEMO_AGENCY_ID, author_role: 'admin', body: 'Sorry about that! There was a bus strike this morning. We will make sure she informs you next time.', created_at: ago(3) },
  );

  // Inbox for the agency demo user.
  const note = (title: string, body: string, booking_id: string | null, hoursAgo: number, ticket_id: string | null = null) => ({
    id: uid(), user_id: DEMO_AGENCY_ID, booking_id, ticket_id, title, body, read_at: null, created_at: ago(hoursAgo),
  });
  db.notifications.push(
    note(`New enquiry ${b3.reference}`, 'A customer submitted a new service request.', b3.id, 1),
    note('⭐ Priority support request SR-1001', 'Staff arrived 40 minutes late', b1.id, 6, 'tk-riya'),
  );

  // Offers managed by the agency (web portal in the real app).
  const inDays = (d: number) => new Date(Date.now() + d * 24 * 3600_000).toISOString();
  db.offers.push(
    {
      id: 'offer-welcome', title: 'Welcome offer: 20% off your first month',
      body: 'New to ManeMaid? Book any home-care service and get 20% off the first month of service.',
      terms: 'For new customers only. Applied in your quotation. One offer per customer.',
      image_path: null, category_code: null, audience: 'new_customers', starts_at: ago(24), ends_at: inDays(30),
      active: true, sort_order: 1, created_by: DEMO_AGENCY_ID, created_at: ago(24), updated_at: ago(24),
    },
    {
      id: 'offer-festive', title: 'Festive deep cleaning',
      body: 'Get your home festival-ready: a full deep clean with a free kitchen degreasing add-on.',
      terms: 'Valid for housekeeping bookings starting before the offer ends.',
      image_path: null, category_code: 'housekeeping', audience: 'all', starts_at: ago(24), ends_at: inDays(14),
      active: true, sort_order: 2, created_by: DEMO_AGENCY_ID, created_at: ago(24), updated_at: ago(24),
    },
  );

  // A celebration greeting running today (India date), shown once to every customer.
  const indiaToday = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  db.greetings.push({
    id: 'greeting-welcome', title: 'Welcome to ManeMaid!', message: 'Thank you for trying ManeMaid. Wishing you a happy, stress-free home.',
    image_path: null, audience: 'all', starts_on: indiaToday, ends_on: indiaToday, push_to_inbox: true, active: true,
    created_by: DEMO_AGENCY_ID, created_at: ago(2), updated_at: ago(2),
  });

  // Live configuration (edited in the web portal's developer console in the real app).
  const cfg = (key: string, value: unknown, is_public = false) => ({ key, value, description: null, is_public, updated_by: null, updated_at: ago(24) });
  db.app_config.push(
    cfg('features.offers_enabled', true),
    cfg('features.upi_payments', true),
    cfg('features.support_tickets', true),
    cfg('app.min_version', '1.0.0', true),
    cfg('app.maintenance', { enabled: false, message: 'ManeMaid is being upgraded. Please try again in a little while.' }, true),
  );
  return db;
}
