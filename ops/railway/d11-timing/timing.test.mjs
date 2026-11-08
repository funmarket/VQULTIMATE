import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFlashEvent, summarizeFlashEvents } from './timing.mjs';
import { configFromEnv, pollEvents } from './worker.mjs';

const now = Date.parse('2026-11-08T18:00:00.000Z');
const item = (starts, ends, status = 'active') => ({ status, starts_at: new Date(now + starts).toISOString(), ends_at: new Date(now + ends).toISOString() });
const minute = 60000;

test('exact 60-minute discovery boundary, live transition, and real expiry', () => {
  assert.equal(classifyFlashEvent(item(61*minute, 90*minute), now), 'scheduled');
  assert.equal(classifyFlashEvent(item(60*minute, 90*minute), now), 'upcoming');
  assert.equal(classifyFlashEvent(item(minute, 90*minute), now), 'upcoming');
  assert.equal(classifyFlashEvent(item(0, 90*minute), now), 'live');
  assert.equal(classifyFlashEvent(item(-minute, minute), now), 'live');
  assert.equal(classifyFlashEvent(item(-10*minute, 0), now), 'expired');
  assert.equal(classifyFlashEvent(item(-minute, minute, 'cancelled'), now), 'ineligible');
});

test('invalid window and time rejects without pretending activity', () => {
  assert.equal(classifyFlashEvent(item(0, 0), now), 'ineligible');
  assert.equal(classifyFlashEvent({ status:'active', starts_at:'garbage', ends_at:'garbage' }, now), 'ineligible');
  assert.deepEqual(summarizeFlashEvents([item(0,minute),item(minute,2*minute),item(-minute,0)],now), { upcoming:1, live:1, expired:1, scheduled:0, ineligible:0 });
});

test('disabled by default and secrets are mandatory only when enabled', () => {
  assert.deepEqual(configFromEnv({}), {enabled:false});
  assert.throws(() => configFromEnv({D11_WORKER_ENABLED:'true'}), /requires SUPABASE_URL/);
  assert.throws(() => configFromEnv({D11_WORKER_ENABLED:'true',SUPABASE_URL:'http://example.com/',SUPABASE_SERVICE_ROLE_KEY:'secret'}), /HTTPS/);
  assert.equal(configFromEnv({D11_WORKER_ENABLED:'true',SUPABASE_URL:'https://example.supabase.co/',SUPABASE_SERVICE_ROLE_KEY:'secret'}).interval,30000);
});

test('read-only request limits fields and result count, does not leak auth in URL', async () => {
  const cfg={enabled:true,endpoint:'https://example.supabase.co',key:'dummy',interval:30000};
  let called=0;
  const result=await pollEvents(cfg,()=>now,async (url,opts)=>{
    called++;
    assert.equal(opts.method,undefined);
    assert.equal(url.searchParams.get('select'),'starts_at,ends_at,status');
    assert.equal(url.searchParams.get('limit'),'500');
    assert(!url.toString().includes('dummy'));
    assert.equal(opts.headers.Authorization,'Bearer dummy');
    return {ok:true,json:async()=>[item(0,minute)]};
  });
  assert.equal(called,1);
  assert.deepEqual(result,{counts:{upcoming:0,live:1,expired:0,scheduled:0,ineligible:0},truncated:false});
});

test('no success is claimed on remote failure', async () => {
  const cfg={enabled:true,endpoint:'https://example.supabase.co',key:'dummy',interval:30000};
  await assert.rejects(pollEvents(cfg,()=>now,async()=>({ok:false,status:404})),/HTTP 404/);
});
