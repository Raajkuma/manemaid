// A tiny stand-in for the Supabase client, backed by the on-device demo store.
// Implements only what the app uses, with the same per-user visibility rules as
// the real database (RLS), so the demo behaves like the real thing.
import { runRpc } from './rpc';
import {
  AGENCY_PHONES,
  DemoError,
  DB_KEY,
  SESSION_KEY,
  loadDB,
  nowISO,
  seed,
  uid,
  type DB,
  type KV,
  type Row,
  type Table,
} from './store';

export { DemoError } from './store';

type Session = { access_token: string; user: { id: string; phone: string } };
type AuthCb = (event: string, session: Session | null) => void;

export type Ctx = {
  db: DB;
  uid: () => string | null;
  isAgency: () => boolean;
  role: () => string | null;
  /** Persist and notify live listeners for the given tables. */
  commit: (...tables: Table[]) => void;
  notify: (userIds: string[], n: { title: string; body: string; booking_id?: string | null; ticket_id?: string | null }) => void;
};

// Embedded relations used by the app's select strings.
const RELATIONS: Partial<Record<Table, Record<string, { table: Table; fk: string; key?: string }>>> = {
  bookings: {
    customer_addresses: { table: 'customer_addresses', fk: 'address_id' },
    service_categories: { table: 'service_categories', fk: 'category_code', key: 'code' },
    profiles: { table: 'profiles', fk: 'customer_id' },
  },
  assignments: { bookings: { table: 'bookings', fk: 'booking_id' } },
  support_tickets: {
    profiles: { table: 'profiles', fk: 'customer_id' },
    bookings: { table: 'bookings', fk: 'booking_id' },
  },
};

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '') || null;
export function inPhone(s: string | null | undefined): string | null {
  const d = digits(s);
  if (!d) return null;
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
  return d;
}

