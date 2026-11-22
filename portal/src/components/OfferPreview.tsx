import { formatDate } from '@/lib/format';

import { Icon } from './icons';

/**
 * Mirrors the offer card in the customer app (mobile/src/components/offers.tsx),
 * so the agency sees exactly what customers will see.
 */
export function OfferPreview({
  title,
  body,
  imageUrl,
  endsAt,
  serviceName,
}: {
  title: string;
  body: string;
  imageUrl: string | null;
  endsAt: string | null;
  serviceName: string | null;
}) {
  return (
    <div className="mx-auto w-[300px] overflow-hidden rounded-[18px] border border-line bg-white text-[#1b1f3b] shadow-card">
      <div className="relative aspect-video bg-gradient-to-br from-brand-400 to-brand-700">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-white/80">
            <Icon name="sparkles" size={40} />
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand-600">OFFER</span>
      </div>
      <div className="space-y-1.5 p-3.5">
        <p className="font-display text-[15px] leading-snug font-extrabold">{title || 'Your offer title'}</p>
        <p className="line-clamp-2 text-[13px] leading-snug text-[#7a8098]">{body || 'A short description customers will read.'}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {serviceName ? (
            <span className="rounded-full bg-[#eeebff] px-2 py-0.5 text-[11px] font-semibold text-[#6759d1]">{serviceName}</span>
          ) : null}
          <span className="rounded-full bg-[#fff0e4] px-2 py-0.5 text-[11px] font-semibold text-[#e07b39]">
            {endsAt ? `Ends ${formatDate(endsAt)}` : 'No end date'}
          </span>
        </div>
      </div>
    </div>
  );
}
