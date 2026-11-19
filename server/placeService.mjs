/**
 * VibeQuest local demonstration adapter.
 * No Google page/image scraping, arbitrary URL proxying or credential access.
 * For a deployed app, move these methods behind its authenticated server/API.
 */

const SHORT_HOSTS = new Set(['share.google', 'maps.app.goo.gl', 'goo.gl', 'g.page']);
const SAFE_HOSTS = new Set([
  'share.google', 'maps.app.goo.gl', 'goo.gl', 'g.page',
  'google.com', 'google.fr', 'google.tn', 'google.co.uk',
  'google.de', 'google.es', 'google.it', 'google.ca', 'google.com.au',
  'google.co.in', 'google.com.br', 'google.co.jp',
  'openstreetmap.org', 'osm.org', 'tripadvisor.com', 'yelp.com',
]);
const memoryCache = new Map();
let lastPhotonCall = 0;
let photonQueue = Promise.resolve();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const okCoord = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const clean = (text, max = 250) => String(text || '').trim().replace(/\s+/g, ' ').slice(0, max);
const sourceHost = (host) => String(host || '').toLowerCase().replace(/^www\./, '');
const normalized = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const isGoogleHost = (host) => SAFE_HOSTS.has(host) && host.startsWith('google.');
const isAllowedHost = (host) => SAFE_HOSTS.has(host) ||
  (host.startsWith('maps.') && isGoogleHost(host.slice('maps.'.length)));

