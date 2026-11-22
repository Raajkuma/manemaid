import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Badge, Button, Card, ChoiceChips, EmptyState, ErrorBox, Input, Loading, PageHeader } from '@/components/ui';
import { STAFF_STATUS, type Staff as StaffRow } from '@/lib/booking';
import { publicUrl } from '@/lib/offers';
import { supabase, unwrap } from '@/lib/supabase';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unverified', label: 'Needs verification' },
];

export function useStaffData() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const [staff, cats] = await Promise.all([
        supabase.from('staff').select('*').order('full_name'),
        supabase.from('service_categories').select('code, name'),
      ]);
      return {
        staff: unwrap(staff) as StaffRow[],
        names: Object.fromEntries(unwrap(cats).map((c) => [c.code, c.name])) as Record<string, string>,
      };
    },
  });
}

export function Staff() {
  const q = useStaffData();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const list = (q.data?.staff ?? []).filter((s) => {
    if (filter === 'available' && s.status !== 'available') return false;
    if (filter === 'assigned' && s.status !== 'assigned') return false;
    if (filter === 'unverified' && s.verification_status === 'verified') return false;
    if (term && !`${s.full_name} ${s.code} ${s.phone ?? ''}`.toLowerCase().includes(term)) return false;
    return true;
  });
  const total = q.data?.staff.length ?? 0;
  const available = q.data?.staff.filter((s) => s.status === 'available').length ?? 0;

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={q.data ? `${total} people · ${available} available` : undefined}
        actions={<Button icon="plus" onClick={() => navigate('/agency/staff/new')}>Add staff member</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input placeholder="Search by name, code or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" aria-label="Search staff" />
        <ChoiceChips value={filter} onChange={setFilter} options={FILTERS} />
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : !list.length ? (
        <Card><EmptyState icon="users" title={term || filter !== 'all' ? 'No matches' : 'No staff yet'} body="Add your first staff member to start matching." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const st = STAFF_STATUS[s.status];
            const verified = s.verification_status === 'verified';
            return (
              <Link key={s.id} to={`/agency/staff/${s.id}`} className="group">
                <Card className="flex h-full items-start gap-3 p-4 transition group-hover:border-brand-300">
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft font-bold text-brand-500">
                    {s.photo_url ? <img src={publicUrl('staff-photos', s.photo_url) ?? ''} alt="" className="size-full object-cover" /> : s.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2"><p className="truncate font-semibold group-hover:text-brand-500">{s.full_name}</p><span className="text-xs text-muted">{s.code}</span></div>
                    <p className="truncate text-xs text-muted">{s.categories.map((c) => q.data!.names[c] ?? c).join(', ') || 'No services yet'} · {s.experience_years} yrs</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <Badge tone={verified ? 'ok' : 'warn'}>{verified ? 'Verified' : 'Not verified'}</Badge>
                      {s.rating ? <Badge tone="neutral" dot={false}>★ {s.rating}</Badge> : null}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
