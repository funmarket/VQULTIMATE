import { supabase } from '../../lib/supabase';
import type { CommunityTrail } from './types';

export type TrailGalleryPhoto = {
  id: string;
  objectPath: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
};

type MediaRow = {
  id: string;
  trail_id: string;
  object_path: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
};

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;

export function photoLimit(accountType?: string, isAdmin = false): number {
  return isAdmin || accountType === 'pro' || accountType === 'business' ? 6 : 3;
}

export function validateTrailPhotos(files: File[], availableSlots: number): void {
  if (files.length > availableSlots) throw new Error(`Only ${Math.max(availableSlots, 0)} more photos may be added to this Trail.`);
  for (const file of files) {
    if (!Object.hasOwn(PHOTO_TYPES, file.type)) throw new Error('Trail photos must be JPG, PNG, or WebP.');
    if (!file.size || file.size > MAX_PHOTO_BYTES) throw new Error('Each Trail photo must be between 1 byte and 5 MB.');
  }
}

/** Query the real gallery contract before a content-creating action with photos. */
export async function requireTrailGallery(): Promise<void> {
  const { error } = await supabase.from('trail_media').select('id').limit(1);
  if (error) throw new Error('Trail photo publishing is not installed yet: ' + error.message);
}

export async function uploadTrailPhotos(
  trailId: string,
  files: File[],
  coverIndex = 0,
): Promise<void> {
  if (!files.length) return;
  if (!Number.isInteger(coverIndex) || coverIndex < 0 || coverIndex >= files.length) {
    throw new Error('Select one cover photo.');
  }
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to upload Trail photos.');
  await requireTrailGallery();
  const { data: existing, error: listError } = await supabase
    .from('trail_media').select('id').eq('trail_id', trailId);
  if (listError) throw new Error(listError.message);
  // The published legacy cover also occupies one gallery slot.
  const { data: trail, error: trailError } = await supabase
    .from('vibe_trails').select('image_url').eq('id', trailId).single();
  if (trailError || !trail) throw new Error('Trail not available for photo upload.');
  const { data: account, error: profileError } = await supabase
    .from('profiles').select('account_type').eq('id', 'usr_' + auth.user.id).maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const { data: admin, error: adminError } = await supabase
    .from('vq_admin_assignments').select('role')
    .eq('auth_user_id', auth.user.id).eq('active', true).maybeSingle();
  if (adminError) throw new Error(adminError.message);
  const limit = photoLimit(account?.account_type, admin?.role === 'platform_admin');
  validateTrailPhotos(files, limit - (existing?.length || 0) - (trail.image_url ? 1 : 0));

  let completed = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = `${auth.user.id}/trails/${trailId}/${crypto.randomUUID()}.${PHOTO_TYPES[file.type]}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error(`${completed} photos saved. Upload failed: ${uploadError.message}`);
    const { error: linkError } = await supabase.from('trail_media').insert({
      trail_id: trailId,
      object_path: path,
      sort_order: (existing?.length || 0) + i,
      is_cover: i === coverIndex,
    });
    if (linkError) {
      // Only the newly uploaded, unattached file can be cleaned up.
      await supabase.storage.from('media').remove([path]);
      throw new Error(`${completed} photos saved. Gallery registration failed: ${linkError.message}`);
    }
    completed++;
  }
}

/** Signed URLs are temporary display URLs, never persisted as a Trail's cover. */
export async function withTrailGalleries(trails: CommunityTrail[]): Promise<CommunityTrail[]> {
  if (!trails.length) return trails;
  const { data, error } = await supabase.from('trail_media')
    .select('id,trail_id,object_path,sort_order,is_cover,created_at');
  if (error) {
    // Preserve existing Trails on an environment where this migration is pending.
    if (error.code === '42P01' || error.code === 'PGRST205') return trails;
    throw new Error('Could not retrieve Trail galleries: ' + error.message);
  }
  const rows = (data || []) as MediaRow[];
  const paths = [...new Set(rows.map(row => row.object_path))];
  const signed = new Map<string, string>();
  await Promise.all(paths.map(async path => {
    const { data: url, error: signError } = await supabase.storage.from('media')
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signError || !url?.signedUrl) throw new Error('Unable to display a published Trail photo.');
    signed.set(path, url.signedUrl);
  }));
  const galleries = new Map<string, TrailGalleryPhoto[]>();
  for (const row of rows) {
    const gallery = galleries.get(row.trail_id) || [];
    gallery.push({
      id: row.id,
      objectPath: row.object_path,
      url: signed.get(row.object_path) || '',
      sortOrder: row.sort_order,
      isCover: row.is_cover,
    });
    galleries.set(row.trail_id, gallery);
  }
  for (const gallery of galleries.values()) gallery.sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(trails.map(trail => [trail.id, trail]));
  function inheritedGallery(trail: CommunityTrail, seen = new Set<string>()): TrailGalleryPhoto[] {
    if (seen.has(trail.id)) return [];
    seen.add(trail.id);
    const own = galleries.get(trail.id);
    if (own?.length) return own;
    const parent = trail.forkedFromTrailId ? byId.get(trail.forkedFromTrailId) : undefined;
    return parent ? inheritedGallery(parent, seen) : [];
  }
  return trails.map(trail => {
    const gallery = inheritedGallery(trail);
    const cover = gallery.find(photo => photo.isCover) || gallery[0];
    return {
      ...trail,
      gallery,
      imageUrl: cover?.url || trail.imageUrl,
      image_url: cover?.url || trail.image_url,
    };
  });
}