function decodeEntities(input) {
  return String(input || '').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function isOpaqueShareStub(urlInput) {
  try {
    const u = new URL(urlInput);
    const host = sourceHost(u.hostname);
    return isGoogleHost(host) && /^\/(?:share\.google|knowledgegraphshares)\/?$/i.test(u.pathname) &&
      /^[A-Za-z0-9_-]{8,}$/.test(u.searchParams.get('q') || '');
  } catch (_) { return false; }
}

function usefulTitle(raw) {
  const title = clean(decodeEntities(raw).replace(/\s*[-|·]\s*(?:Google Maps|Google Search|Google|Tripadvisor|Yelp)\s*$/i, ''), 170);
  if (title.length < 3 || title.length > 160 || /^(?:Google|Google Maps|Google Search|Share|Search|Before you continue(?: to Google)?|Avant de continuer|Error|404|Knowledge Graph|Untitled)$/i.test(title)) return '';
  if (/^(?:https?:\/\/|[A-Za-z0-9_-]{14,})$/.test(title)) return '';
  if (/^(?:Google Maps|Google Search|share\.google)\s*[:|-]/i.test(title)) return '';
  return title;
}

function unwrapGoogleConsent(input) {
  let current = String(input || '');
  for (let i = 0; i < 4; i++) {
    let u;
    try { u = new URL(decodeEntities(current)); } catch (_) { break; }
    if (sourceHost(u.hostname) !== 'consent.google.com' && !isAllowedHost(sourceHost(u.hostname))) break;
    const nested = ['continue', 'url', 'u', 'target'].map(k => u.searchParams.get(k)).find(Boolean);
    if (!nested || !/^https:\/\//i.test(nested)) break;
    current = nested;
  }
  return current;
}

export function checkedSourceUrl(input) {
  const url = new URL(input);
  const host = sourceHost(url.hostname);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !isAllowedHost(host)) {
    throw new Error('This demo accepts HTTPS links from Google Maps, OpenStreetMap, Tripadvisor and Yelp only. You can also type a place name.');
  }
  return url;
}

export function coordinatesFromMapUrl(url) {
  const direct = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (direct && okCoord(+direct[1], +direct[2])) return { lat: +direct[1], lng: +direct[2], source: 'place' };
  try {
    const parsed = new URL(url);
    for (const key of ['q', 'query', 'll']) {
      const match = (parsed.searchParams.get(key) || '').match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
      if (match && okCoord(+match[1], +match[2])) return { lat: +match[1], lng: +match[2], source: 'coordinate-query' };
    }
    const center = (parsed.pathname + parsed.hash).match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
      parsed.hash.match(/(?:^|#)map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
    if (center && okCoord(+center[1], +center[2])) return { lat: +center[1], lng: +center[2], source: 'camera-only' };
  } catch (_) { /* input may be text */ }
  return null;
}

export function parsePlaceInput(raw) {
  const input = clean(raw, 2048);
  if (!input) throw new Error('Paste a place link or type a place name.');
  if (!/^https?:\/\//i.test(input)) {
    // A mobile share sheet can copy "Place name\nhttps://share.google/…".
    // Inspect the embedded HTTPS URL BEFORE rejecting the entire pasted text.
    const link = input.match(/https:\/\/[^\s<>"']+/i);
    if (link) {
      const parsed = parsePlaceInput(link[0].replace(/[.,;!?]+$/, ''));
      const pastedLabel = usefulTitle(input.slice(0, link.index).replace(/[\s\-–:]+$/, ''));
      return { ...parsed, pastedLabel };
    }
    if (input.includes('://')) throw new Error('Only HTTPS links are supported.');
    return { input, sourceUrl: '', title: input, coordinates: null, osmRef: null, short: false, locationOnly: false };
  }
  const url = checkedSourceUrl(unwrapGoogleConsent(input));
  const host = sourceHost(url.hostname);
  const refMatch = url.pathname.match(/^\/(node|way|relation)\/(\d+)(?:\/?$)/);
  const osmRef = (host === 'openstreetmap.org' || host === 'osm.org') && refMatch
    ? { type: refMatch[1], id: refMatch[2] } : null;
  const qs = ['q', 'query', 'destination', 'query_place_id'].map(k => url.searchParams.get(k)).find(Boolean);
  const pathPlace = url.pathname.match(/\/maps\/(?:place|search)\/([^/@?]+)/i);
  const yelp = url.pathname.match(/\/biz\/([^/?#]+)/);
  const trip = url.pathname.match(/-Reviews-([^-]+)-([^.?]+)/);
  const opaqueGoogleToken = isOpaqueShareStub(url.href);
  let title = qs && !opaqueGoogleToken && !/^[-+\d.,\s]+$/.test(qs) && !qs.startsWith('ChIJ') ? qs : '';
  if (!title && pathPlace) title = pathPlace[1];
  if (!title && yelp) title = yelp[1].replace(/-/g, ' ');
  if (!title && trip) title = `${trip[1]} ${trip[2]}`.replace(/_/g, ' ');
  try { title = decodeURIComponent(title.replace(/\+/g, ' ')); } catch { /* leave text as is */ }
  title = usefulTitle(title);
  const coordinates = coordinatesFromMapUrl(url.href);
  return { input, sourceUrl: url.href, title, coordinates, osmRef, short: SHORT_HOSTS.has(host), locationOnly: !title && Boolean(coordinates) };
}

export function normalizePhotonFeature(f) {
  const props = f?.properties || {};
  const [lng, lat] = f?.geometry?.coordinates || [];
  const type = { N: 'node', W: 'way', R: 'relation' }[String(props.osm_type || '').toUpperCase()];
  const id = Number(props.osm_id);
  if (!type || !Number.isSafeInteger(id) || id <= 0 || !okCoord(+lat, +lng)) return null;
  const title = clean(props.name || props.street || props.city || props.district || 'Unnamed location');
  const address = [props.housenumber && props.street ? `${props.housenumber} ${props.street}` : props.street,
    props.district, props.city, props.state, props.country].filter(Boolean);
  return {
    osmRef: { type, id: String(id) }, osmUrl: `https://www.openstreetmap.org/${type}/${id}`,
    title, lat: +lat, lng: +lng, address: [...new Set(address)].join(', ') || title,
    kind: clean(props.osm_value || props.osm_key || 'place', 100),
    city: clean(props.city || props.district || props.state || '', 120),
    country: clean(props.country || '', 120)
  };
}

function cacheValue(key, ms, factory) {
  const c = memoryCache.get(key);
  if (c && Date.now() < c.expiresAt) return c.promise;
  const promise = Promise.resolve().then(factory).catch((e) => { memoryCache.delete(key); throw e; });
  memoryCache.set(key, { promise, expiresAt: Date.now() + ms });
  if (memoryCache.size > 350) memoryCache.delete(memoryCache.keys().next().value);
  return promise;
}

async function fetchJson(url, timeout = 9000) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'VibeQuest-Place-Demo/1.0 (local prototype; OSM source attribution)' },
    signal: AbortSignal.timeout(timeout), redirect: 'error'
  });
  if (!res.ok) throw new Error(`Data provider returned ${res.status}`);
  return res.json();
}

async function expandShortLink(urlInput) {
  let current = checkedSourceUrl(urlInput);
  for (let i = 0; i < 5; i++) {
    if (!SHORT_HOSTS.has(sourceHost(current.hostname)) && i > 0) break;
    let res;
    try {
      res = await fetch(current.href, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(6000) });
      if (!res.headers.get('location') && (res.status === 405 || res.status === 200)) {
        res = await fetch(current.href, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(6000) });
      }
    } catch (_) { break; }
    const location = res.headers.get('location');
    if (!location) break;
    let next;
    try { next = checkedSourceUrl(new URL(location, current).href); } catch (_) { break; }
    if (next.href === current.href) break;
    current = next;
  }
  return current.href;
}

// Restore the original link-identity recovery chain. This extracts place
// names/links only; imagery is still resolved independently from OSM/Commons.
// User input is allowlisted before being forwarded to metadata services.
function titleFromHtml(rawHtml) {
  const html = String(rawHtml || '').slice(0, 150_000);
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!['og:title', 'twitter:title', 'title'].includes(String(key || '').toLowerCase())) continue;
    const value = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    const title = usefulTitle(value);
    if (title) return title;
  }
  for (const block of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      const queue = Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data]);
      for (const entry of queue) {
        if (entry && typeof entry === 'object' && typeof entry.name === 'string' && entry['@type']) {
          const title = usefulTitle(entry.name);
          if (title) return title;
        }
      }
    } catch (_) { /* malformed JSON-LD is not location evidence */ }
  }
  return usefulTitle(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
}

