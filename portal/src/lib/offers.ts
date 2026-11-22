import type { Tone } from '@/components/ui';

import { supabase, type Tables } from './supabase';

export type Offer = Tables<'offers'>;
export type OfferStatus = 'live' | 'scheduled' | 'ended' | 'hidden';

export function offerStatus(o: Pick<Offer, 'active' | 'starts_at' | 'ends_at'>, now = Date.now()): OfferStatus {
  if (!o.active) return 'hidden';
  if (new Date(o.starts_at).getTime() > now) return 'scheduled';
  if (o.ends_at && new Date(o.ends_at).getTime() <= now) return 'ended';
  return 'live';
}

export const STATUS_META: Record<OfferStatus, { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'ok' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  ended: { label: 'Ended', tone: 'neutral' },
  hidden: { label: 'Hidden', tone: 'warn' },
};

export const AUDIENCE_LABEL: Record<string, string> = {
  all: 'All customers',
  new_customers: 'New customers only',
};

export const OFFER_BUCKET = 'offer-images';

export function offerImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?|blob|data):/.test(path)) return path;
  return supabase.storage.from(OFFER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Centre-crop an image to 16:9 and shrink it to at most 1600×900 JPEG, in the browser.
 * Keeps banners consistent and uploads small, with no cropping library.
 */
export function cropTo16x9(file: File): Promise<Blob> {
  return cropImage(file, 16 / 9, 1600);
}

/** Centre-crop to a width:height ratio and shrink to at most `maxWidth`, as JPEG. */
export async function cropImage(file: File, target: number, maxWidth: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file is not an image we can read. Try a JPG or PNG.'));
      i.src = url;
    });
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    let sx = 0;
    let sy = 0;
    if (sw / sh > target) {
      sw = Math.round(sh * target);
      sx = Math.round((img.naturalWidth - sw) / 2);
    } else {
      sh = Math.round(sw / target);
      sy = Math.round((img.naturalHeight - sh) / 2);
    }
    const outW = Math.min(maxWidth, sw);
    const outH = Math.round(outW / target);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the image.'))), 'image/jpeg', 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadOfferImage(blob: Blob): Promise<string> {
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(OFFER_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Public URL of a photo in any public bucket (paths are stored, not URLs). */
export function publicUrl(bucket: 'avatars' | 'staff-photos' | 'offer-images', path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?|blob|data):/.test(path)) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(bucket: 'avatars' | 'staff-photos' | 'offer-images', folder: string, blob: Blob): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
