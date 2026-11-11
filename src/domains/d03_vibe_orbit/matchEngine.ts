/**
 * Deterministic AI Vibe Match Scoring Engine
 * Computes genuine compatibility between a VibePlace and the user's real profile,
 * hobbies, search queries, category habits, and physical proximity.
 */

import { VibePlace } from './types';
import { UserProfile } from '../d01_auth';
import { UserSearchHistory, getSearchHistory } from './searchHistory';

export interface MatchBreakdownRow {
  label: string;
  delta: string;
  points: number;
}

export interface MatchScoreResult {
  score: number;
  breakdown: MatchBreakdownRow[];
}

export function computeAiVibeMatch(
  place: VibePlace,
  user: UserProfile | null,
  historyInput?: UserSearchHistory,
  savedTrailCount: number = 0
): MatchScoreResult {
  const history = historyInput || getSearchHistory();
  const breakdown: MatchBreakdownRow[] = [];
  let totalScore = 0;

  // 1. FACTOR 1: Profile Interests & Hobbies Alignment (Max 35 pts)
  const userInterests = (user?.interests || []).map(i => i.trim().toLowerCase()).filter(Boolean);
  const placeTokens = [
    place.category.toLowerCase(),
    ...place.title.toLowerCase().split(/\s+/),
    ...(place.address || '').toLowerCase().split(/\s+/)
  ];

  const matchedInterests: string[] = [];
  userInterests.forEach(interest => {
    if (
      placeTokens.some(token => token.includes(interest) || interest.includes(token)) ||
      (interest.includes('coffee') && (place.category === 'Food' || place.title.toLowerCase().includes('café') || place.title.toLowerCase().includes('cafe'))) ||
      (interest.includes('art') && (place.category === 'Art' || place.category === 'Culture')) ||
      (interest.includes('night') && place.category === 'Night Owl') ||
      (interest.includes('food') && place.category === 'Food') ||
      (interest.includes('culture') && place.category === 'Culture')
    ) {
      matchedInterests.push(interest);
    }
  });

  if (matchedInterests.length > 0) {
    const interestPoints = Math.min(35, 18 + (matchedInterests.length - 1) * 8);
    totalScore += interestPoints;
    breakdown.push({
      label: `Interest Alignment (${matchedInterests.slice(0, 2).join(', ')})`,
      delta: `+${interestPoints}%`,
      points: interestPoints
    });
  } else if (userInterests.length > 0) {
    // User has interests, but no direct keyword hit for this place
    totalScore += 12;
    breakdown.push({
      label: 'Interest Alignment (Curated District Sync)',
      delta: '+12%',
      points: 12
    });
  } else {
    // Unauthenticated or profile without interests configured
    totalScore += 10;
    breakdown.push({
      label: 'Interest Alignment (Baseline Discovery)',
      delta: '+10%',
      points: 10
    });
  }

  // 2. FACTOR 2: Search History & Category Habit Affinity (Max 30 pts)
  const categoryClicks = history.categoryClicks[place.category] || 0;
  const categoryCheckins = history.checkedInCategories[place.category] || 0;
  const recentSearches = history.searchQueries;

  let searchResonance = false;
  if (recentSearches.length > 0) {
    searchResonance = recentSearches.some(query =>
      place.title.toLowerCase().includes(query) || place.category.toLowerCase().includes(query)
    );
  }

  let habitPoints = 0;
  if (searchResonance) {
    habitPoints = Math.min(28, 16 + Math.min(12, categoryClicks * 2));
    totalScore += habitPoints;
    breakdown.push({
      label: `Search History & Habit Resonance (${place.category})`,
      delta: `+${habitPoints}%`,
      points: habitPoints
    });
  } else if (categoryClicks > 0 || categoryCheckins > 0) {
    habitPoints = Math.min(22, 10 + categoryClicks * 2 + categoryCheckins * 4);
    totalScore += habitPoints;
    breakdown.push({
      label: `Category Habit Affinity (${place.category} Explorer)`,
      delta: `+${habitPoints}%`,
      points: habitPoints
    });
  } else if (savedTrailCount > 0) {
    habitPoints = Math.min(15, 8 + savedTrailCount * 2);
    totalScore += habitPoints;
    breakdown.push({
      label: 'Curated Trail Trailhead Alignment',
      delta: `+${habitPoints}%`,
      points: habitPoints
    });
  } else {
    habitPoints = 8;
    totalScore += habitPoints;
    breakdown.push({
      label: 'Stable Base Signal',
      delta: '+8%',
      points: habitPoints
    });
  }

  // 3. FACTOR 3: Proximity & Local District Sync (Max 20 pts)
  let proximityPoints = 6;
  let proximityLabel = 'Local City Orbit';
  const distKm = place.distance_km ?? (place.distance_meters !== undefined ? place.distance_meters / 1000 : undefined);

  if (distKm !== undefined) {
    if (distKm <= 1.2) {
      proximityPoints = 20;
      proximityLabel = 'Walking Proximity (< 1.2 km)';
    } else if (distKm <= 3.5) {
      proximityPoints = 15;
      proximityLabel = 'Neighborhood Radius (< 3.5 km)';
    } else if (distKm <= 8.0) {
      proximityPoints = 10;
      proximityLabel = 'District Orbit Scope (< 8 km)';
    } else {
      proximityPoints = 5;
      proximityLabel = 'Regional Leisure Range';
    }
  }
  totalScore += proximityPoints;
  breakdown.push({
    label: proximityLabel,
    delta: `+${proximityPoints}%`,
    points: proximityPoints
  });

  // 4. FACTOR 4: Quality & Community Crowd Signal (Max 15 pts)
  let crowdPoints = 5;
  const rating = place.rating;
  if (rating !== undefined && rating >= 4.6) {
    crowdPoints = 13;
  } else if (rating !== undefined && rating >= 4.2) {
    crowdPoints = 10;
  } else if (rating !== undefined && rating >= 3.8) {
    crowdPoints = 7;
  }

  if (place.open_now === true) {
    crowdPoints = Math.min(15, crowdPoints + 2);
  }

  totalScore += crowdPoints;
  breakdown.push({
    label: rating ? `Community Quality Rating (★${rating.toFixed(1)})` : 'Verified Spot Signal',
    delta: `+${crowdPoints}%`,
    points: crowdPoints
  });

  // Clamp total between 25% and 98%
  const finalScore = Math.min(98, Math.max(25, totalScore));

  return {
    score: finalScore,
    breakdown
  };
}