function namedGoogleMapsUrl(raw) {
  if (!raw) return null;
  const body = decodeEntities(String(raw).slice(0, 150_000))
    .replace(/\\u0026/gi, '&').replace(/\\\//g, '/');
  const search = [body];
  try { search.push(decodeURIComponent(body)); } catch (_) { /* not URL encoded */ }
  for (const text of search) {
    const matches = text.match(/https:\/\/[^\s"'<>\\]+/gi) || [];
    for (const candidate of matches.slice(0, 30)) {
      try {
        const url = checkedSourceUrl(unwrapGoogleConsent(candidate.replace(/[),.;]+$/, '')));
        if (!/\/maps\/(?:place|search)\//i.test(url.pathname)) continue;
        if (parsePlaceInput(url.href).title) return url.href;
      } catch (_) { /* ignore untrusted or malformed embedded links */ }
    }
  }
  return null;
}

async function sourceJson(url, timeout = 6500) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeout) });
    return res.ok ? await res.json() : null;
  } catch (_) { return null; }
}

async function sourceText(url, timeout = 6500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    return res.ok ? String(await res.text()).slice(0, 150_000) : '';
  } catch (_) { return ''; }
}

async function recoverSharedPlaceName(originalUrl) {
  // Run only on URLs validated by checkedSourceUrl(); never fetch arbitrary
  // user-supplied hosts and never accept an opaque Google token as a title.
  const source = checkedSourceUrl(originalUrl).href;
  const fromSource = (maybeUrl, maybeTitle, html = '') => {
    const nestedUrl = namedGoogleMapsUrl(html) || namedGoogleMapsUrl(maybeUrl);
    if (nestedUrl) {
      const named = parsePlaceInput(nestedUrl);
      return { title: named.title, resolvedUrl: nestedUrl, coordinates: named.coordinates };
    }
    try {
      const destination = checkedSourceUrl(unwrapGoogleConsent(maybeUrl));
      const named = parsePlaceInput(destination.href);
      if (named.title) return { title: named.title, resolvedUrl: destination.href, coordinates: named.coordinates };
    } catch (_) { /* source may be a generic stub */ }
    const title = usefulTitle(maybeTitle) || titleFromHtml(html);
    return title ? { title, resolvedUrl: '', coordinates: null } : null;
  };

  // First restore the original AllOrigins redirect/page metadata lookup.
  const allOrigins = await sourceJson(`https://api.allorigins.win/get?url=${encodeURIComponent(source)}`);
  const first = fromSource(allOrigins?.status?.url, '', allOrigins?.contents || '');
  if (first) return first;

  // Next restore the original Microlink metadata/redirect fallback.
  const microlink = await sourceJson(`https://api.microlink.io/?url=${encodeURIComponent(source)}`);
  const second = microlink?.status === 'success'
    ? fromSource(microlink.data?.url, microlink.data?.title, microlink.data?.description || '') : null;
  if (second) return second;

  // Restore the original Jina Reader and Codetabs text recovery paths.
  const jina = await sourceJson(`https://r.jina.ai/${source}`, 7000);
  const third = fromSource(jina?.data?.url, jina?.data?.title,
    typeof jina?.data?.content === 'string' ? jina.data.content : '');
  if (third) return third;
  const raw = await sourceText(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(source)}`);
  return fromSource('', '', raw);
}

async function photonSearch(title, hint, coordinates) {
  const query = clean(`${title} ${hint}`, 220);
  if (!query) return [];
  return cacheValue(`photon:${normalized(query)}:${coordinates?.source === 'place' ? `${coordinates.lat},${coordinates.lng}` : ''}`, 10 * 60 * 1000, () => {
    const task = photonQueue.then(async () => {
      const interval = Date.now() - lastPhotonCall;
      if (interval < 1100) await delay(1100 - interval);
      lastPhotonCall = Date.now();
      const url = new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', '8');
      url.searchParams.set('lang', 'en');
      if (coordinates && coordinates.source !== 'camera-only') {
        url.searchParams.set('lat', String(coordinates.lat));
        url.searchParams.set('lon', String(coordinates.lng));
      }
      const data = await fetchJson(url.toString());
      const candidates = (data.features || []).map(normalizePhotonFeature).filter(Boolean);
      const seen = new Set();
      return candidates.filter((c) => { const k = `${c.osmRef.type}/${c.osmRef.id}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .map(candidate => ({ ...candidate, matchWarning: candidateKindWarning(title, candidate) }))
        .sort((a, b) => scoreCandidate(b, title, coordinates) - scoreCandidate(a, title, coordinates));
    });
    photonQueue = task.catch(() => {});
    return task;
  });
}

