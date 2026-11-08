/** D11 Flash Events only. Pure, timestamp-authoritative scheduling projection. */
export const UPCOMING_WINDOW_MS = 60 * 60 * 1000;

export function classifyFlashEvent(event, nowMs = Date.now()) {
  if (!event || event.status !== 'active') return 'ineligible';
  const start = Date.parse(event.starts_at);
  const end = Date.parse(event.ends_at);
  if (!Number.isFinite(nowMs) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'ineligible';
  if (end <= nowMs) return 'expired';
  if (start <= nowMs) return 'live';
  if (start <= nowMs + UPCOMING_WINDOW_MS) return 'upcoming';
  return 'scheduled';
}

export function summarizeFlashEvents(events, nowMs = Date.now()) {
  if (!Array.isArray(events)) throw new TypeError('Expected an event array');
  const counts = { upcoming: 0, live: 0, expired: 0, scheduled: 0, ineligible: 0 };
  for (const event of events) counts[classifyFlashEvent(event, nowMs)]++;
  return counts;
}
