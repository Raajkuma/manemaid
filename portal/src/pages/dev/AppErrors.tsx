import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ChoiceChips, EmptyState, ErrorBox, Loading, PageHeader } from '@/components/ui';
import { reportError } from '@/lib/errors';
import { formatDateTime, timeAgo } from '@/lib/format';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Err = Tables<'app_errors'>;
type Source = 'all' | 'mobile' | 'portal';

export function AppErrors() {
  const [source, setSource] = useState<Source>('all');
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['app-errors'],
    queryFn: async () => unwrap(await supabase.from('app_errors').select('*').order('at', { ascending: false }).limit(500)) as Err[],
    refetchInterval: 30_000,
  });

  const groups = useMemo(() => {
    const m = new Map<string, Err[]>();
    for (const e of q.data ?? []) {
      if (source !== 'all' && e.source !== source) continue;
      const k = `${e.source}|${e.message}`;
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()].map(([key, items]) => ({ key, items, last: items[0] }));
  }, [q.data, source]);

  return (
    <>
      <PageHeader
        title="App errors"
        subtitle="Crashes and failures reported by the mobile app and this console (last 500)."
        actions={
          <>
            <Button variant="secondary" icon="bug" onClick={() => { reportError(new Error(`Test error from the console (${new Date().toLocaleTimeString()})`)); setTimeout(() => void q.refetch(), 800); }}>
              Send test error
            </Button>
            <Button variant="secondary" icon="refresh" onClick={() => void q.refetch()}>Refresh</Button>
          </>
        }
      />
      <div className="mb-5">
        <ChoiceChips<Source>
          value={source}
          onChange={setSource}
          options={[
            { value: 'all', label: 'All' },
            { value: 'mobile', label: 'Mobile app' },
            { value: 'portal', label: 'Web console' },
          ]}
        />
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : groups.length === 0 ? (
        <Card><EmptyState icon="check" title="No errors reported" body="Nice. New reports appear here automatically." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {groups.map((g) => {
              const expanded = open === g.key;
              const users = new Set(g.items.map((i) => i.user_id ?? 'anon')).size;
              return (
                <li key={g.key}>
                  <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : g.key)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2">
                    <Badge tone={g.last.source === 'mobile' ? 'brand' : 'info'}>{g.last.source === 'mobile' ? 'Mobile' : 'Console'}</Badge>
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">{g.last.message}</span>
                    <span className="text-sm tabular-nums"><b>{g.items.length}</b> <span className="text-muted">× · {users} {users === 1 ? 'user' : 'users'}</span></span>
                    <span className="w-24 text-right text-xs text-muted" title={formatDateTime(g.last.at)}>{timeAgo(g.last.at)}</span>
                    <Icon name="chevron" size={16} className={expanded ? 'rotate-90 text-muted' : 'text-muted'} />
                  </button>
                  {expanded ? (
                    <div className="space-y-3 border-t border-line bg-surface-2 px-5 py-4 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                        <span>Last: {formatDateTime(g.last.at)}</span>
                        <span>Screen: {g.last.route ?? '—'}</span>
                        <span>Version: {g.last.app_version ?? '—'}</span>
                        <span>Device: {g.last.platform ?? '—'}</span>
                        <span>User: {g.last.user_id ? g.last.user_id.slice(0, 8) : 'signed out'}</span>
                      </div>
                      {g.last.stack ? (
                        <pre className="max-h-72 overflow-auto rounded-xl bg-[#1b1f3b] p-3 font-mono text-xs leading-relaxed text-[#e7e5f5]">{g.last.stack}</pre>
                      ) : <p className="text-muted">No stack trace.</p>}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