// OSM contains separate POIs with overlapping names. Treat a conflicting
// explicit restaurant/café type as a warning, not as a verified identity.
function candidateKindWarning(query, candidate) {
  const wanted = normalized(query);
  const found = normalized(`${candidate.title} ${candidate.kind}`);
  const wantRestaurant = /\b(?:restaurant|resto|ristorante)\b|مطعم/u.test(wanted);
  const wantCafe = /\b(?:cafe|coffee|cafeteria)\b|مقهى|قهوة/u.test(wanted);
  const isRestaurant = /\b(?:restaurant|resto|ristorante)\b|مطعم/u.test(found);
  const isCafe = /\b(?:cafe|coffee|cafeteria)\b|مقهى|قهوة/u.test(found);
  if (wantRestaurant && isCafe && !isRestaurant) {
    return 'You searched for a restaurant, but this OSM result is a café. It may be a different business.';
  }
  if (wantCafe && isRestaurant && !isCafe) {
    return 'You searched for a café, but this OSM result is a restaurant. It may be a different business.';
  }
  return null;
}

function scoreCandidate(candidate, title, center) {
  const queryTokens = normalized(title).split(' ').filter(t => t.length > 2);
  const result = normalized(candidate.title);
  const overlap = queryTokens.length ? queryTokens.filter(t => result.includes(t)).length / queryTokens.length : 0;
  let score = overlap * 10 + (result === normalized(title) ? 10 : 0);
  // Do not rank a café ahead of the requested restaurant solely because
  // their names contain the same family/business word.
  if (candidate.matchWarning) score -= 14;
  if (center && center.source !== 'camera-only') {
    const dlat = (center.lat - candidate.lat) * 111;
    const dlng = (center.lng - candidate.lng) * 111 * Math.cos(candidate.lat * Math.PI / 180);
    const km = Math.hypot(dlat, dlng);
    score += Math.max(0, 7 - km / 2);
  }
  return score;
}

