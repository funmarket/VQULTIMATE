import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaceInput, coordinatesFromMapUrl, checkedSourceUrl, normalizePhotonFeature, commonsFileFromTags } from '../server/placeService.mjs';

test('recognizes an exact OSM element (not just map center)', () => {
  const p = parsePlaceInput('https://www.openstreetmap.org/way/12345');
  assert.deepEqual(p.osmRef, { type: 'way', id: '12345' });
  assert.equal(p.title, '');
});

test('parses Google Maps place name and a place coordinate without camera confusion', () => {
  const p = parsePlaceInput('https://www.google.com/maps/place/Bardo+National+Museum/@36.8,10.1,14z/data=!3m1!4b1!3d36.8091!4d10.1353');
  assert.equal(p.title, 'Bardo National Museum');
  assert.deepEqual(p.coordinates, { lat: 36.8091, lng: 10.1353, source: 'place' });
});

test('camera center is explicitly unverified', () => {
  assert.equal(coordinatesFromMapUrl('https://www.google.com/maps/@36.8,10.1,14z').source, 'camera-only');
});

test('opaque share.google link does not invent name or image', () => {
  const p = parsePlaceInput('https://share.google/TEnbwCmrCccmdLjR7');
  assert.equal(p.title, '');
  assert.equal(p.short, true);
});

test('rejects local URLs, open proxies and unsafe schemes', () => {
  for (const url of ['http://localhost:8080/admin', 'https://127.0.0.1/', 'https://google.com.evil.invalid/',
    'https://google.com:8443/', 'https://user:pass@google.com/', 'file:///etc/passwd']) {
    assert.throws(() => checkedSourceUrl(url));
  }
});

test('normalizes Photon OSM candidates and retains OSM provenance', () => {
  const candidate = normalizePhotonFeature({ geometry: { coordinates: [10.18, 36.81] },
    properties: { name: 'Museum', city: 'Tunis', country: 'Tunisia', osm_type: 'W', osm_id: 7482, osm_value: 'museum' } });
  assert.equal(candidate.osmUrl, 'https://www.openstreetmap.org/way/7482');
  assert.equal(candidate.address, 'Tunis, Tunisia');
  assert.equal(candidate.kind, 'museum');
  assert.equal(normalizePhotonFeature({ properties: { name: 'Fake' }, geometry: { coordinates: [0, 0] } }), null);
});

test('only accepts actual Commons file tags for image lookup', () => {
  assert.equal(commonsFileFromTags({ wikimedia_commons: 'File:Bardo museum.jpg' }), 'File:Bardo museum.jpg');
  assert.equal(commonsFileFromTags({ image: 'https://lh3.googleusercontent.com/fake' }), null);
  assert.equal(commonsFileFromTags({ wikimedia_commons: 'Category:Paris' }), null);
});

test('resolves search results from Photon without auto-publishing/guessing', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  const oldFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => ({ features: [
      { geometry: { coordinates: [10.13, 36.81] }, properties: { name: 'Bardo National Museum', city: 'Tunis', country: 'Tunisia', osm_type: 'N', osm_id: 999999, osm_value: 'museum' } }
    ] }) };
  };
  try {
    const found = await resolvePlaceInput('Bardo National Museum', 'Tunis');
    assert.equal(found.needsName, false);
    assert.equal(found.candidates.length, 1);
    assert.equal(found.candidates[0].title, 'Bardo National Museum');
    assert.match(calls[0], /^https:\/\/photon.komoot.io\/api\//);
    assert.ok(!('photoUrl' in found.candidates[0]));
  } finally { global.fetch = oldFetch; }
});

test('OSM node loads sourced details and a license-checked Commons image', async () => {
  const { getPlaceDetails } = await import('../server/placeService.mjs');
  const oldFetch = global.fetch;
  global.fetch = async url => {
    const text = String(url);
    if (text.includes('api.openstreetmap.org')) return { ok: true, json: async () => ({
      elements: [{ type: 'node', id: 812812, lat: 36.82, lon: 10.14,
        tags: { name: 'Museum Fixture', tourism: 'museum', wikimedia_commons: 'File:Fixture photo.jpg', phone: '+216 00000000' } }]
    }) };
    if (text.includes('commons.wikimedia.org')) return { ok: true, json: async () => ({
      query: { pages: { 77: { title: 'File:Fixture photo.jpg', imageinfo: [
        { url: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Fixture_photo.jpg',
          extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<b>Example Photographer</b>' },
            LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } } }]
      } } }
    }) };
    throw new Error(`Unexpected URL ${text}`);
  };
  try {
    const details = await getPlaceDetails({ type: 'node', id: '812812' });
    assert.equal(details.title, 'Museum Fixture');
    assert.equal(details.photo.credit, 'Example Photographer');
    assert.equal(details.photo.license, 'CC BY-SA 4.0');
    assert.equal(details.phone, '+216 00000000');
    assert.equal(details.osmUrl, 'https://www.openstreetmap.org/node/812812');
  } finally { global.fetch = oldFetch; }
});


