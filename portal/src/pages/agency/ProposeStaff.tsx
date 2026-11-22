import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Card, EmptyState, ErrorBox, Loading, PageHeader, useFeedback } from '@/components/ui';
import { supabase, unwrap } from '@/lib/supabase';

type Candidate = {
  staff_id: string;
  code: string | null;
  full_name: string;
  status: string;
  verification_status: string;
  experience_years: number;
  languages: string[];
  rating: number | null;
  zone_match: boolean;
  language_match: boolean;
  has_conflict: boolean;
};

export function ProposeStaff() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, toast } = useFeedback();
  const q = useQuery({
    queryKey: ['candidates', id],
    queryFn: async () => unwrap(await supabase.rpc('staff_candidates', { p_booking_id: id })) as unknown as Candidate[],
  });

  function propose(c: Candidate) {
    confirm({
      title: `Propose ${c.full_name}?`,
      message: 'The customer will be asked to approve this staff member.',
      confirmLabel: 'Propose',
      reason: 'optional',
      reasonLabel: 'Note for the customer (optional)',
      onConfirm: async (note) => {
        unwrap(await supabase.rpc('propose_staff', { p_booking_id: id, p_staff_id: c.staff_id, p_note: note || undefined }));
        await qc.invalidateQueries();
        toast(`${c.full_name} proposed`);
        navigate(`/agency/bookings/${id}`);
      },
    });
  }

  return (
    <>
      <Link to={`/agency/bookings/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> Back to booking
      </Link>
      <PageHeader title="Propose staff" subtitle="Ranked by verification, availability, area and rating. Confirm availability with the worker before proposing." />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <Card><EmptyState icon="users" title="No staff offer this service" body="Add staff with this service from the Staff page." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((c) => {
            const verified = c.verification_status === 'verified';
            const blocked = !verified || c.has_conflict || c.status === 'on_leave';
            const why = !verified ? 'Verify this staff member first.' : c.has_conflict ? 'They already have a booking at that time.' : 'They are on leave.';
            return (
              <Card key={c.staff_id} className={`flex items-start gap-3 p-4 ${blocked ? 'opacity-60' : ''}`}>
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-brand-500">{c.full_name.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><p className="font-semibold">{c.full_name}</p><span className="text-xs text-muted">{c.code}</span></div>
                  <p className="text-xs text-muted">{c.experience_years} yrs · {c.languages.join(', ')}{c.rating ? ` · ★ ${c.rating}` : ''}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={verified ? 'ok' : 'bad'}>{verified ? 'Verified' : 'Not verified'}</Badge>
                    {c.has_conflict ? <Badge tone="bad">Schedule clash</Badge> : null}
                    {c.status === 'on_leave' ? <Badge tone="warn">On leave</Badge> : null}
                    <Badge tone={c.zone_match ? 'brand' : 'neutral'}>{c.zone_match ? 'Same area' : 'Other area'}</Badge>
                    {!c.language_match ? <Badge tone="warn">Language mismatch</Badge> : null}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={blocked} title={blocked ? why : undefined} onClick={() => propose(c)}
                      className="h-8 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
                      Propose
                    </button>
                    <Link to={`/agency/staff/${c.staff_id}`} className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-sm font-medium hover:bg-surface-2">View profile</Link>
                  </div>
                  {blocked ? <p className="mt-2 text-xs text-bad">{why}</p> : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
