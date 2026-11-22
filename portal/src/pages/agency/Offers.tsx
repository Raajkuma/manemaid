import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ChoiceChips, EmptyState, ErrorBox, Loading, PageHeader, Switch, useFeedback } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { AUDIENCE_LABEL, offerImageUrl, offerStatus, STATUS_META, type Offer, type OfferStatus } from '@/lib/offers';
import { supabase, unwrap } from '@/lib/supabase';

type Filter = 'all' | OfferStatus;

export function useOffersData() {
  return useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const [offers, claims, categories] = await Promise.all([
        supabase.from('offers').select('*').order('sort_order').order('created_at', { ascending: false }),
        supabase.from('bookings').select('offer_id').not('offer_id', 'is', null),
        supabase.from('service_categories').select('code, name'),
      ]);
      const counts: Record<string, number> = {};
      for (const b of unwrap(claims)) if (b.offer_id) counts[b.offer_id] = (counts[b.offer_id] ?? 0) + 1;
      const names = Object.fromEntries(unwrap(categories).map((c) => [c.code, c.name]));
      return { offers: unwrap(offers) as Offer[], counts, names };
    },
  });
}

export function Offers() {
  const q = useOffersData();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const [filter, setFilter] = useState<Filter>('all');

  const toggle = useMutation({
    mutationFn: async (o: Offer): Promise<Offer> =>
      unwrap(await supabase.from('offers').update({ active: !o.active }).eq('id', o.id).select().single()) as Offer,
    onSuccess: (o) => {
      void qc.invalidateQueries({ queryKey: ['offers'] });
      toast(o.active ? 'Offer is visible to customers again' : 'Offer hidden from customers');
    },
    onError: (e) => toast(e.message, 'bad'),
  });

  const list = useMemo(() => {
    const all = q.data?.offers ?? [];
    return filter === 'all' ? all : all.filter((o) => offerStatus(o) === filter);
  }, [q.data, filter]);

  const countBy = (s: OfferStatus) => (q.data?.offers ?? []).filter((o) => offerStatus(o) === s).length;

  return (
    <>
      <PageHeader
        title="Offers"
        subtitle="Promotions on the customer app's Home screen. Customers see changes the next time they open or refresh Home — no app update needed."
        actions={
          <Button icon="plus" onClick={() => navigate('/agency/offers/new')}>
            New offer
          </Button>
        }
      />

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.offers.length ? (
        <Card>
          <EmptyState
            icon="tag"
            title="No offers yet"
            body="Create your first offer — for example a welcome discount for new customers."
            action={<Button icon="plus" onClick={() => navigate('/agency/offers/new')}>Create an offer</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-5">
            <ChoiceChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All · ${q.data.offers.length}` },
                { value: 'live', label: `Live · ${countBy('live')}` },
                { value: 'scheduled', label: `Scheduled · ${countBy('scheduled')}` },
                { value: 'hidden', label: `Hidden · ${countBy('hidden')}` },
                { value: 'ended', label: `Ended · ${countBy('ended')}` },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <Card>
              <EmptyState icon="tag" title="Nothing here" body="No offers match this filter." />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((o) => {
                const s = STATUS_META[offerStatus(o)];
                const img = offerImageUrl(o.image_path);
                const claims = q.data.counts[o.id] ?? 0;
                return (
                  <Card key={o.id} className="flex flex-col overflow-hidden">
                    <Link to={`/agency/offers/${o.id}`} className="group block flex-1">
                      <div className="relative aspect-video bg-gradient-to-br from-brand-400 to-brand-700">
                        {img ? <img src={img} alt="" className="size-full object-cover" /> : (
                          <div className="grid size-full place-items-center text-white/70"><Icon name="image" size={34} /></div>
                        )}
                        <span className="absolute top-3 left-3"><Badge tone={s.tone}>{s.label}</Badge></span>
                      </div>
                      <div className="space-y-1.5 p-4">
                        <h3 className="font-bold group-hover:text-brand-500">{o.title}</h3>
                        <p className="line-clamp-2 text-sm text-muted">{o.body}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
                          <span>{o.category_code ? q.data.names[o.category_code] ?? o.category_code : 'Any service'}</span>
                          <span>{AUDIENCE_LABEL[o.audience]}</span>
                          <span>
                            {formatDate(o.starts_at)} → {o.ends_at ? formatDate(o.ends_at) : 'no end'}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between border-t border-line px-4 py-3">
                      <span className="text-sm">
                        <span className="font-bold tabular-nums">{claims}</span>{' '}
                        <span className="text-muted">{claims === 1 ? 'booking claimed this' : 'bookings claimed this'}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{o.active ? 'Visible' : 'Hidden'}</span>
                        <Switch
                          checked={o.active}
                          label={o.active ? `Hide ${o.title}` : `Show ${o.title}`}
                          disabled={toggle.isPending}
                          onChange={() => toggle.mutate(o)}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
