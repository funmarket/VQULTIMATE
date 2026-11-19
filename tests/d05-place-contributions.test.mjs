import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlaceInsert, normalizePlaceRecord } from '../src/domains/places/contributions.ts';
const base={name:'  Genuine Cafe  ',category:'Food',lat:0,lng:0,createdBy:'profile_user_01',description:'',address:'',phone:'',imageUrl:null};
test('D05 builds exact database columns without invented ID or metadata, photo remains optional',()=>{
 const p=buildPlaceInsert(base);
 assert.deepEqual(p,{name:'Genuine Cafe',category:'Food',lat:0,lng:0,created_by:'profile_user_01',description:null,address:null,phone:null,image_url:null});
 assert.equal(Object.hasOwn(p,'id'),false);
 for(const bad of ['rating','reviews_count','pulse_intensity','checkins_count','vq_reward','vibe_confidence'])assert.equal(Object.hasOwn(p,bad),false);
});
test('D05 retains optional user-provided facts, no fabricated address or description',()=>{
 const p=buildPlaceInsert({...base,address:'Rue X',description:'Found at street corner',phone:'+216 123',imageUrl:'https://example.org/photo.jpg'});
 assert.equal(p.address,'Rue X');assert.equal(p.description,'Found at street corner');assert.equal(p.phone,'+216 123');assert.equal(p.image_url,'https://example.org/photo.jpg');
});
test('D05 rejects invalid geocoordinates, empty name or creator, category outside approved set',()=>{
 for(const lat of [NaN,Infinity,-91,91])assert.throws(()=>buildPlaceInsert({...base,lat}),/latitude/i);
 for(const lng of [NaN,Infinity,-181,181])assert.throws(()=>buildPlaceInsert({...base,lng}),/longitude/i);
 assert.throws(()=>buildPlaceInsert({...base,name:' '}),/name/i);
 assert.throws(()=>buildPlaceInsert({...base,createdBy:' '}),/creator/i);
 assert.throws(()=>buildPlaceInsert({...base,category:'Medical'}),/category/i);
});
test('D05 normalized readback has real identity and nullable media without fake metrics',()=>{
 const row={id:'00000000-0000-4000-8000-000000000001',name:'Genuine Cafe',category:'Food',lat:0,lng:0,description:null,address:null,phone:null,image_url:null,created_by:'profile_user_01',rating:4.5,reviews_count:25,checkins_count:18};
 const dto=normalizePlaceRecord(row);
 assert.deepEqual(dto,{id:row.id,name:'Genuine Cafe',category:'Food',lat:0,lng:0,description:null,address:null,phone:null,imageUrl:null,createdBy:'profile_user_01'});
 assert.equal(Object.hasOwn(dto,'rating'),false);
});

