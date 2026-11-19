/** D05 read-only transport for the original, unchanged ZIP's place resolver. */
export type OsmRef = { type: 'node'|'way'|'relation'; id: string };
export type LicensedPhoto = { url: string; credit: string; license: string; licenseUrl: string; pageUrl: string; source: string; title?: string };
export type OSMCandidate = { osmRef: OsmRef; osmUrl: string; title: string; lat: number; lng: number; address: string; kind: string; matchWarning?: string | null };
export type OSMDetails = OSMCandidate & { description?: string; phone?: string; website?: string|null; photo?: LicensedPhoto|null; attribution?: string; approximateCenter?: boolean };
export type ResolveResult = { sourceUrl: string; resolvedUrl: string; query: string; hint: string; needsName: boolean; candidates: OSMCandidate[]; directPlace?: OSMDetails; notice: string };

async function callPlaceApi<T>(action: 'resolve'|'details'|'photos', body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/places/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  let payload: any;
  try { payload = await response.json(); } catch { throw new Error(`Venue resolver responded with invalid data (${response.status})`); }
  if (!response.ok || payload?.error) throw new Error(payload?.error || `Venue provider unavailable (${response.status})`);
  return payload as T;
}

export function resolvePlaceLink(input: string, hint = '', fallbackName = ''): Promise<ResolveResult> {
  // The original ZIP accepts mobile share-sheet labels before embedded HTTPS links.
  // No changes to the backend name/URL parsing or its opaque-link recovery algorithm.
  const labeledInput = fallbackName.trim() && /^https:\/\//i.test(input.trim())
    ? `${fallbackName.trim()}\n${input.trim()}` : input;
  return callPlaceApi('resolve', { input: labeledInput, hint });
}
export function readOsmPlaceDetails(osmRef: OsmRef, fallback?: OSMCandidate): Promise<OSMDetails> {
  return callPlaceApi('details', { osmRef, fallback });
}
export function searchLicensedPlacePhotos(query: string): Promise<{ photos: LicensedPhoto[] }> {
  return callPlaceApi('photos', { query });
}
