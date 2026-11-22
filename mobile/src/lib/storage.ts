import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { PHOTO_PREFIX } from './demo/store';
import { DEMO_MODE, supabase } from './supabase';

/** offer-images also holds greeting pictures (folder greetings/). */
export type PhotoBucket = 'avatars' | 'staff-photos' | 'offer-images';

/** Public URL for a stored object path (paths are stored, not URLs, so hosts can change). */
export function photoUrl(bucket: PhotoBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?|file|content|data|blob):/.test(path)) return path;
  if (path.startsWith('demo-photo/')) return globalThis.localStorage.getItem(PHOTO_PREFIX + path);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

type PickOptions = {
  /** Width:height of the final image. Square (profile/staff photos) by default; banners use [16, 9]. */
  aspect?: [number, number];
  /** Longest side after resizing (banners 1600, photos are left as picked). */
  maxWidth?: number;
};

/**
 * Let the user pick a photo, crop it to the requested shape, then upload it under a unique
 * name. Returns the stored object path, or null if the user cancelled.
 * The crop is done here as well as in the picker: on the web the picker cannot crop, and
 * banners must match the web portal's 16:9 crop exactly.
 */
export async function pickAndUploadPhoto(bucket: PhotoBucket, folder: string, options: PickOptions = {}): Promise<string | null> {
  const aspect = options.aspect ?? [1, 1];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Please allow photo access in Settings to add a picture.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  const banner = aspect[0] !== aspect[1];
  let uri = asset.uri;
  let base64: string | undefined;
  if (banner || DEMO_MODE) {
    const target = aspect[0] / aspect[1];
    let ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width && asset.height) {
      // Centre-crop to the target shape.
      let w = asset.width;
      let h = asset.height;
      if (w / h > target) w = Math.round(h * target);
      else h = Math.round(w / target);
      ctx = ctx.crop({ originX: Math.round((asset.width - w) / 2), originY: Math.round((asset.height - h) / 2), width: w, height: h });
      const maxWidth = DEMO_MODE ? 600 : (options.maxWidth ?? 1600);
      if (w > maxWidth) ctx = ctx.resize({ width: maxWidth });
    }
    const ref = await ctx.renderAsync();
    const saved = await ref.saveAsync({ base64: DEMO_MODE, compress: DEMO_MODE ? 0.6 : 0.85, format: SaveFormat.JPEG });
    uri = saved.uri;
    base64 = saved.base64;
  }

  if (DEMO_MODE) {
    // Demo: keep a small copy on the phone, outside the main demo database.
    const path = `demo-photo/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    globalThis.localStorage.setItem(PHOTO_PREFIX + path, `data:image/jpeg;base64,${base64}`);
    return path;
  }

  const contentType = banner ? 'image/jpeg' : (asset.mimeType ?? 'image/jpeg');
  const ext = (contentType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await (await fetch(uri)).arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