test('does not mistake a Google share stub token for a venue name', () => {
  assert.equal(parsePlaceInput('https://www.google.com/share.google?q=TEnbwCmrCccmdLjR7').title, '');
  assert.equal(parsePlaceInput('https://www.google.com/knowledgegraphshares?q=TEnbwCmrCccmdLjR7').title, '');
});

// Regression: the earlier prototype resolved Google share links through
// metadata fallbacks even when the HTTP redirect exposed only a Google stub.
const OPAQUE_SHARE = 'https://share.google/TEnbwCmrCccmdLjR7';
const GOOGLE_STUB = 'https://www.google.com/knowledgegraphshares?q=TEnbwCmrCccmdLjR7';
const osmMuseum = { geometry: { coordinates: [10.1353, 36.8091] },
  properties: { name: 'Bardo National Museum', city: 'Tunis', country: 'Tunisia', osm_type: 'N', osm_id: 87321, osm_value: 'museum' } };

async function withMockLinkFetch(handler, run) {
  const previous = global.fetch;
  global.fetch = async (rawUrl, options = {}) => handler(String(rawUrl), options);
  try { await run(); } finally { global.fetch = previous; }
}

const jsonResponse = (value) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => value });
const htmlResponse = (body) => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => body });
const shareRedirect = { status: 302, headers: { get: (key) => key === 'location' ? GOOGLE_STUB : null } };

test('Google share token recovers a place title from AllOrigins page metadata, then offers OSM selection', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  const requested = [];
  await withMockLinkFetch(async (url) => {
    requested.push(url);
    if (url === OPAQUE_SHARE) return shareRedirect;
    if (url.startsWith('https://api.allorigins.win/get?')) return jsonResponse({
      status: { url: GOOGLE_STUB },
      contents: '<html><head><meta property="og:title" content="Bardo National Museum - Google Maps"></head></html>'
    });
    if (url.startsWith('https://photon.komoot.io/api/')) return jsonResponse({ features: [osmMuseum] });
    throw new Error('Unexpected source: ' + url);
  }, async () => {
    const result = await resolvePlaceInput(OPAQUE_SHARE, 'Tunis');
    assert.equal(result.needsName, false);
    assert.equal(result.query, 'Bardo National Museum');
    assert.equal(result.candidates[0].title, 'Bardo National Museum');
    assert.equal(result.sourceUrl, OPAQUE_SHARE);
    assert.equal(result.candidates[0].photoUrl, undefined);
  });
  assert.ok(requested.some(url => url.startsWith('https://api.allorigins.win/get?')));
});

test('Google share uses original Microlink title fallback if redirect and page HTML are generic', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  await withMockLinkFetch(async (url) => {
    if (url === OPAQUE_SHARE) return shareRedirect;
    if (url.startsWith('https://api.allorigins.win/get?')) return jsonResponse({ status: { url: GOOGLE_STUB }, contents: '<title>Google Maps</title>' });
    if (url.startsWith('https://api.microlink.io/?')) return jsonResponse({
      status: 'success', data: { title: 'Bardo National Museum - Google Maps', url: GOOGLE_STUB }
    });
    if (url.startsWith('https://photon.komoot.io/api/')) return jsonResponse({ features: [osmMuseum] });
    throw new Error('Unexpected source: ' + url);
  }, async () => {
    const result = await resolvePlaceInput(OPAQUE_SHARE, 'Tunis');
    assert.equal(result.query, 'Bardo National Museum');
    assert.equal(result.needsName, false);
    assert.equal(result.candidates.length, 1);
  });
});

