import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Icon } from '@/components/icons';
import { Button, Card, EmptyState, ErrorBox, Loading, PageHeader, cx } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Note = Tables<'notifications'>;

export function useUnread() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['unread', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function Inbox() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200)) as Note[],
  });
  const unread = (q.data ?? []).filter((n) => !n.read_at).length;

  async function open(n: Note) {
    await supabase.rpc('mark_notifications_read', { p_ids: [n.id] });
    await qc.invalidateQueries();
    if (n.ticket_id) navigate(`/agency/support/${n.ticket_id}`);
    else if (n.booking_id) navigate(`/agency/bookings/${n.booking_id}`);
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={unread ? `${unread} unread` : 'You are all caught up'}
        actions={unread ? (
          <Button variant="secondary" icon="check" onClick={async () => { await supabase.rpc('mark_notifications_read', {}); await qc.invalidateQueries(); }}>
            Mark all as read
          </Button>
        ) : undefined}
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <Card><EmptyState icon="bell" title="No notifications yet" body="Booking and support updates will appear here." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {q.data.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => void open(n)} className={cx('flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-surface-2', !n.read_at && 'bg-accent-soft/40')}>
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-brand-500">
                    <Icon name={n.ticket_id ? 'chat' : n.booking_id ? 'calendar' : 'bell'} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    <span className="block text-sm text-muted">{n.body}</span>
                    <span className="block text-xs text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at ? <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
