import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('src/domains/d11_events/index.ts');
const home=read('src/components/HomeTab.tsx');
const suggest=read('src/components/SuggestVibeModal.tsx');
const admin=read('src/components/AdminModal.tsx');
test('D11 participation surface has one public entrypoint',()=>{
 assert.match(api,/export \* from '\.\/participation'/);
 for(const source of [home,suggest,admin]){
   assert.doesNotMatch(source,/from ['"]\.\.\/domains\/d11_events\/participation['"]/);
 }
});