function validRef(ref) {
  const type = String(ref?.type || '');
  const id = String(ref?.id || '');
  if (!['node', 'way', 'relation'].includes(type) || !/^\d{1,16}$/.test(id)) throw new Error('Invalid OpenStreetMap place reference.');
  return { type, id };
}

export async function getOsmElement(ref) {
  const r = validRef(ref);
  return cacheValue(`osm:${r.type}:${r.id}`, 60 * 60 * 1000, async () => {
    const raw = await fetchJson(`https://api.openstreetmap.org/api/0.6/${r.type}/${r.id}.json`);
    const e = (raw.elements || []).find(v => v.type === r.type && String(v.id) === r.id);
    if (!e) throw new Error('That OpenStreetMap object is no longer available.');
    return e;
  });
}

async function centerForOsmObject(ref, element) {
  if (okCoord(element.lat, element.lon)) return { lat: element.lat, lng: element.lon };
  // Ways usually describe a building/polygon rather than a point. Use its
  // member nodes only as a starting pin; user must inspect the position.
  if (ref.type !== 'way') return null;
  try {
    const full = await fetchJson(`https://api.openstreetmap.org/api/0.6/way/${ref.id}/full.json`);
    const referenced = new Set(element.nodes || []);
    const nodes = (full.elements || []).filter(n => n.type === 'node' && referenced.has(n.id) && okCoord(n.lat, n.lon));
    if (!nodes.length) return null;
    return { lat: (Math.min(...nodes.map(n => n.lat)) + Math.max(...nodes.map(n => n.lat))) / 2,
      lng: (Math.min(...nodes.map(n => n.lon)) + Math.max(...nodes.map(n => n.lon))) / 2 };
  } catch (_) { return null; }
}

