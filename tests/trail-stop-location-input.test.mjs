import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/CurateTrailModal.tsx', import.meta.url), 'utf8');

test('the stop location is an enabled controlled text input', () => {
  const match = source.match(/<input\s+type="text"\s+required\s+value=\{stop\.name\}([\s\S]*?)placeholder="Stop location \/ landmark name"/);
  assert.ok(match, 'Expected an editable required stop location');
  assert.doesNotMatch(match[1], /disabled=|readOnly=/);
});

test('stop name and address update atomically in one state transaction', () => {
  assert.match(source, /const location = e\.currentTarget\.value/);
  assert.match(source, /setStops\(current => current\.map\(\(item, i\) =>/);
  assert.match(source, /i === idx \? \{ \.\.\.item, name: location, address: location \} : item/);
  assert.doesNotMatch(source, /handleUpdateStop\(idx, 'name', e\.target\.value\);\s*handleUpdateStop\(idx, 'address', e\.target\.value\)/);
});

test('publishing continues to validate that every stop has a location', () => {
  assert.match(source, /stops\.some\(\(s\) => !s\.name\.trim\(\)\)/);
});
