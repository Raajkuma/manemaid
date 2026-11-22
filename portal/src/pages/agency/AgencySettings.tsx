import { useQuery } from '@tanstack/react-query';

import { AgencyCard } from '@/components/AgencyCard';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

export function AgencySettings() {
  const q = useQuery({
    queryKey: ['agency-settings'],
    queryFn: async () => unwrap(await supabase.from('agency_settings').select('*').maybeSingle()) as Tables<'agency_settings'> | null,
  });
  return (
    <>
      <PageHeader title="Agency settings" subtitle="Support numbers, WhatsApp, hours and UPI ID — shared with the app." />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => void q.refetch()} /> : q.data ? (
        <div className="max-w-3xl"><AgencyCard key={q.data.updated_at} agency={q.data} /></div>
      ) : <ErrorBox error={new Error('Agency settings are missing.')} />}
    </>
  );
}