/** Split "a, b(c, d(e)), f" at top-level commas. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function compare(a: any, b: any): number {
  if (a === b) return 0;
  if (a == null) return 1; // nulls last
  if (b == null) return -1;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : 1;
}

export function createDemoClient(kv: KV) {
  let db: DB = loadDB(kv);
  let session: Session | null = (() => {
    try {
      return JSON.parse(kv.getItem(SESSION_KEY) ?? 'null');
    } catch {
      return null;
    }
  })();
  const authListeners = new Set<AuthCb>();
  const channels = new Set<{ tables: Set<string>; fire: () => void }>();

  const later = (fn: () => void) => setTimeout(fn, 0);
  const save = () => kv.setItem(DB_KEY, JSON.stringify(db));
  const profileOf = (id: string | null) => (id ? db.profiles.find((p) => p.id === id) : undefined);

  const ctx: Ctx = {
    get db() {
      return db;
    },
    uid: () => session?.user.id ?? null,
    role: () => profileOf(session?.user.id ?? null)?.role ?? null,
    isAgency: () => ['admin', 'coordinator'].includes(profileOf(session?.user.id ?? null)?.role),
    commit: (...tables) => {
      save();
      const changed = new Set<string>(tables);
      later(() => channels.forEach((c) => [...c.tables].some((t) => changed.has(t)) && c.fire()));
    },
    notify: (userIds, n) => {
      for (const user_id of userIds) {
        db.notifications.push({ id: uid(), user_id, booking_id: n.booking_id ?? null, ticket_id: n.ticket_id ?? null, title: n.title, body: n.body, read_at: null, created_at: nowISO() });
      }
    },
  };

  // ------------------------------------------------------------------ visibility (RLS)
  const ownsBooking = (id: string) => db.bookings.some((b) => b.id === id && b.customer_id === ctx.uid());
  const ownsTicket = (id: string) => db.support_tickets.some((t) => t.id === id && t.customer_id === ctx.uid());
  function visible(table: Table, r: Row): boolean {
    const me = ctx.uid();
    if (!me) return false;
    const agency = ctx.isAgency();
    switch (table) {
      case 'profiles':
        return agency || r.id === me;
      case 'service_categories':
      case 'service_zones':
        return true;
      case 'customer_addresses':
      case 'bookings':
      case 'support_tickets':
        return agency || r.customer_id === me;
      case 'staff':
      case 'scope_templates':
      case 'agency_settings':
        return agency;
      case 'quotations':
      case 'assignments':
      case 'booking_events':
        return agency || ownsBooking(r.booking_id);
      case 'notifications':
        return r.user_id === me;
      case 'ticket_messages':
        return agency || ownsTicket(r.ticket_id);
    }
  }

  // ------------------------------------------------------------------ write rules
  const denied = () => new DemoError('permission denied', '42501');
  function checkWrite(table: Table, op: 'insert' | 'update' | 'delete', r: Row, patch?: Row) {
    const me = ctx.uid();
    if (!me) throw denied();
    const agency = ctx.isAgency();
    switch (table) {
      case 'profiles':
        if (op !== 'update' || r.id !== me) throw denied();
        if (Object.keys(patch ?? {}).some((k) => !['full_name', 'email', 'preferred_language', 'avatar_path'].includes(k))) throw denied();
        return;
      case 'customer_addresses':
        if (r.customer_id !== me) throw new DemoError('new row violates row-level security policy', '42501');
        return;
      case 'staff':
      case 'scope_templates':
      case 'service_categories':
      case 'service_zones':
        if (!agency) throw new DemoError('new row violates row-level security policy', '42501');
        return;
      case 'agency_settings':
        if (!agency || op !== 'update') throw denied();
        return;
      default:
        throw denied();
    }
  }

  function beforeWrite(table: Table, r: Row, op: 'insert' | 'update', old?: Row) {
    const now = nowISO();
    if (op === 'insert') r.created_at ??= now;
    if ('updated_at' in r || op === 'insert') r.updated_at = now;
    if (table === 'customer_addresses') {
      for (const k of ['flat_no', 'building', 'landmark', 'line1', 'city']) {
        if (!String(r[k] ?? '').trim()) {
          throw new DemoError('new row for relation "customer_addresses" violates check constraint "customer_addresses_required_fields"', '23514');
        }
      }
      if (!/^\d{6}$/.test(String(r.pincode ?? ''))) throw new DemoError('Enter a 6-digit PIN code', '23514');
      if (r.is_default && db.customer_addresses.some((a) => a.customer_id === r.customer_id && a.is_default && a.id !== r.id)) {
        throw new DemoError('duplicate key value violates unique constraint "customer_addresses_one_default"', '23505');
      }
    }
    if (table === 'staff') {
      if (op === 'insert') {
        r.code ??= `ST-${String(db._seq.staff++).padStart(4, '0')}`;
        r.categories ??= [];
        r.skills ??= [];
        r.languages ??= [];
        r.experience_years ??= 0;
        r.preferred_contact ??= 'call';
        r.verification_status ??= 'pending';
        r.status ??= 'available';
        r.rating ??= null;
      }
      for (const k of ['phone', 'alternate_phone', 'whatsapp_phone', 'emergency_contact_phone']) r[k] = inPhone(r[k]);
      if (r.verification_status === 'verified') {
        r.verified_at = old?.verification_status === 'verified' && old.verified_at ? old.verified_at : (r.verified_at ?? now);
      } else r.verified_at = null;
    }
  }

  // ------------------------------------------------------------------ projection with embeds
  function project(table: Table, row: Row, cols: string): Row {
    const out: Row = {};
    for (const part of splitTop(cols)) {
      if (part === '*') Object.assign(out, row);
      else {
        const m = part.match(/^(\w+)\((.*)\)$/s);
        if (m) {
          const [, name, sub] = m;
          const rel = RELATIONS[table]?.[name];
          if (!rel) throw new DemoError(`Unknown relation ${table}.${name}`);
          const target = db[rel.table].find((x) => x[rel.key ?? 'id'] === row[rel.fk]);
          out[name] = target && visible(rel.table, target) ? project(rel.table, target, sub) : null;
        } else out[part] = row[part] ?? null;
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ query builder
  class Query implements PromiseLike<any> {
    private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private cols = '*';
    private returning = false;
    private countMode = false;
    private head = false;
    private filters: ((r: Row) => boolean)[] = [];
    private orders: { col: string; asc: boolean }[] = [];
    private lim: number | null = null;
    private one = false;
    private payload: any;
    constructor(private table: Table) {}

    select(cols = '*', opts?: { count?: string; head?: boolean }) {
      if (this.op === 'select') {
        this.cols = cols;
        this.countMode = !!opts?.count;
        this.head = !!opts?.head;
      } else {
        this.returning = true;
        this.cols = cols;
      }
      return this;
    }
    insert(rows: Row | Row[]) {
      this.op = 'insert';
      this.payload = rows;
      return this;
    }
    update(patch: Row) {
      this.op = 'update';
      this.payload = patch;
      return this;
    }
    delete() {
      this.op = 'delete';
      return this;
    }
    eq(c: string, v: any) {
      this.filters.push((r) => r[c] === v);
      return this;
    }
    neq(c: string, v: any) {
      this.filters.push((r) => r[c] !== v);
      return this;
    }
    is(c: string, v: any) {
      this.filters.push((r) => (v === null ? r[c] == null : r[c] === v));
      return this;
    }
    in(c: string, vals: any[]) {
      this.filters.push((r) => vals.includes(r[c]));
      return this;
    }
    not(c: string, op: string, v: string) {
      if (op !== 'in') throw new DemoError(`Unsupported filter not.${op}`);
      const vals = v.replace(/^\(|\)$/g, '').split(',').map((x) => x.trim());
      this.filters.push((r) => !vals.includes(String(r[c])));
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      this.orders.push({ col, asc: opts?.ascending ?? true });
      return this;
    }
    limit(n: number) {
      this.lim = n;
      return this;
    }
    single() {
      this.one = true;
      return this;
    }
    maybeSingle() {
      this.one = true;
      return this;
    }

    then<A = any, B = never>(ok?: ((v: any) => A | PromiseLike<A>) | null, fail?: ((e: any) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
      return Promise.resolve()
        .then(() => {
          try {
            return this.exec();
          } catch (e) {
            const err = e instanceof DemoError ? e : new DemoError(String((e as Error)?.message ?? e));
            return { data: null, error: { message: err.message, code: err.code }, count: null };
          }
        })
        .then(ok, fail);
    }

    private matching(): Row[] {
      return db[this.table].filter((r) => visible(this.table, r) && this.filters.every((f) => f(r)));
    }

    private finish(rows: Row[]) {
      let out = rows;
      if (this.orders.length) {
        out = [...out].sort((a, b) => {
          for (const o of this.orders) {
            const c = compare(a[o.col], b[o.col]);
            if (c) return o.asc ? c : -c;
          }
          return 0;
        });
      }
      if (this.lim != null) out = out.slice(0, this.lim);
      const data = out.map((r) => project(this.table, r, this.cols));
      if (this.one) {
        if (data.length !== 1) {
          return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, count: null };
        }
        return { data: data[0], error: null, count: null };
      }
      return { data, error: null, count: null };
    }

    private exec() {
      const t = this.table;
      if (this.op === 'select') {
        const rows = this.matching();
        if (this.head) return { data: null, error: null, count: rows.length };
        const res = this.finish(rows);
        return this.countMode ? { ...res, count: rows.length } : res;
      }
      if (this.op === 'insert') {
        const list: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => ({ ...r }));
        for (const r of list) {
          if (t !== 'staff' && t !== 'agency_settings') r.id ??= uid();
          if (t === 'staff') r.id ??= uid();
          checkWrite(t, 'insert', r);
          beforeWrite(t, r, 'insert');
        }
        db[t].push(...list);
        ctx.commit(t);
        return this.returning ? this.finish(list) : { data: null, error: null, count: null };
      }
      if (this.op === 'update') {
        const rows = this.matching();
        for (const r of rows) {
          checkWrite(t, 'update', r, this.payload);
          const old = { ...r };
          const next = { ...r, ...this.payload };
          beforeWrite(t, next, 'update', old);
          Object.assign(r, next);
        }
        ctx.commit(t);
        return this.returning ? this.finish(rows) : { data: null, error: null, count: null };
      }
      // delete
      const rows = this.matching();
      for (const r of rows) {
        checkWrite(t, 'delete', r);
        if (t === 'customer_addresses' && db.bookings.some((b) => b.address_id === r.id)) {
          throw new DemoError('update or delete on table "customer_addresses" violates foreign key constraint', '23503');
        }
      }
      db[t] = db[t].filter((r) => !rows.includes(r)) as any;
      ctx.commit(t);
      return { data: null, error: null, count: null };
    }
  }

  // ------------------------------------------------------------------ auth
  function setSession(next: Session | null, event: string) {
    session = next;
    if (next) kv.setItem(SESSION_KEY, JSON.stringify(next));
    else kv.removeItem(SESSION_KEY);
    later(() => authListeners.forEach((cb) => cb(event, session)));
  }

  const auth = {
    async getSession() {
      return { data: { session }, error: null };
    },
    onAuthStateChange(cb: AuthCb) {
      authListeners.add(cb);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    },
    async signInWithOtp({ phone }: { phone: string }) {
      if ((digits(phone) ?? '').length < 12) return { data: null, error: { message: 'Enter a valid mobile number' } };
      return { data: {}, error: null };
    },
    async verifyOtp({ phone, token }: { phone: string; token: string }) {
      if (token !== '123456') return { data: null, error: { message: 'Demo mode: the code is 123456' } };
      const p = digits(phone)!;
      let profile = db.profiles.find((x) => x.phone === p);
      if (!profile) {
        const agency = AGENCY_PHONES[p];
        profile = {
          id: agency?.id ?? (p === '919999900001' ? 'demo-customer' : uid()),
          role: agency?.role ?? 'customer',
          full_name: agency?.name ?? null,
          phone: p,
          email: null,
          preferred_language: 'en',
          avatar_path: null,
          created_at: nowISO(),
          updated_at: nowISO(),
        };
        db.profiles.push(profile);
        save();
      }
      const s: Session = { access_token: 'demo', user: { id: profile.id, phone: p } };
      setSession(s, 'SIGNED_IN');
      return { data: { session: s, user: s.user }, error: null };
    },
    async signOut() {
      setSession(null, 'SIGNED_OUT');
      return { error: null };
    },
    startAutoRefresh() {},
    stopAutoRefresh() {},
  };

  // ------------------------------------------------------------------ public client
  return {
    auth,
    from: (table: string) => {
      if (!(table in db)) throw new Error(`Demo: unknown table ${table}`);
      return new Query(table as Table);
    },
    async rpc(name: string, args: Record<string, any> = {}) {
      try {
        if (!ctx.uid()) throw new DemoError('Not authenticated', '28000');
        const data = runRpc(ctx, name, args);
        return { data, error: null };
      } catch (e) {
        const err = e instanceof DemoError ? e : new DemoError(String((e as Error)?.message ?? e));
        return { data: null, error: { message: err.message, code: err.code } };
      }
    },
    channel(_name: string) {
      const tables = new Set<string>();
      let fire = () => {};
      const ch = {
        on(_type: string, filter: { table: string }, cb: () => void) {
          tables.add(filter.table);
          fire = cb;
          return ch;
        },
        subscribe(cb?: (status: string) => void) {
          channels.add(entry);
          if (cb) later(() => cb('SUBSCRIBED'));
          return ch;
        },
      };
      const entry = { tables, fire: () => fire() };
      (ch as any)._entry = entry;
      return ch;
    },
    async removeChannel(ch: any) {
      channels.delete(ch?._entry);
      return 'ok';
    },
    storage: {
      from: (_bucket: string) => ({
        async upload(path: string) {
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: path } };
        },
        async remove() {
          return { data: [], error: null };
        },
      }),
    },
    /** Wipe everything back to the sample data and sign out. */
    resetDemo() {
      db = seed();
      save();
      setSession(null, 'SIGNED_OUT');
    },
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;
