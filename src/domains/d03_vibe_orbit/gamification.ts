/**
 * VibeQuest Gamification Domain API (Mayor & Badges - ES-011)
 * Manages verified venue Mayorship and the 5 canonical achievement badges:
 * 1. Caffeine Fiend (3 Cozy/Café/Bakery check-ins)
 * 2. Gourmet Scout (2 Chilled/Food/Restaurant check-ins)
 * 3. Night Mayor (2 Hype/Night Owl/Bar check-ins)
 * 4. Culture Vulture (2 Quiet/Culture & Art check-ins)
 * 5. Vibe Vanguard (5 distinct verified venue check-ins)
 */

import { supabase } from '../../lib/supabase';

export interface VenueMayorState {
  mayorUserId?: string;
  mayorName?: string;
  mayorAvatar?: string;
  mayorCheckinsCount: number;
  leaderboard: { userId: string; name: string; avatar?: string; checkinsCount: number }[];
}

export interface VibeQuestBadgeDefinition {
  id: string;
  title: string;
  icon: string;
  description: string;
  targetCount: number;
  currentCount: number;
  isUnlocked: boolean;
}

/**
 * Computes venue Mayorship and check-in leaderboard for a spot.
 */
export async function getVenueMayorState(placeId: string): Promise<VenueMayorState> {
  try {
    const { data, error } = await supabase
      .from('place_checkins')
      .select('*')
      .eq('place_id', placeId);

    if (!error && Array.isArray(data)) {
      const countsMap = new Map<string, { count: number; name: string; avatar?: string }>();
      data.forEach((row: any) => {
        const uid = String(row.user_id || 'usr_anonymous');
        const existing = countsMap.get(uid) || { count: 0, name: row.user_name || 'Explorer', avatar: row.user_avatar };
        existing.count += 1;
        countsMap.set(uid, existing);
      });

      const leaderboard = Array.from(countsMap.entries())
        .map(([userId, info]) => ({
          userId,
          name: info.name,
          avatar: info.avatar,
          checkinsCount: info.count
        }))
        .sort((a, b) => b.checkinsCount - a.checkinsCount);

      if (leaderboard.length === 0) {
        return { mayorCheckinsCount: 0, leaderboard: [] };
      }

      const top = leaderboard[0];
      return {
        mayorUserId: top.userId,
        mayorName: top.name,
        mayorAvatar: top.avatar,
        mayorCheckinsCount: top.checkinsCount,
        leaderboard
      };
    }
  } catch (err) {
    console.warn('Error fetching venue mayor state:', err);
  }

  return { mayorCheckinsCount: 0, leaderboard: [] };
}

/**
 * Computes the 5 canonical VibeQuest achievement badges for a user.
 */
export function getCanonicalVibeBadges(
  categoryBreakdown: Record<string, number> = {},
  uniquePlacesCount: number = 0
): VibeQuestBadgeDefinition[] {
  const foodCount = (categoryBreakdown['food'] || 0) + (categoryBreakdown['restaurant'] || 0) + (categoryBreakdown['cafe'] || 0) + (categoryBreakdown['cozy'] || 0);
  const gourmetCount = (categoryBreakdown['food'] || 0) + (categoryBreakdown['restaurant'] || 0) + (categoryBreakdown['chilled'] || 0);
  const nightCount = (categoryBreakdown['night'] || 0) + (categoryBreakdown['night owl'] || 0) + (categoryBreakdown['bar'] || 0) + (categoryBreakdown['hype'] || 0);
  const cultureCount = (categoryBreakdown['culture'] || 0) + (categoryBreakdown['art'] || 0) + (categoryBreakdown['quiet'] || 0) + (categoryBreakdown['museum'] || 0);

  return [
    {
      id: 'caffeine_fiend',
      title: 'Caffeine Fiend',
      icon: '☕',
      description: 'Complete 3 Cozy / Café / Bakery check-ins',
      targetCount: 3,
      currentCount: foodCount,
      isUnlocked: foodCount >= 3
    },
    {
      id: 'gourmet_scout',
      title: 'Gourmet Scout',
      icon: '🍽️',
      description: 'Complete 2 Chilled / Food / Restaurant check-ins',
      targetCount: 2,
      currentCount: gourmetCount,
      isUnlocked: gourmetCount >= 2
    },
    {
      id: 'night_mayor',
      title: 'Night Mayor',
      icon: '🌙',
      description: 'Complete 2 Nightlife / Bar / Hype check-ins',
      targetCount: 2,
      currentCount: nightCount,
      isUnlocked: nightCount >= 2
    },
    {
      id: 'culture_vulture',
      title: 'Culture Vulture',
      icon: '🏛️',
      description: 'Complete 2 Culture / Art / Quiet check-ins',
      targetCount: 2,
      currentCount: cultureCount,
      isUnlocked: cultureCount >= 2
    },
    {
      id: 'vibe_vanguard',
      title: 'Vibe Vanguard',
      icon: '🛡️',
      description: 'Check in at 5 distinct verified venues',
      targetCount: 5,
      currentCount: uniquePlacesCount,
      isUnlocked: uniquePlacesCount >= 5
    }
  ];
}
