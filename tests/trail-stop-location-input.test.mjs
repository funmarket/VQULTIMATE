import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/CurateTrailModal.tsx', import.meta.url), 'utf8');

test('the stop location is an enabled controlled text input', () => {
  const match = source.match(/<input\s+type="text"\s+required\s+value=\{stop\.name\}([\s\S]*?)placeholder="Stop location \/ landmark name"/);
  assert.ok(match, 'Expected an editable required stop location');
  assert.doesNotMatch(match[1], /disabled=|readOnly=/);
});

test('stop name and address are independent editable fields', () => {
  assert.match(source, /handleUpdateStop\(idx, 'name', e\.target\.value\)/);
  assert.match(source, /handleUpdateStop\(idx, 'address', e\.target\.value\)/);
  assert.doesNotMatch(source, /name: location, address: location/);
});

test('the address field is optional for stops with valid coordinates', () => {
  assert.match(source, /required=\{!\(typeof stop\.lat === 'number'/);
  assert.match(source, /Math\.abs\(stop\.lat\) <= 90/);
  assert.match(source, /Math\.abs\(stop\.lng\) <= 180/);
});

test('publishing continues to validate that every stop has a location', () => {
  assert.match(source, /stops\.some\(\(s\) => !s\.name\.trim\(\)\)/);
});
