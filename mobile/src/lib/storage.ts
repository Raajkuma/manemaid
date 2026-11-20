import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { PHOTO_PREFIX } from './demo/store';
import { DEMO_MODE, supabase } from './supabase';

export type PhotoBucket = 'avatars' | 'staff-photos';

/** Public URL for a stored object path (paths are stored, not URLs, so hosts can change). */
export function photoUrl(bucket: PhotoBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?|file|content|data):/.test(path)) return path;
  if (path.startsWith('demo-photo/')) return globalThis.localStorage.getItem(PHOTO_PREFIX + path);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Let the user pick (and square-crop) a photo, then upload it under a unique name.
 * Returns the stored object path, or null if the user cancelled.
 */
export async function pickAndUploadPhoto(bucket: PhotoBucket, folder: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Please allow photo access in Settings to add a picture.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  if (DEMO_MODE) {
    // Demo: keep a small copy on the phone, outside the main demo database.
    const ref = await ImageManipulator.manipulate(asset.uri).resize({ width: 400 }).renderAsync();
    const saved = await ref.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
    const path = `demo-photo/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    globalThis.localStorage.setItem(PHOTO_PREFIX + path, `data:image/jpeg;base64,${saved.base64}`);
    return path;
  }

  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = (contentType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await (await fetch(asset.uri)).arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
