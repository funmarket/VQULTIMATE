import { supabase } from '../../lib/supabase';

export interface UserSearchHistory {
  searchQueries: string[];
  categoryClicks: Record<string, number>;
  checkedInCategories: Record<string, number>;
  queries?: string[];
  categoriesClicked?: Record<string, number>;
  checkedInPlaces?: string[];
}

export function getSearchHistory(): UserSearchHistory {
  return {
    searchQueries: [],
    categoryClicks: {},
    checkedInCategories: {},
    queries: [],
    categoriesClicked: {},
    checkedInPlaces: [],
  };
}

export async function saveSearchHistory(_history: UserSearchHistory): Promise<void> {
  // Handled via server-side user_search_signals table
}

export async function recordSearchQuery(query: string): Promise<void> {
  if (!query || query.trim().length < 2) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    await supabase.from('user_search_signals').insert({
      user_id: userId,
      signal_type: 'query',
      signal_value: query.trim().toLowerCase(),
    });
  } catch {
    // Non-blocking telemetry
  }
}

export async function recordCategoryClick(category: string): Promise<void> {
  if (!category || category === 'All') return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    await supabase.from('user_search_signals').insert({
      user_id: userId,
      signal_type: 'category',
      signal_value: category,
    });
  } catch {
    // Non-blocking telemetry
  }
}

export async function recordCheckinHistory(placeName: string, category: string): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    await supabase.from('user_search_signals').insert({
      user_id: userId,
      signal_type: 'checkin',
      signal_value: `${placeName}:${category}`,
    });
  } catch {
    // Non-blocking telemetry
  }
}
