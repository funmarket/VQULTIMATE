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

test('a separate Google Maps address is required regardless of optional coordinates', () => {
  assert.match(source, /id=\{`trail-stop-address-\$\{idx\}`\}[\s\S]*?type="text"\s+required\s+value=\{stop\.address\}/);
  assert.match(source, /stops\.some\(\(s\) => !s\.address\.trim\(\)\)/);
});

test('publishing continues to validate that every stop has a location', () => {
  assert.match(source, /stops\.some\(\(s\) => !s\.name\.trim\(\)\)/);
});
