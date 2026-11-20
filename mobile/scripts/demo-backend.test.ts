// Run: npx tsx scripts/demo-backend.test.ts  (tests the offline demo backend, no device needed)
// Exercises the offline demo backend end to end under Node (no device needed).
import { createDemoClient } from '../src/lib/demo/client';

const mem = new Map<string, string>();
const kv = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
let fails = 0;
const check = (label: string, cond: boolean, extra = '') => {
  console.log(cond ? 'PASS' : 'FAIL', label, extra);
  if (!cond) fails++;
};
const ok = (label: string, r: any) => {
  if (r.error) {
    fails++;
    console.log('FAIL', label, r.error.message);
    throw new Error(label);
  }
  console.log('PASS', label);
  return r.data;
};
const tick = () => new Promise((r) => setTimeout(r, 5));

async function main() {
  const c = createDemoClient(kv) as any;
  let events = 0;
  c.auth.onAuthStateChange(() => events++);
  let live = 0;
  c.channel('x').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => live++).subscribe();

  check('wrong code rejected', !!(await c.auth.verifyOtp({ phone: '+919999900001', token: '000000', type: 'sms' })).error);
  ok('customer login', await c.auth.verifyOtp({ phone: '+919999900001', token: '123456', type: 'sms' }));
  await tick();
  check('auth listener fired (deferred)', events === 1);
  const me = ok('own profile', await c.from('profiles').select('*').single());
  check('customer role', me.role === 'customer' && me.id === 'demo-customer');

  check('customer cannot see others bookings', (ok('bookings', await c.from('bookings').select('*'))).length === 0);
  check('customer cannot read staff', (ok('staff', await c.from('staff').select('*'))).length === 0);
  check('role change blocked', !!(await c.from('profiles').update({ role: 'admin' }).eq('id', me.id).select().single()).error);
  check('incomplete address rejected', (await c.from('customer_addresses').insert({ customer_id: me.id, line1: 'x', pincode: '560038', city: 'B' })).error?.code === '23514');
  // address default update must only touch own rows
  await c.from('customer_addresses').update({ is_default: false }).eq('is_default', true);
  const addr = ok('add address', await c.from('customer_addresses').insert({ customer_id: me.id, label: 'Home', line1: '1 Road', flat_no: '1', building: 'B', landmark: 'L', pincode: '560038', city: 'Bengaluru', is_default: true }).select().single());
  const count = await c.from('customer_addresses').select('id', { count: 'exact', head: true });
  check('head count only own rows', count.count === 1, `count=${count.count}`);

  const today = new Date();
  today.setDate(today.getDate() + 3);
  const p = (x: number) => String(x).padStart(2, '0');
  const start = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
  const bk = ok('submit enquiry', await c.rpc('submit_enquiry', { p_address_id: addr.id, p_category_code: 'home_care', p_engagement_type: 'part_time', p_start_date: start, p_days_of_week: [1, 3], p_time_start: '13:00', p_time_end: '14:00', p_language_prefs: ['Tamil', ' Hindi ', 'Any', 'Tamil'] }));
  check('languages cleaned', JSON.stringify(bk.language_prefs) === '["Tamil","Hindi"]', JSON.stringify(bk.language_prefs));
  await tick();
  check('realtime fired on bookings', live > 0);
  const home = ok('home query (not in, join)', await c.from('bookings').select('*, customer_addresses(*), service_categories(name)').not('status', 'in', '(completed,cancelled_by_customer)').order('created_at', { ascending: false }));
  check('join resolved', home[0].service_categories?.name === 'Home care' && home[0].customer_addresses?.pincode === '560038');
  check('customer blocked from agency rpc', (await c.rpc('send_quotation', { p_booking_id: bk.id, p_scope: 'x', p_monthly_price: 1, p_valid_until: start })).error?.code === '42501');

  // ---- agency
  ok('switch to agency', await c.auth.verifyOtp({ phone: '+919999900099', token: '123456', type: 'sms' }));
  const all = ok('agency queue', await c.from('bookings').select('*, customer_addresses(*), service_categories(name), profiles(full_name, phone, avatar_path)').order('updated_at', { ascending: false }).limit(200));
  check('agency sees all bookings incl. samples', all.length === 4, `n=${all.length}`);
  const unread = await c.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  check('agency has unread notifications', (unread.count ?? 0) >= 3, `unread=${unread.count}`);
  ok('send quotation', await c.rpc('send_quotation', { p_booking_id: bk.id, p_scope: 'Cleaning', p_monthly_price: 4000, p_valid_until: start, p_tax: 500 }));
  const st = ok('add staff', await c.from('staff').insert({ full_name: 'Test Staff', phone: '9845000001', categories: ['home_care'], languages: ['Hindi'], verification_status: 'verified', zone_pincode: '560038' }).select().single());
  check('staff code + phone normalised + verified_at', /^ST-0\d{3}$/.test(st.code) && st.phone === '919845000001' && !!st.verified_at, `${st.code} ${st.phone}`);

  // ---- customer accepts, agency proposes, customer approves
  ok('back to customer', await c.auth.verifyOtp({ phone: '+919999900001', token: '123456', type: 'sms' }));
  const [q] = ok('quote', await c.from('quotations').select('*').eq('booking_id', bk.id).order('created_at', { ascending: false }).limit(1));
  ok('accept quote', await c.rpc('respond_quotation', { p_quotation_id: q.id, p_accept: true }));
  ok('agency', await c.auth.verifyOtp({ phone: '+919999900099', token: '123456', type: 'sms' }));
  const cands = ok('candidates', await c.rpc('staff_candidates', { p_booking_id: bk.id }));
  check('language match = speaks any preferred language', cands.every((x: any) => x.language_match === x.languages.some((l: string) => ['Tamil', 'Hindi'].includes(l))));
  check('sunita flagged? (no clash: different times)', cands.some((x: any) => x.code === 'ST-0184'));
  check('unverified blocked', !!(await c.rpc('propose_staff', { p_booking_id: bk.id, p_staff_id: 'staff-ST-0241' })).error);
  ok('propose', await c.rpc('propose_staff', { p_booking_id: bk.id, p_staff_id: st.id, p_note: 'Great fit' }));
  ok('customer', await c.auth.verifyOtp({ phone: '+919999900001', token: '123456', type: 'sms' }));
  const staff = ok('booking staff', await c.rpc('get_booking_staff', { p_booking_id: bk.id }));
  check('staff phone hidden', !('phone' in staff[0]));
  ok('approve', await c.rpc('respond_staff_proposal', { p_assignment_id: staff[0].assignment_id, p_approve: true }));
  let sup = ok('support (locked)', await c.rpc('get_agency_support'));
  check('locked before payment, UPI shown', !sup.unlocked && !sup.support_phone && !!sup.upi_id);
  ok('submit payment', await c.rpc('submit_payment', { p_booking_id: bk.id, p_method: 'upi', p_reference: 'UTR1' }));
  check('customer cannot confirm', (await c.rpc('confirm_payment', { p_booking_id: bk.id })).error?.code === '42501');
  ok('agency', await c.auth.verifyOtp({ phone: '+919999900099', token: '123456', type: 'sms' }));
  ok('confirm payment', await c.rpc('confirm_payment', { p_booking_id: bk.id }));
  ok('customer', await c.auth.verifyOtp({ phone: '+919999900001', token: '123456', type: 'sms' }));
  sup = ok('support (unlocked)', await c.rpc('get_agency_support'));
  check('unlocked after payment', sup.unlocked && !!sup.support_phone);
  const evs = ok('timeline', await c.from('booking_events').select('*').eq('booking_id', bk.id).order('created_at', { ascending: true }));
  check('timeline has status + payment events', evs.filter((e: any) => e.kind === 'payment').length === 2 && evs.length >= 8, `n=${evs.length}`);

  // ---- support
  const t = ok('raise ticket', await c.rpc('create_support_ticket', { p_category: 'quality', p_subject: 'Kitchen skipped', p_message: 'Please check', p_booking_id: bk.id }));
  check('paying customer gets priority', t.priority === 'high' && t.is_priority_customer);
  ok('agency', await c.auth.verifyOtp({ phone: '+919999900099', token: '123456', type: 'sms' }));
  ok('agency reply', await c.rpc('reply_to_ticket', { p_ticket_id: t.id, p_message: 'On it' }));
  ok('resolve', await c.rpc('set_ticket_status', { p_ticket_id: t.id, p_status: 'resolved', p_note: 'Done' }));
  const tk = ok('ticket with joins', await c.from('support_tickets').select('*, profiles(full_name, phone, avatar_path), bookings(reference)').eq('id', t.id).single());
  check('ticket joins', tk.bookings?.reference === bk.reference && tk.status === 'resolved');
  const staffRows = ok('staff profile assignments', await c.from('assignments').select('status, bookings(id, reference, status, category_code, service_categories(name))').eq('staff_id', st.id));
  check('nested join', staffRows[0]?.bookings?.service_categories?.name === 'Home care');

  // ---- isolation: a second customer sees nothing of the first
  ok('customer B', await c.auth.verifyOtp({ phone: '+919812345678', token: '123456', type: 'sms' }));
  check('B sees no bookings', (ok('b', await c.from('bookings').select('*'))).length === 0);
  check('B sees no tickets', (ok('t', await c.from('support_tickets').select('*'))).length === 0);
  check('B sees no addresses', (ok('a', await c.from('customer_addresses').select('*'))).length === 0);
  check('B support locked', !(ok('s', await c.rpc('get_agency_support'))).unlocked);
  const single = await c.from('bookings').select('*').eq('id', bk.id).single();
  check('single() on hidden row returns error not throw', single.data === null && !!single.error);

  // ---- persistence + reset
  const c2 = createDemoClient(kv) as any;
  check('data persists across restart', (ok('reload', await c2.auth.getSession())).session?.user?.phone === '919812345678');
  c2.resetDemo();
  await tick();
  ok('agency after reset', await c2.auth.verifyOtp({ phone: '+919999900099', token: '123456', type: 'sms' }));
  check('reset restores samples', (ok('q', await c2.from('bookings').select('id'))).length === 3);

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
}
main().catch((e) => {
  console.error('CRASH', e);
  process.exit(1);
});
