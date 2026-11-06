import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studio = readFileSync(new URL('../src/components/CurateTrailModal.tsx', import.meta.url), 'utf8');

test('Adopt and curate share the existing three-section studio', () => {
  assert.match(studio, /role="tablist"/);
  assert.match(studio, /1\. Overview/);
  assert.match(studio, /2\. Stops/);
  assert.match(studio, /3\. Tour/);
  assert.match(studio, /role="tabpanel"/);
  assert.match(studio, /hidden=\{activeTab !== 'overview'\}/);
  assert.match(studio, /hidden=\{activeTab !== 'stops'\}/);
  assert.match(studio, /hidden=\{activeTab !== 'tour'\}/);
});

test('adopted Trails preserve remix lineage through the real create API', () => {
  assert.match(studio, /initialTrail\?\.id/);
  assert.match(studio, /initialTrail\.title\.replace/);
  assert.match(studio, /forkedFromTrailId: sourceTrailId \|\| undefined/);
  assert.match(studio, /await createCommunityTrail\(/);
  assert.match(studio, /onCreated\(result\.trail\)/);
});

test('stop controls edit the ordered itinerary and reject unnamed stops', () => {
  assert.match(studio, /const handleMoveStop =/);
  assert.match(studio, /\[reordered\[index\], reordered\[nextIndex\]\]/);
  assert.match(studio, /Move stop \$\{idx \+ 1\} up/);
  assert.match(studio, /Move stop \$\{idx \+ 1\} down/);
  assert.match(studio, /handleAddStop/);
  assert.match(studio, /handleRemoveStop/);
  assert.match(studio, /stops\.some\(\(s\) => !s\.name\.trim\(\)\)/);
  assert.match(studio, /setActiveTab\('stops'\)/);
});

test('regular creators retain free Trails while Pro and Business retain paid Tours', () => {
  assert.match(studio, /setIsTour\(false\)/);
  assert.match(studio, /\['pro',\s*'business'\]/);
  assert.match(studio, /setIsTour\(true\)/);
  assert.match(studio, /pricePerPerson: isTour \? Number\(pricePerPerson\) : undefined/);
});
