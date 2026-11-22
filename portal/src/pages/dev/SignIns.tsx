import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader, type Tone } from '@/components/ui';
import { formatDateTime, ROLE_LABEL, timeAgo } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { supabase, unwrap } from '@/lib/supabase';

const PAGE = 50;
const EVENT: Record<string, { label: string; tone: Tone }> = {
  login: { label: 'Signed in', tone: 'ok' },
  user_signedup: { label: 'First sign-in', tone: 'brand' },
  logout: { label: 'Signed out', tone: 'neutral' },
  user_recovery_requested: { label: 'Code requested', tone: 'info' },
};

export function SignIns() {
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ['signins', page],
    queryFn: async () => unwrap(await supabase.rpc('get_signin_log', { p_limit: PAGE + 1, p_offset: page * PAGE })),
  });
  const rows = (q.data ?? []).slice(0, PAGE);
  const hasMore = (q.data?.length ?? 0) > PAGE;

  return (
    <>
      <PageHeader
        title="Sign-ins"
        subtitle="Who signed in to the app or this console, from Supabase Auth's own log."
        actions={<Button variant="secondary" icon="refresh" onClick={() => void q.refetch()}>Refresh</Button>}
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="login" title="No sign-ins yet" /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => {
                const e = EVENT[r.action] ?? { label: r.action, tone: 'neutral' as Tone };
                return (
                  <tr key={`${r.at}-${i}`} className="hover:bg-surface-2">
                    <td className="px-5 py-3 whitespace-nowrap" title={formatDateTime(r.at)}>{timeAgo(r.at)}</td>
                    <td className="px-5 py-3"><Badge tone={e.tone}>{e.label}</Badge></td>
                    <td className="px-5 py-3">{r.full_name || <span className="text-muted">—</span>}</td>
                    <td className="px-5 py-3 whitespace-nowrap tabular-nums">{formatPhone(r.phone)}</td>
                    <td className="px-5 py-3">{r.role ? ROLE_LABEL[r.role] ?? r.role : <span className="text-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</Button>
            <Button size="sm" variant="secondary" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Older</Button>
          </div>
        </Card>
      )}
    </>
  );
}
