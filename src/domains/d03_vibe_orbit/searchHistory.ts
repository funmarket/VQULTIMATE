/**
 * Search History & Interaction Signals Tracker
 * Stores and reads the user's real category affinities, recent search queries, and in-app check-ins.
 */

export interface UserSearchHistory {
  searchQueries: string[];
  categoryClicks: Record<string, number>;
  checkedInPlaceIds: string[];
  checkedInCategories: Record<string, number>;
}

const STORAGE_KEY = 'vq_user_search_history';

const DEFAULT_HISTORY: UserSearchHistory = {
  searchQueries: [],
  categoryClicks: {},
  checkedInPlaceIds: [],
  checkedInCategories: {}
};

export function getSearchHistory(): UserSearchHistory {
  if (typeof window === 'undefined') return DEFAULT_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HISTORY;
    const parsed = JSON.parse(raw);
    return {
      searchQueries: Array.isArray(parsed?.searchQueries) ? parsed.searchQueries : [],
      categoryClicks: typeof parsed?.categoryClicks === 'object' && parsed.categoryClicks !== null ? parsed.categoryClicks : {},
      checkedInPlaceIds: Array.isArray(parsed?.checkedInPlaceIds) ? parsed.checkedInPlaceIds : [],
      checkedInCategories: typeof parsed?.checkedInCategories === 'object' && parsed.checkedInCategories !== null ? parsed.checkedInCategories : {}
    };
  } catch {
    return DEFAULT_HISTORY;
  }
}

export function saveSearchHistory(history: UserSearchHistory): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn('Failed to save search history to localStorage:', err);
  }
}

export function recordSearchQuery(query: string): void {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 2) return;
  const history = getSearchHistory();
  const filtered = history.searchQueries.filter(q => q !== clean);
  filtered.unshift(clean);
  history.searchQueries = filtered.slice(0, 20); // Keep 20 most recent
  saveSearchHistory(history);
}

export function recordCategoryClick(category: string): void {
  if (!category || category === 'All') return;
  const history = getSearchHistory();
  history.categoryClicks[category] = (history.categoryClicks[category] || 0) + 1;
  saveSearchHistory(history);
}

export function recordCheckinHistory(placeId: string, category: string): void {
  const history = getSearchHistory();
  if (!history.checkedInPlaceIds.includes(placeId)) {
    history.checkedInPlaceIds.push(placeId);
  }
  if (category) {
    history.checkedInCategories[category] = (history.checkedInCategories[category] || 0) + 1;
  }
  saveSearchHistory(history);
}
