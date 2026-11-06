import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from '../d01_auth';
import { CommunityTrail, VibeGuardian, TrailStop, TimeOfDay } from './types';
import { withTrailGalleries } from './gallery';

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export function isGuardianFresh(guardian: VibeGuardian): boolean {
  if (!guardian.selfieCapturedAt) return false;
  const age = Date.now() - new Date(guardian.selfieCapturedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= SEVEN_DAYS_MS;
}
export function countExpiredGuardians(guardians: VibeGuardian[]): number {
  return guardians.filter((g) => !isGuardianFresh(g)).length;
}

type TrailRecord = Record<string, any>;
type PublicProfile = { id: string; handle: string; display_name: string | null; photo_url: string | null };
function normalizeStop(raw: Record<string, any>, position: number): TrailStop {
  const time = String(raw.timeOfDay || 'Flexible').toLowerCase();
  const supported: Record<string, TimeOfDay> = {
    morning: 'Morning', afternoon: 'Afternoon', sunset: 'Sunset', night: 'Night', flexible: 'Flexible'
  };
  return {
    id: String(raw.id || 'stop-' + (position + 1)),
    name: String(raw.name || raw.title || ''),
    address: String(raw.address || '').trim(),
    vibeNote: String(raw.vibeNote || raw.description || ''),
    timeOfDay: supported[time] || 'Flexible',
    durationMinutes: Number(raw.durationMinutes ?? raw.suggestedDurationMin ?? 0),
    lat: typeof raw.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw.lng === 'number' ? raw.lng : undefined,
  };
}
async function publicProfiles(): Promise<Map<string, PublicProfile>> {
  const { data, error } = await supabase.from('profiles').select('id,handle,display_name,photo_url');
  if (error) throw new Error('Could not retrieve real Trail author profiles: ' + error.message);
  const map = new Map<string, PublicProfile>();
  for (const profile of (data || []) as PublicProfile[]) {
    map.set(profile.id, profile);
    if (profile.id.startsWith('usr_')) map.set(profile.id.slice(4), profile);
  }
  return map;
}
function toTrail(row: TrailRecord, profiles: Map<string, PublicProfile>): CommunityTrail {
  const author = profiles.get(String(row.author_id || ''));
  if (!author) throw new Error('Trail ' + String(row.id) + ' has no verified real author profile.');
  const stops = Array.isArray(row.stops) ? row.stops.map(normalizeStop) : [];
  const minutes = Number(row.total_estimated_minutes ?? stops.reduce((sum: number, stop: TrailStop) => sum + stop.durationMinutes, 0));
  const details = row.tour_details && typeof row.tour_details === 'object' ? row.tour_details : null;
  const image = String(row.image_url || '');
  const name = String(row.name || '');
  return {
    id: String(row.id), title: name, story: String(row.story || ''),
    description: String(row.story || ''), city: String(row.city || ''),
    district: String(row.city || ''), category: String(row.category || 'General'),
    vibeTags: Array.isArray(row.vibe_tags) ? row.vibe_tags : [],
    imageUrl: image, image_url: image, durationHours: minutes / 60,
    duration_mins: minutes, stopsCount: stops.length, waypoints_count: stops.length,
    flowSequence: stops.map((s: TrailStop) => s.timeOfDay),
    authorId: author.id, authorName: author.display_name || author.handle,
    authorHandle: '@' + author.handle, authorAvatarUrl: String(author.photo_url || ''),
    guardian_name: author.display_name || author.handle,
    guardian_handle: '@' + author.handle, guardian_avatar: String(author.photo_url || ''),
    isTour: Boolean(row.is_tour), pricePerPerson: details?.price === undefined ? undefined : Number(details.price),
    tourDetails: details, currency: String(details?.currency || 'USD'),
    createdAt: String(row.created_at || ''), stops,
    waypoints: stops.map((stop: TrailStop,index: number) => ({...stop, title: stop.name, order: index+1})),
    savedBy: Array.isArray(row.saved_by) ? row.saved_by : [],
    savesCount: Number(row.saves_count || 0), adoptionsCount: Number(row.adoptions_count || 0),
    forkedFromTrailId: row.forked_from_trail_id || undefined,
    forkedFromAuthorName: row.forked_from_author_name || undefined,
    difficulty: undefined, remix_count: 0,
    vq_reward: undefined
  };
}
export async function fetchCulturalTrails(): Promise<CommunityTrail[]> {
  const [{ data, error }, authors] = await Promise.all([
    supabase.from('vibe_trails').select('*').order('created_at', { ascending: false }),
    publicProfiles()
  ]);
  if (error) throw new Error('Could not load real Trails: ' + error.message);
  return withTrailGalleries((data || []).map(row => toTrail(row, authors)));
}
export async function createCommunityTrail(
  payload: Partial<CommunityTrail>
): Promise<{ success: boolean; trail?: CommunityTrail; error?: string }> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error('Sign in to create a Trail.');
    const title = payload.title?.trim();
    const stops = payload.stops || [];
    if (!title || !stops.length || stops.some(stop => !stop.name.trim())) {
      throw new Error('Provide a Trail title and named itinerary stops.');
    }
    if (stops.some(stop => !stop.address?.trim())) {
      throw new Error('Provide a Google Maps address for every Trail stop.');
    }
    if (payload.isTour) {
      if (!['pro', 'business'].includes(profile.accountType || '')) {
        throw new Error('Only Pro and Business accounts can publish Vibe Tours.');
      }
      if (!Number.isFinite(payload.pricePerPerson) || Number(payload.pricePerPerson) <= 0) {
        throw new Error('Provide a real positive Tour price.');
      }
    }
    let original: CommunityTrail | undefined;
    let inheritedLegacyCover = payload.imageUrl || payload.image_url || '';
    if (payload.forkedFromTrailId) {
      original = (await fetchCulturalTrails()).find(t => t.id === payload.forkedFromTrailId);
      if (!original) throw new Error('Original Trail was not found.');
      // Never persist an expiring signed photo URL inherited from a gallery.
      const { data: source, error: sourceError } = await supabase
        .from('vibe_trails').select('image_url').eq('id', original.id).single();
      if (sourceError || !source) throw new Error('Could not read original Trail cover.');
      inheritedLegacyCover = String(source.image_url || '');
    }
    const normalized = stops.map(normalizeStop);
    const durationMinutes = Math.round(normalized.reduce((n, stop) => n + stop.durationMinutes, 0));
    const id = 'trail_' + crypto.randomUUID();
    const body = {
      id, name: title, story: payload.story || '',
      address: normalized[0]?.address || '', category: payload.category || 'General',
      vibe_tags: payload.vibeTags || [], image_url: inheritedLegacyCover,
      latitude: normalized[0]?.lat ?? null, longitude: normalized[0]?.lng ?? null,
      author_id: profile.id, author_name: profile.full_name,
      city: payload.city || '', stops: normalized, total_stops: normalized.length,
      total_estimated_minutes: durationMinutes, saved_by: [], saves_count: 0,
      forked_from_trail_id: original?.id || null,
      forked_from_author_name: original?.authorName || null,
      is_tour: Boolean(payload.isTour),
      tour_details: payload.isTour ? (payload.tourDetails || {
        price: payload.pricePerPerson, currency: payload.currency || 'USD'
      }) : null
    };
    const { data, error } = await supabase.from('vibe_trails').insert(body).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Trail was not saved.');
    const authors = await publicProfiles();
    return { success: true, trail: toTrail(data, authors) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Trail publication failed.' };
  }
}
export async function toggleSavedTrail(trailId: string): Promise<CommunityTrail> {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('Sign in to save a Trail.');
  const { data: row, error } = await supabase.from('vibe_trails').select('*').eq('id', trailId).single();
  if (error || !row) throw new Error(error?.message || 'Trail not found.');
  const current: string[] = Array.isArray(row.saved_by) ? row.saved_by : [];
  const auth = await supabase.auth.getUser();
  const aliases = [profile.id, auth.data.user?.id, auth.data.user?.id ? 'usr_' + auth.data.user.id : undefined]
    .filter((value): value is string => Boolean(value));
  const hasSaved = current.some(id => aliases.includes(id));
  const savedBy = hasSaved ? current.filter(id => !aliases.includes(id)) : [...current, profile.id];
  const { data, error: writeError } = await supabase.from('vibe_trails')
    .update({ saved_by: savedBy, saves_count: Math.max(0, Number(row.saves_count ?? 0) + (hasSaved ? -1 : 1)) })
    .eq('id', trailId).select('*').single();
  if (writeError || !data) throw new Error(writeError?.message || 'Unable to save this Trail.');
  const hydrated = await withTrailGalleries([toTrail(data, await publicProfiles())]);
  return hydrated[0];
}
export async function adoptTrail(trail: CommunityTrail): Promise<CommunityTrail> {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('Sign in to adopt a Trail.');
  const result = await createCommunityTrail({
    ...trail, title: trail.title + ' (Remix)', isTour: false,
    forkedFromTrailId: trail.id, tourDetails: undefined, pricePerPerson: undefined
  });
  if (!result.success || !result.trail) throw new Error(result.error || 'Unable to adopt this Trail.');
  return result.trail;
}

// D07 Guardian directory and registration are owned by the Guardian domain.
export { fetchVibeGuardians } from '../d07_guardians';

export async function hireGuardian(
  _guardianId: string,
  _explorerId?: string
): Promise<{ success: boolean; hiresCount: number; vqEarned: number }> {
  // D22/D20 are explicitly deferred. Never simulate a real handshake or award.
  return { success: false, hiresCount: 0, vqEarned: 0 };
}