test('Google share uses original Jina URL fallback if metadata services cannot identify a place', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  await withMockLinkFetch(async (url) => {
    if (url === OPAQUE_SHARE) return shareRedirect;
    if (url.startsWith('https://api.allorigins.win/get?')) return jsonResponse({ status: { url: GOOGLE_STUB }, contents: '' });
    if (url.startsWith('https://api.microlink.io/?')) return jsonResponse({ status: 'success', data: { title: 'Google Maps', url: GOOGLE_STUB } });
    if (url.startsWith('https://r.jina.ai/')) return jsonResponse({ data: {
      url: 'https://www.google.com/maps/place/Bardo+National+Museum', title: 'Bardo National Museum'
    } });
    if (url.startsWith('https://photon.komoot.io/api/')) return jsonResponse({ features: [osmMuseum] });
    throw new Error('Unexpected source: ' + url);
  }, async () => {
    const result = await resolvePlaceInput(OPAQUE_SHARE, 'Tunis');
    assert.equal(result.query, 'Bardo National Museum');
    assert.equal(result.needsName, false);
    assert.equal(result.candidates[0].title, 'Bardo National Museum');
  });
});

test('Place name copied together with a Google share link is used, not discarded', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  await withMockLinkFetch(async (url) => {
    if (url === OPAQUE_SHARE) return shareRedirect;
    if (url.startsWith('https://photon.komoot.io/api/')) return jsonResponse({ features: [osmMuseum] });
    throw new Error('Unexpected source: ' + url);
  }, async () => {
    const result = await resolvePlaceInput('Bardo National Museum\n' + OPAQUE_SHARE, 'Tunis');
    assert.equal(result.needsName, false);
    assert.equal(result.query, 'Bardo National Museum');
  });
});

test('Provider metadata cannot invent a place when every link lookup returns an opaque Google stub', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  await withMockLinkFetch(async (url) => {
    if (url === OPAQUE_SHARE) return shareRedirect;
    if (url.startsWith('https://api.allorigins.win/get?')) return jsonResponse({ status: { url: GOOGLE_STUB }, contents: '' });
    if (url.startsWith('https://api.microlink.io/?')) return jsonResponse({ status: 'success', data: { title: 'Google Maps', url: GOOGLE_STUB } });
    if (url.startsWith('https://r.jina.ai/')) return jsonResponse({ data: { title: 'Google Maps', url: GOOGLE_STUB } });
    if (url.startsWith('https://api.codetabs.com/')) return htmlResponse('<title>Google Maps</title>');
    throw new Error('Unexpected source: ' + url);
  }, async () => {
    const result = await resolvePlaceInput(OPAQUE_SHARE, 'Tunis');
    assert.equal(result.needsName, true);
    assert.deepEqual(result.candidates, []);
    assert.equal(result.query, '');
  });
});

// Regression for the screenshot's empty photo/info preview: an OSM feature
// can link a licensed photo through its Wikidata P18 rather than the
// wikimedia_commons=File:* tag. User-selected OSM identity is the source.
test('selected OSM restaurant resolves its Wikidata P18 Commons photo and real contact/cuisine details', async () => {
  const { getPlaceDetails } = await import('../server/placeService.mjs');
  const previous = global.fetch;
  const calls = [];
  global.fetch = async input => {
    const url = String(input);
    calls.push(url);
    if (url === 'https://api.openstreetmap.org/api/0.6/node/9801229.json') return {
      ok: true, json: async () => ({ elements: [{ type: 'node', id: 9801229, lat: 36.7984, lon: 10.1701,
        tags: { name: 'Test Café', amenity: 'cafe', wikidata: 'Q987654321',
          'addr:full': '15 Rue Example, Le Bardo, Tunis', 'contact:phone': '+216 71 000 000',
          'contact:website': 'https://example.org/cafe', cuisine: 'coffee_shop;breakfast',
          outdoor_seating: 'yes', wheelchair: 'limited', opening_hours: 'Mo-Sa 08:00-20:00' } }] })
    };
    if (url.startsWith('https://www.wikidata.org/w/api.php?')) return {
      ok: true, json: async () => ({ entities: { Q987654321: {
        claims: { P18: [{ mainsnak: { datavalue: { value: 'Example café photo.jpg' } } }] },
        descriptions: { en: { value: 'café in Le Bardo, Tunisia' } }
      } } })
    };
    if (url.startsWith('https://commons.wikimedia.org/w/api.php?')) return {
      ok: true, json: async () => ({ query: { pages: { 24: {
        title: 'File:Example café photo.jpg', imageinfo: [{
          url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Example_cafe_photo.jpg',
          thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Example_cafe_photo.jpg/800px-Example_cafe_photo.jpg',
          extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' },
            Artist: { value: '<span>Local Photographer</span>' },
            LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } }
        }]
      } } } })
    };
    throw Error('unexpected provider ' + url);
  };
  try {
    const details = await getPlaceDetails({ type: 'node', id: '9801229' });
    assert.equal(details.title, 'Test Café');
    assert.equal(details.address, '15 Rue Example, Le Bardo, Tunis');
    assert.equal(details.phone, '+216 71 000 000');
    assert.equal(details.website, 'https://example.org/cafe');
    assert.equal(details.cuisine, 'coffee_shop;breakfast');
    assert.equal(details.wheelchair, 'limited');
    assert.equal(details.outdoorSeating, 'yes');
    assert.equal(details.openingHours, 'Mo-Sa 08:00-20:00');
    assert.equal(details.description, 'café in Le Bardo, Tunisia');
    assert.equal(details.photo?.source, 'Wikimedia Commons');
    assert.equal(details.photo?.credit, 'Local Photographer');
    assert.equal(details.photo?.license, 'CC BY-SA 4.0');
    assert.equal(details.photoSource, 'wikidata-p18');
    assert.ok(calls.some(s => s.startsWith('https://www.wikidata.org/w/api.php?')));
  } finally { global.fetch = previous; }
});