export function commonsFileFromTags(tags = {}) {
  const raw = clean(tags.wikimedia_commons || tags.image || '', 500);
  let file = raw;
  if (/^https:\/\/commons\.wikimedia\.org\/wiki\//.test(raw)) {
    file = raw.slice(raw.indexOf('/wiki/') + 6);
    try { file = decodeURIComponent(file); } catch (_) { return null; }
  }
  if (!/^File:/i.test(file)) return null;
  if (/\u0000|\?|#/.test(file)) return null;
  return file.replace(/^File:/i, 'File:').replace(/_/g, ' ').slice(0, 250);
}

const stripHtml = text => clean(String(text || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), 300);
function licensedCommonsPhoto(page) {
  const info = page?.imageinfo?.[0];
  if (!info?.url || !/^https:\/\/upload\.wikimedia\.org\//.test(info.url)) return null;
  const meta = info.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value || '');
  if (!/^(CC BY(?:-SA)?(?: \d(?:\.\d)?)?|CC0(?: \d(?:\.\d)?)?|Public domain|PD(?:-|$))/i.test(license)) return null;
  return {
    url: info.thumburl || info.url, originalUrl: info.url, title: clean(page.title || '', 255),
    credit: stripHtml(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'),
    license, licenseUrl: meta.LicenseUrl?.value?.startsWith('https://') ? meta.LicenseUrl.value : '',
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    source: 'Wikimedia Commons'
  };
}

async function getCommonsFile(file) {
  const uri = new URL('https://commons.wikimedia.org/w/api.php');
  uri.searchParams.set('action', 'query');
  uri.searchParams.set('prop', 'imageinfo');
  uri.searchParams.set('iiprop', 'url|extmetadata');
  uri.searchParams.set('iiurlwidth', '1000');
  uri.searchParams.set('titles', file);
  uri.searchParams.set('format', 'json');
  const raw = await cacheValue(`commons:${file}`, 30 * 60 * 1000, () => fetchJson(uri.toString(), 10000));
  return Object.values(raw.query?.pages || {}).map(licensedCommonsPhoto).find(Boolean) || null;
}

// Some exact OSM features point to a Wikidata item rather than carrying
// wikimedia_commons=File:* directly. P18 is a photo of that item, not an
// arbitrary name-search result, but the file's reuse license must still be
// checked through the Wikimedia Commons imageinfo endpoint.
async function getWikidataLinkedMedia(id) {
  if (!/^Q[1-9]\d{0,11}$/.test(String(id || ''))) return null;
  return cacheValue(`wikidata:${id}`, 60 * 60 * 1000, async () => {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action', 'wbgetentities');
    url.searchParams.set('ids', id);
    url.searchParams.set('props', 'claims|descriptions');
    url.searchParams.set('languages', 'en|fr|ar');
    url.searchParams.set('format', 'json');
    const raw = await fetchJson(url.toString(), 9000);
    const entity = raw.entities?.[id];
    if (!entity || entity.missing !== undefined) return null;
    const imageName = entity.claims?.P18?.map(v => v?.mainsnak?.datavalue?.value)
      .find(value => typeof value === 'string' && value.trim().length > 0);
    const file = imageName ? commonsFileFromTags({ wikimedia_commons: `File:${imageName}` }) : null;
    const description = clean(entity.descriptions?.en?.value || entity.descriptions?.fr?.value ||
      entity.descriptions?.ar?.value || '', 400);
    return { file, description };
  });
}

export async function getPlaceDetails(ref, fallback = {}) {
  const r = validRef(ref);
  const element = await getOsmElement(r);
  const t = element.tags || {};
  const center = await centerForOsmObject(r, element);

  // OSM POIs vary widely in completeness. Return only fields on the selected
  // OSM object (or the link's confirmed Wikidata item), never guessed listing
  // details, arbitrary Google photos or unverified Commons search results.
  const street = clean([t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), 170);
  const constructedAddress = [street, t['addr:suburb'], t['addr:city'], t['addr:postcode'],
    t['addr:country']].filter(Boolean).join(', ');
  const address = clean(t['addr:full'] || constructedAddress || fallback.address || '', 400);
  const wikidataId = /^Q[1-9]\d{0,11}$/.test(String(t.wikidata || '')) ? String(t.wikidata) : '';
  let linkedData = null;
  if (wikidataId) {
    try { linkedData = await getWikidataLinkedMedia(wikidataId); }
    catch (_) { /* optional Wikidata lookup cannot suppress OSM details */ }
  }

  let photo = null;
  let photoSource = 'no-licensed-photo';
  const commonsFile = commonsFileFromTags(t);
  if (commonsFile) {
    try { photo = await getCommonsFile(commonsFile); } catch (_) { /* continue to another verified source */ }
    if (photo) photoSource = 'osm-commons-tag';
  }
  if (!photo && linkedData?.file) {
    try { photo = await getCommonsFile(linkedData.file); } catch (_) { /* optional photo remains missing */ }
    if (photo) photoSource = 'wikidata-p18';
  }

  const candidateWebsite = t.website || t['contact:website'] || '';
  const website = /^https?:\/\//.test(candidateWebsite) ? candidateWebsite.slice(0, 400) : null;
  const osmDescription = clean(t.description || t['description:en'] || '', 550);
  const description = osmDescription || clean(linkedData?.description || '', 400);
  return {
    title: clean(t.name || t['name:en'] || fallback.title || 'Unnamed place'),
    address,
    lat: center?.lat ?? fallback.lat,
    lng: center?.lng ?? fallback.lng,
    kind: clean(t.tourism || t.amenity || t.leisure || t.historic || t.shop || fallback.kind || 'place'),
    description,
    descriptionSource: osmDescription ? 'OpenStreetMap' : (description ? 'Wikidata' : ''),
    phone: clean(t.phone || t['contact:phone'] || '', 110),
    website,
    openingHours: clean(t.opening_hours || '', 220),
    cuisine: clean(t.cuisine || '', 200),
    wheelchair: clean(t.wheelchair || '', 60),
    outdoorSeating: clean(t.outdoor_seating || '', 60),
    wikipedia: clean(t.wikipedia || '', 200),
    wikidata: wikidataId,
    photo,
    photoSource,
    approximateCenter: r.type === 'way',
    osmRef: r,
    osmUrl: `https://www.openstreetmap.org/${r.type}/${r.id}`,
    attribution: '© OpenStreetMap contributors (ODbL)'
  };
}

export async function searchCommonsImages(query) {
  const q = clean(query, 160);
  if (q.length < 3) throw new Error('Enter a place name to search for photos.');
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `${q} filetype:bitmap`);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', '9');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|extmetadata');
  url.searchParams.set('iiurlwidth', '600');
  url.searchParams.set('format', 'json');
  const raw = await cacheValue(`photo-search:${normalized(q)}`, 20 * 60 * 1000, () => fetchJson(url.toString(), 10000));
  return Object.values(raw.query?.pages || {}).map(licensedCommonsPhoto).filter(Boolean).slice(0, 6);
}

