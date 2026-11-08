/**
 * Read-only staging operations probe for D11 Flash Events on Railway.
 * No database writes, no expiry-triggered event mutation, no notifications.
 * Supabase owns the timestamps and all durable business state.
 */
import { summarizeFlashEvents, UPCOMING_WINDOW_MS } from './timing.mjs';

const env = process.env;
const log = (name, detail = {}) => console.log(JSON.stringify({ component: 'd11-railway-timing', event: name, ...detail }));

export function configFromEnv(e = env) {
  if (e.D11_WORKER_ENABLED !== 'true') return { enabled: false };
  const endpoint = e.SUPABASE_URL;
  const key = e.SUPABASE_SERVICE_ROLE_KEY;
  if (!endpoint || !key) throw new Error('D11 worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SUPABASE_URL must be a canonical HTTPS project root');
  }
  const interval = Number(e.D11_POLL_INTERVAL_MS ?? 30000);
  if (!Number.isInteger(interval) || interval < 15000 || interval > 300000) throw new Error('Invalid D11_POLL_INTERVAL_MS');
  return { enabled: true, endpoint: url.origin, key, interval };
}

export async function pollEvents(config, now = () => Date.now(), fetchImpl = fetch) {
  if (!config.enabled) return null;
  const at = now();
  // Bounded read including upcoming events and recently expired records.
  // Credentials stay server-side and must NEVER be in VITE_ variables.
  const start = new Date(at - UPCOMING_WINDOW_MS).toISOString();
  const stop = new Date(at + UPCOMING_WINDOW_MS).toISOString();
  const url = new URL('/rest/v1/flash_events', config.endpoint);
  url.searchParams.set('select', 'starts_at,ends_at,status');
  url.searchParams.set('starts_at', `lte.${stop}`);
  url.searchParams.set('ends_at', `gt.${start}`);
  url.searchParams.set('order', 'starts_at.asc');
  url.searchParams.set('limit', '500');
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), 10000);
  let response;
  try {
    response = await fetchImpl(url, { headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, Accept: 'application/json' }, signal: ctl.signal });
  } finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error(`D11 read failed: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Unexpected Flash Event response');
  return { counts: summarizeFlashEvents(rows, at), truncated: rows.length === 500 };
}

export async function runWorker(config = configFromEnv()) {
  if (!config.enabled) { log('disabled'); return; }
  let running = true;
  const stop = () => { running = false; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  log('started', { pollIntervalMs: config.interval, mode: 'read-only' });
  while (running) {
    try {
      const result = await pollEvents(config);
      log('snapshot', result);
    } catch (error) {
      log('poll_failed', { message: error?.name === 'AbortError' ? 'request timeout' : String(error?.message || 'unknown error') });
    }
    if (!running) break;
    await new Promise(resolve => {
      setTimeout(resolve, config.interval);
      // Keep the service alive between polls; Railway process remains on duty.
    });
  }
  log('stopped');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  runWorker().catch(error => { log('startup_failed', { message: error.message }); process.exitCode = 1; });
}
