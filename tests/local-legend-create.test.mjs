import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const explore = readFileSync(new URL('../src/components/ExploreTab.tsx', import.meta.url), 'utf8');
const selfie = readFileSync(new URL('../src/components/LiveSelfieModal.tsx', import.meta.url), 'utf8');
const guardians = readFileSync(new URL('../src/domains/d07_guardians/api.ts', import.meta.url), 'utf8');

test('Local Legends tab exposes real creation action to signed-in users', () => {
  assert.match(explore, /guardianFilter === 'local' && \(/);
  assert.match(explore, /Create Local Legend/);
  assert.match(explore, /onClick=\{\(\) => openGuardianRegistration\('local'\)\}/);
  assert.match(explore, /if \(!user\) \{ onRequireAuth\?\.\(\); return; \}/);
});

test('Local action opens existing verified selfie form with an explicit local role', () => {
  assert.match(explore, /initialGuardianType=\{guardianRegistrationType\}/);
  assert.match(selfie, /initialGuardianType\?: 'local' \| 'pro'/);
  assert.match(selfie, /initialGuardianType \?\? \(user\?\.accountType === 'pro' \? 'pro' : 'local'\)/);
  assert.match(selfie, /await registerGuardian\(/);
  assert.match(guardians, /supabase\.rpc\('vq_register_guardian'/);
});
