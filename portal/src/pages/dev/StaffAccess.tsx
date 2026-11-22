import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge, Button, Card, Dialog, EmptyState, ErrorBox, Field, Input, Loading, PageHeader, Select, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { ROLE_LABEL, timeAgo } from '@/lib/format';
import { formatPhone, isValidMobile, tenDigits } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { supabase, unwrap, type Role } from '@/lib/supabase';

const ROLES: { value: Exclude<Role, 'customer'>; label: string; body: string }[] = [
  { value: 'admin', label: 'Agency admin', body: 'Full agency access in the app and this console.' },
  { value: 'coordinator', label: 'Coordinator', body: 'Same agency access as an admin.' },
  { value: 'developer', label: 'Developer', body: 'Agency access plus logs and configuration.' },
];

type Entry = { phone: string; role: Role; full_name: string | null; signed_up: boolean; last_sign_in_at: string | null };

function AccessDialog({ value, onClose }: { value: Entry | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const editing = value && value !== 'new' ? value : null;
  const [phone, setPhone] = useState(editing ? tenDigits(editing.phone) : '');
  const [name, setName] = useState(editing?.full_name ?? '');
  const [role, setRole] = useState<Exclude<Role, 'customer'>>((editing?.role as Exclude<Role, 'customer'>) ?? 'coordinator');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!isValidMobile(phone)) return setErr('Enter a 10-digit Indian mobile number.');
    setBusy(true);
    try {
      unwrap(await supabase.rpc('set_staff_access', { p_phone: tenDigits(phone), p_role: role, p_full_name: name.trim() || undefined }));
      await qc.invalidateQueries({ queryKey: ['staff-access'] });
      toast(editing ? 'Access updated' : `${formatPhone(phone)} can now sign in as ${ROLE_LABEL[role]}`);
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!value} onClose={onClose} title={editing ? 'Change access' : 'Give someone access'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={() => void save()}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Mobile number" htmlFor="s-phone" required hint="The number they will sign in with (app and console).">
          <div className="flex">
            <span className="inline-flex h-11 items-center rounded-l-xl border border-r-0 border-line bg-surface-2 px-3 text-muted">+91</span>
            <Input id="s-phone" inputMode="numeric" disabled={!!editing} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} className="rounded-l-none" placeholder="98765 43210" />
          </div>
        </Field>
        <Field label="Name" htmlFor="s-name"><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" /></Field>
        <Field label="Access" htmlFor="s-role" hint={ROLES.find((r) => r.value === role)?.body}>
          <Select id="s-role" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, 'customer'>)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        {err ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p> : null}
      </div>
    </Dialog>
  );
}

export function StaffAccess() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [edit, setEdit] = useState<Entry | 'new' | null>(null);
  const q = useQuery({
    queryKey: ['staff-access'],
    queryFn: async () => unwrap(await supabase.rpc('list_staff_access')) as Entry[],
  });

  return (
    <>
      <PageHeader
        title="Staff access"
        subtitle="Phone numbers allowed into the agency side of the app and this console. Changes apply immediately."
        actions={<Button icon="plus" onClick={() => setEdit('new')}>Give access</Button>}
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <Card><EmptyState icon="shield" title="No staff yet" /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3">Access</th>
                <th className="px-5 py-3">Last sign-in</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {q.data.map((s) => {
                const isMe = s.phone === profile?.phone;
                return (
                  <tr key={s.phone} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <p className="font-semibold">{s.full_name || '—'} {isMe ? <span className="text-xs font-normal text-muted">(you)</span> : null}</p>
                      <p className="text-xs text-muted tabular-nums">{formatPhone(s.phone)}</p>
                    </td>
                    <td className="px-5 py-3"><Badge tone={s.role === 'developer' ? 'info' : 'brand'}>{ROLE_LABEL[s.role] ?? s.role}</Badge></td>
                    <td className="px-5 py-3 text-muted">{s.last_sign_in_at ? timeAgo(s.last_sign_in_at) : s.signed_up ? 'Signed up' : 'Not signed in yet'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit(s)}>Change</Button>
                      <Button size="sm" variant="ghost" icon="trash" className="text-bad hover:bg-bad-soft" onClick={() => confirm({
                        title: 'Remove access?',
                        message: `${s.full_name || formatPhone(s.phone)} will become a regular customer and lose access to the agency side of the app and this console${isMe ? ' — including you, right now' : ''}.`,
                        confirmLabel: 'Remove access',
                        danger: true,
                        onConfirm: async () => {
                          unwrap(await supabase.rpc('remove_staff_access', { p_phone: s.phone }));
                          await qc.invalidateQueries({ queryKey: ['staff-access'] });
                          toast('Access removed');
                        },
                      })}>Remove</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {edit ? <AccessDialog key={edit === 'new' ? 'new' : edit.phone} value={edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}
