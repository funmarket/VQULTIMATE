import test from 'node:test';
import assert from 'node:assert/strict';
import { handleVercelPlaceApi } from '../server/vercelPlaceApi.mjs';
const call = async (path,body,method='POST')=>{
  let status = null; let payload = null;const headers={};
  const req={url:'/api/places/'+path,method,body};
  const res={setHeader(k,v){headers[k]=v;return this},status(v){status=v;return this},json(v){payload=v;return this}};
  await handleVercelPlaceApi(req,res,path);return {status,payload,headers};
};
test('Server adapter preserves original exact OSM API behavior for bad reference', async()=>{
 const v=await call('details',{osmRef:{type:'node',id:'not-an-osm-id'}});
 assert.equal(v.status,400); assert.match(v.payload.error,/Invalid OpenStreetMap/);
});
test('Vercel adapter POST-only and no arbitrary proxy route', async()=>{
 assert.equal((await call('resolve',{},'GET')).status,405);
 assert.equal((await call('proxy',{url:'https://127.0.0.1'})).status,404);
});
test('Vercel adapter rejects oversized payload before provider call', async()=>{
 assert.equal((await call('resolve',{input:'x'.repeat(9000)})).status,413);
});
