import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, PageHeader, Select, type Tone } from '@/components/ui';
import { formatDateTime, ROLE_LABEL, timeAgo } from '@/lib/format';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Row = Tables<'audit_log'>;
const PAGE = 50;

export const TABLE_LABEL: Record<string, string> = {
  bookings: 'Booking',
  quotations: 'Quotation',
  assignments: 'Staff assignment',
  staff: 'Staff member',
  offers: 'Offer',
  scope_templates: 'Scope template',
  agency_settings: 'Agency settings',
  admin_phones: 'Staff access',
  app_config: 'Configuration',
  service_categories: 'Service',
  service_zones: 'Service area',
  support_tickets: 'Support request',
  profiles: 'User profile',
  legal_documents: 'Terms / privacy',
};
const ACTION: Record<string, { label: string; tone: Tone }> = {
  insert: { label: 'Created', tone: 'ok' },
  update: { label: 'Changed', tone: 'info' },
  delete: { label: 'Deleted', tone: 'bad' },
};

function show(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function Changes({ row }: { row: Row }) {
  const c = (row.changes ?? {}) as Record<string, unknown>;
  const keys = Object.keys(c);
  if (!keys.length) return <p className="text-sm text-muted">No field details.</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[180px_minmax(0,1fr)]">
      {keys.map((k) => {
        const v = c[k] as { from?: unknown; to?: unknown } | unknown;
        const isDiff = row.action === 'update' && v && typeof v === 'object' && 'to' in (v as object);
        return (
          <Fragment key={k}>
            <dt className="font-mono text-xs text-muted sm:pt-0.5">{k}</dt>
            <dd className="min-w-0 font-mono text-xs break-all">
              {isDiff ? (
                <>
                  <span className="rounded bg-bad-soft px-1 text-bad line-through decoration-bad/40">{show((v as { from: unknown }).from)}</span>
                  <span className="mx-1.5 text-muted">→</span>
                  <span className="rounded bg-ok-soft px-1 text-ok">{show((v as { to: unknown }).to)}</span>
                </>
              ) : (
                show(v)
              )}
            </dd>
          </Fragment>
        );
      })}
    </dl>
  );
}

export function ActivityLog() {
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');
  const [day, setDay] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ['audit', table, action, day, page],
    queryFn: async () => {
      let query = supabase.from('audit_log').select('*', { count: 'exact' }).order('at', { ascending: false });
      if (table) query = query.eq('table_name', table);
      if (action) query = query.eq('action', action);
      if (day) {
        const start = new Date(`${day}T00:00:00`);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        query = query.gte('at', start.toISOString()).lt('at', end.toISOString());
      }
      const res = await query.range(page * PAGE, page * PAGE + PAGE - 1);
      const rows = unwrap(res) as Row[];
      const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
      const people = ids.length ? unwrap(await supabase.from('profiles').select('id, full_name, phone').in('id', ids)) : [];
      return { rows, total: res.count ?? 0, people: Object.fromEntries(people.map((p) => [p.id, p])) };
    },
  });

  const reset = () => setPage(0);

  return (
    <>
      <PageHeader title="Activity log" subtitle="Every change to bookings, offers, staff and settings — who did it and when. Read-only." />

      <Card className="mb-5 grid gap-4 p-4 sm:grid-cols-3">
        <Field label="What" htmlFor="f-table">
          <Select id="f-table" value={table} onChange={(e) => { setTable(e.target.value); reset(); }}>
            <option value="">Everything</option>
            {Object.entries(TABLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Action" htmlFor="f-action">
          <Select id="f-action" value={action} onChange={(e) => { setAction(e.target.value); reset(); }}>
            <option value="">Any action</option>
            <option value="insert">Created</option>
            <option value="update">Changed</option>
            <option value="delete">Deleted</option>
          </Select>
        </Field>
        <Field label="Day" htmlFor="f-day">
          <Input id="f-day" type="date" value={day} onChange={(e) => { setDay(e.target.value); reset(); }} />
        </Field>
      </Card>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.rows.length ? (
        <Card><EmptyState icon="activity" title="No activity found" body="Try a different filter." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {q.data.rows.map((r) => {
              const who = r.actor_id ? q.data.people[r.actor_id] : null;
              const a = ACTION[r.action] ?? { label: r.action, tone: 'neutral' as Tone };
              const expanded = open === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : r.id)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-surface-2"
                  >
                    <span className="w-28 shrink-0 text-xs text-muted" title={formatDateTime(r.at)}>{timeAgo(r.at)}</span>
                    <Badge tone={a.tone}>{a.label}</Badge>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-semibold">{TABLE_LABEL[r.table_name] ?? r.table_name}</span>
                      {r.row_id ? <span className="ml-2 font-mono text-xs text-muted">{r.row_id.length > 14 ? `${r.row_id.slice(0, 8)}…` : r.row_id}</span> : null}
                    </span>
                    <span className="text-sm text-ink-soft">
                      {who?.full_name || (r.actor_id ? 'User' : 'System')}
                      {r.actor_role ? <span className="ml-1.5 text-xs text-muted">· {ROLE_LABEL[r.actor_role] ?? r.actor_role}</span> : null}
                    </span>
                    <Icon name="chevron" size={16} className={expanded ? 'rotate-90 text-muted transition' : 'text-muted transition'} />
                  </button>
                  {expanded ? (
                    <div className="border-t border-line bg-surface-2 px-5 py-4">
                      <p className="mb-3 text-xs text-muted">{formatDateTime(r.at)} · row {r.row_id ?? '—'}</p>
                      <Changes row={r} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
            <span className="text-muted">
              {page * PAGE + 1}–{page * PAGE + q.data.rows.length} of {q.data.total}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</Button>
              <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= q.data.total} onClick={() => setPage((p) => p + 1)}>Older</Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