test('Wikidata photo is not surfaced when Commons metadata does not establish a reusable license', async () => {
  const { getPlaceDetails } = await import('../server/placeService.mjs');
  const previous = global.fetch;
  global.fetch = async input => {
    const url = String(input);
    if (url === 'https://api.openstreetmap.org/api/0.6/node/9801230.json') return {
      ok: true, json: async () => ({ elements: [{ type: 'node', id: 9801230, lat: 36.8, lon: 10.2,
        tags: { name: 'Unlicensed Image Test', amenity: 'restaurant', wikidata: 'Q987654322' } }] })
    };
    if (url.startsWith('https://www.wikidata.org/w/api.php?')) return {
      ok: true, json: async () => ({ entities: { Q987654322: {
        claims: { P18: [{ mainsnak: { datavalue: { value: 'Unlicensed Example.jpg' } } }] }
      } } })
    };
    if (url.startsWith('https://commons.wikimedia.org/w/api.php?')) return {
      ok: true, json: async () => ({ query: { pages: { 25: {
        title: 'File:Unlicensed Example.jpg', imageinfo: [{
          url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Unlicensed_Example.jpg',
          extmetadata: { LicenseShortName: { value: 'All rights reserved' } }
        }]
      } } } })
    };
    throw Error('unexpected provider ' + url);
  };
  try {
    const details = await getPlaceDetails({ type: 'node', id: '9801230' });
    assert.equal(details.photo, null);
    assert.equal(details.photoSource, 'no-licensed-photo');
  } finally { global.fetch = previous; }
});

// Screenshot-specific regression: the restaurant being shared must not be
// silently treated as the nearby OSM feature named Café Belkadhi.
test('Restaurant Belkadhi search flags Café Belkadhi as a different kind of venue without hiding OSM candidates', async () => {
  const { resolvePlaceInput } = await import('../server/placeService.mjs');
  const previous = global.fetch;
  global.fetch = async input => {
    const url = String(input);
    assert.match(url, /^https:\/\/photon\.komoot\.io\/api\//);
    return { ok: true, json: async () => ({ features: [
      { geometry: { coordinates: [10.17008, 36.79856] },
        properties: { name: 'Café Belkadhi', osm_type: 'N', osm_id: 10297344609,
          osm_key: 'amenity', osm_value: 'cafe', city: 'Tunis', country: 'Tunisia' } },
      { geometry: { coordinates: [10.165, 36.797] },
        properties: { name: 'Restaurant Belkadhi', osm_type: 'N', osm_id: 89977111,
          osm_key: 'amenity', osm_value: 'restaurant', city: 'Tunis', country: 'Tunisia' } }
    ] }) };
  };
  try {
    const result = await resolvePlaceInput('Restaurant Belkadhi', 'Tunis');
    const cafe = result.candidates.find(c => c.osmRef.id === '10297344609');
    const restaurant = result.candidates.find(c => c.osmRef.id === '89977111');
    assert.ok(cafe, 'the OSM cafe remains listed as a candidate for user review');
    assert.ok(restaurant, 'a matching restaurant must remain selectable');
    assert.match(cafe.matchWarning, /restaurant/i);
    assert.match(cafe.matchWarning, /caf[eé]/i);
    assert.equal(restaurant.matchWarning, null);
    assert.equal(result.candidates[0].title, 'Restaurant Belkadhi');
  } finally { global.fetch = previous; }
});
