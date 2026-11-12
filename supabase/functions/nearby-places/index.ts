/**
 * Venue discovery endpoint retained for D03 compatibility.
 * The former paid venue provider and photo proxy have been retired.
 * An unavailable source must not masquerade as a successful empty search.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const jsonHeaders = { ...cors, 'Content-Type': 'application/json' };
Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({ error: 'The former venue photo proxy has been retired.', code: 'PHOTO_PROXY_RETIRED' }),
      { status: 410, headers: jsonHeaders }
    );
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' }), {
      status: 405, headers: jsonHeaders
    });
  }
  return new Response(JSON.stringify({
    places: [],
    error: 'Venue discovery is temporarily unavailable while an open-data provider is configured.',
    code: 'VENUE_DISCOVERY_UNAVAILABLE'
  }), { status: 503, headers: jsonHeaders });
});