export async function resolvePlaceInput(input, hint = '') {
  let parsed = parsePlaceInput(input);
  let resolvedUrl = parsed.sourceUrl;
  if (parsed.short) {
    resolvedUrl = await expandShortLink(parsed.sourceUrl);
    try {
      const result = parsePlaceInput(resolvedUrl);
      if (result.title || result.osmRef || result.coordinates) {
        parsed = { ...result, sourceUrl: parsed.sourceUrl };
      }
    } catch (_) { /* short link remains unresolved */ }
  }
  if (parsed.osmRef) {
    const details = await getPlaceDetails(parsed.osmRef);
    return { sourceUrl: parsed.sourceUrl, resolvedUrl, query: details.title, hint, directPlace: details,
      candidates: [{ ...details, osmRef: parsed.osmRef, kind: details.kind }], needsName: false,
      notice: 'This link identifies an exact OpenStreetMap object. Confirm its details before pinning.' };
  }
  // An embedded share-sheet place label is already a useful search name.
  // Otherwise use the original metadata fallbacks before asking for manual input.
  if (!parsed.title && parsed.pastedLabel) parsed = { ...parsed, title: parsed.pastedLabel };
  if (!parsed.title && parsed.sourceUrl) {
    const recovered = await recoverSharedPlaceName(parsed.sourceUrl);
    if (recovered?.title) {
      parsed = { ...parsed, title: recovered.title,
        coordinates: recovered.coordinates || parsed.coordinates };
      if (recovered.resolvedUrl) resolvedUrl = recovered.resolvedUrl;
    }
  }
  if (!parsed.title) {
    return { sourceUrl: parsed.sourceUrl, resolvedUrl, query: '', hint, candidates: [], needsName: true,
      notice: parsed.locationOnly
        ? 'The link identifies a map position, not a business name. Enter the place name to search OpenStreetMap.'
        : 'This short link did not expose a readable place name. Type the place name and city; no location was guessed.' };
  }
  const candidates = await photonSearch(parsed.title, clean(hint, 100), parsed.coordinates);
  return {
    sourceUrl: parsed.sourceUrl, resolvedUrl, query: parsed.title, hint, candidates, needsName: false,
    notice: candidates.length ? 'Select the correct OpenStreetMap match. Similar names may represent different places.'
      : 'No OpenStreetMap match found. Try a more precise place name/city, or use the manual pin.'
  };
}
