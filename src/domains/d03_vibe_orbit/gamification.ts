import { supabase } from '../../lib/supabase';

export interface MayorState {
  mayorUserId: string | null;
  mayorHandle: string;
  mayorAvatar: string;
  mayorCheckins: number;
  currentUserCheckins: number;
  isCurrentUserMayor: boolean;
  checkinsNeededForMayor: number;
}

export interface VibeBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

/**
 * Authoritative Supabase RPC query for Venue Mayor (strictly 33m-verified check-ins in last 60 days)
 */
export async function getVenueMayorState(
  placeId: string,
  placeName: string,
  currentUserId?: string,
  currentUserHandle?: string
): Promise<MayorState> {
  void placeName;
  void currentUserHandle;
  try {
    const { data, error } = await supabase.rpc('rpc_get_venue_mayor_and_badges', {
      p_place_id: placeId,
      p_user_id: currentUserId || null,
    });

    if (error || !data) {
      return {
        mayorUserId: null,
        mayorHandle: 'Unclaimed Throne',
        mayorAvatar: '👑',
        mayorCheckins: 0,
        currentUserCheckins: 0,
        isCurrentUserMayor: false,
        checkinsNeededForMayor: 1,
      };
    }

    const mayorCheckins = Number(data.mayor_checkins || 0);
    const currentUserCheckins = Number(data.user_place_checkins || 0);
    const mayorUserId = data.mayor_user_id || null;
    const isCurrentUserMayor = Boolean(currentUserId && mayorUserId === currentUserId && mayorCheckins > 0);
    const checkinsNeededForMayor = isCurrentUserMayor
      ? 0
      : Math.max(1, mayorCheckins - currentUserCheckins + 1);

    return {
      mayorUserId,
      mayorHandle: mayorUserId ? `@${data.mayor_handle || 'VibeExplorer'}` : 'Unclaimed Throne',
      mayorAvatar: data.mayor_avatar || '👑',
      mayorCheckins,
      currentUserCheckins,
      isCurrentUserMayor,
      checkinsNeededForMayor,
    };
  } catch {
    return {
      mayorUserId: null,
      mayorHandle: 'Unclaimed Throne',
      mayorAvatar: '👑',
      mayorCheckins: 0,
      currentUserCheckins: 0,
      isCurrentUserMayor: false,
      checkinsNeededForMayor: 1,
    };
  }
}

/**
 * Authoritative 5 canonical VibeQuest badges computed from Supabase check-in & validation history
 */
export async function getCanonicalVibeBadges(
  userId?: string,
  placeCategory?: string
): Promise<VibeBadge[]> {
  void placeCategory;
  let foodCount = 0;
  let nightCount = 0;
  let cultureCount = 0;
  let validationCount = 0;

  if (userId) {
    try {
      const [{ data: checkins }, { count: valCount }] = await Promise.all([
        supabase
          .from('place_checkins')
          .select('category')
          .eq('user_id', userId)
          .lte('distance_meters', 33),
        supabase
          .from('place_validations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      for (const row of checkins || []) {
        const cat = (row.category || '').toLowerCase();
        if (cat.includes('food') || cat.includes('cafe') || cat.includes('coffee')) {
          foodCount += 1;
        } else if (cat.includes('night') || cat.includes('bar') || cat.includes('club')) {
          nightCount += 1;
        } else if (cat.includes('art') || cat.includes('culture') || cat.includes('museum')) {
          cultureCount += 1;
        }
      }
      validationCount = valCount || 0;
    } catch {
      // ignore
    }
  }

  return [
    {
      id: 'caffeine_fiend',
      name: 'Caffeine Fiend',
      icon: '☕',
      description: '3+ verified 33m check-ins at specialty cafes & bakeries',
      unlocked: foodCount >= 3,
      progress: Math.min(3, foodCount),
      target: 3,
    },
    {
      id: 'gourmet_scout',
      name: 'Gourmet Scout',
      icon: '🍽️',
      description: '5+ verified 33m check-ins at culinary & dining hotspots',
      unlocked: foodCount >= 5,
      progress: Math.min(5, foodCount),
      target: 5,
    },
    {
      id: 'night_mayor',
      name: 'Night Mayor',
      icon: '🦉',
      description: '3+ verified 33m check-ins at late-night lounges & rooftops',
      unlocked: nightCount >= 3,
      progress: Math.min(3, nightCount),
      target: 3,
    },
    {
      id: 'culture_vulture',
      name: 'Culture Vulture',
      icon: '🎨',
      description: '3+ verified 33m check-ins at art galleries & cultural landmarks',
      unlocked: cultureCount >= 3,
      progress: Math.min(3, cultureCount),
      target: 3,
    },
    {
      id: 'vibe_vanguard',
      name: 'Vibe Vanguard',
      icon: '⚡',
      description: '3+ live Vibe Validations or LiveCheck receipts submitted',
      unlocked: validationCount >= 3,
      progress: Math.min(3, validationCount),
      target: 3,
    },
  ];
}
