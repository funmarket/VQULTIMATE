/** Vercel Node adapter for the original ZIP's server/placeService.mjs.
 * All place matching, short-link expansion, Photon, OSM and Commons behavior
 * remains implemented by that original, byte-identical module.
 */
import { resolvePlaceInput, getPlaceDetails, searchCommonsImages } from './placeService.mjs';

const throttles = new Map();

export async function handleVercelPlaceApi(req, res, action) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0];
  const row = throttles.get(ip) || { started: Date.now(), count: 0 };
  if (Date.now() - row.started > 60000) { row.started = Date.now(); row.count = 0; }
  if (++row.count > 35) return res.status(429).json({error:'Too many requests. Try again in a minute.'});
  throttles.set(ip,row);
  if (throttles.size > 500) throttles.clear();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({error: 'Use POST.'});
  const bytes = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (bytes.length > 8192) return res.status(413).json({error: 'Input is too long.'});
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({error: 'Invalid JSON input.'}); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({error: 'Invalid JSON input.'});
  try {
    if (action === 'resolve') return res.status(200).json(await resolvePlaceInput(body.input, body.hint));
    if (action === 'details') return res.status(200).json(await getPlaceDetails(body.osmRef, body.fallback));
    if (action === 'photos') return res.status(200).json({photos: await searchCommonsImages(body.query)});
    return res.status(404).json({error: 'Unknown API route.'});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider unavailable.';
    const bad = /^(Paste|Only HTTPS|This demo|Input is too|Enter a place|Invalid|Use POST|This short)/.test(message);
    return res.status(bad ? 400 : 503).json({error: message});
  }
}
