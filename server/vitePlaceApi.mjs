import { resolvePlaceInput, getPlaceDetails, searchCommonsImages } from './placeService.mjs';

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 8192) throw new Error('Input is too long.');
  }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('Invalid JSON input.'); }
}

export function placeApiPlugin() {
  const throttles = new Map();
  const middleware = async (req, res, next) => {
    if (!req.url?.startsWith('/api/places/')) return next();
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/places/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, mode: 'local-test', providers: ['Photon', 'OpenStreetMap', 'Wikimedia Commons'] });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
    const ip = req.socket?.remoteAddress || 'unknown';
    const row = throttles.get(ip) || { started: Date.now(), count: 0 };
    if (Date.now() - row.started > 60_000) { row.started = Date.now(); row.count = 0; }
    if (++row.count > 35) return json(res, 429, { error: 'Too many requests. Try again in a minute.' });
    throttles.set(ip, row);
    if (throttles.size > 500) throttles.clear();
    try {
      const body = await readBody(req);
      let result;
      if (pathname === '/api/places/resolve') {
        result = await resolvePlaceInput(body.input, body.hint);
      } else if (pathname === '/api/places/details') {
        result = await getPlaceDetails(body.osmRef, body.fallback);
      } else if (pathname === '/api/places/photos') {
        result = { photos: await searchCommonsImages(body.query) };
      } else return json(res, 404, { error: 'Unknown API route.' });
      return json(res, 200, result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Provider unavailable.';
      const isClientError = /^(Paste|Only HTTPS|This demo|Input is too|Enter a place|Invalid|Use POST|This short)/.test(message);
      return json(res, isClientError ? 400 : 503, { error: message });
    }
  };
  return { name: 'vibequest-local-place-api', configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); } };
}
