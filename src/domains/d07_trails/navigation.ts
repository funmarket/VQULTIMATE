import type { CommunityTrail, TrailStop } from './types';

export type TrailTravelMode = 'walking' | 'driving' | 'transit' | 'best';
export type TrailRouteSegment = {
  url: string;
  from: string;
  to: string;
  stopCount: number;
};
export type TrailRoutePlan = {
  segments: TrailRouteSegment[];
  error?: string;
};

/**
 * Google Maps URLs can carry up to three intermediate waypoints in a mobile
 * browser; split longer itineraries into contiguous, user-selectable legs.
 * Transit has no intermediate waypoints, so each pair is a separate leg.
 * Every stop requires a creator-entered Google Maps address. Coordinates are
 * optional metadata; Google Maps resolves each entered address when opened.
 */
export function buildTrailRoutePlan(trail: CommunityTrail, mode: TrailTravelMode): TrailRoutePlan {
  const stops: TrailStop[] = trail.stops?.length
    ? trail.stops
    : (trail.waypoints || []);
  if (stops.length < 2) {
    return { segments: [], error: 'Add at least two located stops to open Google Maps directions.' };
  }
  const destination = (stop: TrailStop): string | null => {
    const address = stop.address?.trim();
    return address ? [address, trail.city].filter(Boolean).join(', ') : null;
  };
  for (const [index, stop] of stops.entries()) {
    if (!destination(stop)) {
      return {
        segments: [],
        error: `Stop ${index + 1} (${stop.name || 'unnamed'}) needs a Google Maps address.`,
      };
    }
  }

  const maxStopsPerSegment = mode === 'transit' ? 2 : 5;
  const result: TrailRouteSegment[] = [];
  let index = 0;
  while (index < stops.length - 1) {
    const end = Math.min(index + maxStopsPerSegment - 1, stops.length - 1);
    const segmentStops = stops.slice(index, end + 1);
    const first = segmentStops[0];
    const last = segmentStops[segmentStops.length - 1];
    const coord = (stop: TrailStop) => destination(stop)!;
    const query = new URLSearchParams({
      api: '1',
      origin: coord(first),
      destination: coord(last),
    });
    if (mode !== 'best') query.set('travelmode', mode);
    if (mode !== 'transit' && segmentStops.length > 2) {
      query.set('waypoints', segmentStops.slice(1, -1).map(coord).join('|'));
    }
    result.push({
      url: 'https://www.google.com/maps/dir/?' + query.toString(),
      from: first.name,
      to: last.name,
      stopCount: segmentStops.length,
    });
    index = end;
  }
  return { segments: result };
}
