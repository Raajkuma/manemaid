import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ErrorBox, Field, Loading, Select, Textarea, cx, useFeedback } from '@/components/ui';
import { PRIORITY, TICKET_ACTIONS, TICKET_CATEGORY, TICKET_STATUS, type TicketPriority } from '@/lib/booking';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Full = Tables<'support_tickets'> & {
  profiles: { full_name: string | null; phone: string | null } | null;
  bookings: { id: string; reference: string } | null;
};

export function Ticket() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { confirm, toast } = useFeedback();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const q = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const [t, msgs] = await Promise.all([
        supabase.from('support_tickets').select('*, profiles(full_name, phone), bookings(id, reference)').eq('id', id).single(),
        supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at'),
      ]);
      return { ticket: unwrap(t) as unknown as Full, messages: unwrap(msgs) as Tables<'ticket_messages'>[] };
    },
  });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? new Error('Not found')} onRetry={() => void q.refetch()} />;
  const { ticket: t, messages } = q.data;
  const p = PRIORITY[t.priority];
  const s = TICKET_STATUS[t.status];
  const closed = t.status === 'closed';

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      unwrap(await supabase.rpc('reply_to_ticket', { p_ticket_id: id, p_message: reply.trim() }));
      setReply('');
      await qc.invalidateQueries();
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setSending(false);
    }
  }

  async function setPriority(v: TicketPriority) {
    const { error } = await supabase.rpc('set_ticket_priority', { p_ticket_id: id, p_priority: v });
    if (error) toast(error.message, 'bad');
    else {
      toast(`Priority set to ${PRIORITY[v].label}`);
      await qc.invalidateQueries();
    }
  }

  return (
    <>
      <Link to="/agency/support" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> Support
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className={cx('p-5', t.priority === 'urgent' && 'border-bad/60')}>
            <p className="text-xs text-muted">{t.reference} · {TICKET_CATEGORY[t.category] ?? t.category}</p>
            <h1 className="text-xl font-extrabold">{t.subject}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={s.tone}>{s.label}</Badge>
              <Badge tone={p.tone}>{p.label} · {p.target}</Badge>
              {t.is_priority_customer ? <Badge tone="ok">Paying customer</Badge> : null}
            </div>
            <p className="mt-2 text-xs text-muted">Opened {formatDate(t.created_at)}</p>
          </Card>

          <Card className="space-y-3 p-5">
            {messages.map((m) => {
              const agency = m.author_role !== 'customer';
              return (
                <div key={m.id} className={cx('flex', agency ? 'justify-start' : 'justify-end')}>
                  <div className={cx('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', agency ? 'bg-surface-2' : 'bg-brand-500 text-white')}>
                    <p className={cx('mb-0.5 text-xs font-semibold', agency ? 'text-brand-500' : 'text-white/80')}>{agency ? 'ManeMaid support' : t.profiles?.full_name || 'Customer'}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={cx('mt-1 text-[11px]', agency ? 'text-muted' : 'text-white/70')}>{formatDateTime(m.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </Card>

          <Card className="p-4">
            <Field label="Reply to the customer" htmlFor="reply">
              <Textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} disabled={closed} placeholder={closed ? 'This request is closed' : 'Write a message…'} className="min-h-20" />
            </Field>
            <div className="mt-3 flex justify-end">
              <Button icon="check" loading={sending} disabled={closed || !reply.trim()} onClick={() => void send()}>Send reply</Button>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="font-semibold">{t.profiles?.full_name || 'Customer'}</p>
            <p className="text-sm text-muted">{formatPhone(t.profiles?.phone)}</p>
            {t.profiles?.phone ? <a href={`tel:+${t.profiles.phone}`} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium hover:bg-surface-2"><Icon name="phone" size={15} /> Call</a> : null}
            {t.bookings ? <Link to={`/agency/bookings/${t.bookings.id}`} className="mt-3 block text-sm font-medium text-brand-500 hover:underline">Open booking {t.bookings.reference}</Link> : null}
          </Card>
          <Card className="space-y-3 p-5">
            <Field label="Priority" htmlFor="prio">
              <Select id="prio" value={t.priority} onChange={(e) => void setPriority(e.target.value as TicketPriority)}>
                {(Object.keys(PRIORITY) as TicketPriority[]).map((k) => <option key={k} value={k}>{PRIORITY[k].label} · {PRIORITY[k].target}</option>)}
              </Select>
            </Field>
            {TICKET_ACTIONS[t.status].map((a) => (
              <Button key={a.to} className="w-full" variant={a.variant} onClick={() => confirm({
                title: `${a.label}?`,
                message: a.to === 'resolved' ? 'Tell the customer how it was resolved.' : 'The customer will be notified.',
                confirmLabel: a.label,
                reason: a.to === 'resolved' ? 'required' : 'optional',
                reasonLabel: a.to === 'resolved' ? 'Resolution' : 'Note (optional)',
                onConfirm: async (note) => {
                  unwrap(await supabase.rpc('set_ticket_status', { p_ticket_id: id, p_status: a.to, p_note: note || undefined }));
                  await qc.invalidateQueries();
                  toast('Request updated');
                },
              })}>{a.label}</Button>
            ))}
          </Card>
        </aside>
      </div>
    </>
  );
}
