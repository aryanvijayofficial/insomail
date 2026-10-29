import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const mocks={
 '@/lib/cloudflare':'export function getEnv(){return {}}',
 '@/lib/auth/cookies':'export async function getCurrentUser(){return globalThis.pixelUser}',
 '@/lib/tracking/self-open':'export async function ownedTrackingTokens(){return new Set(globalThis.pixelOwned ? ["abcdefghijklmnopqrstuvwx"] : [])}',
 '@/lib/tracking/open-tracking':'export async function recordOpen(){globalThis.pixelCalls++}',
};
const bundle=await build({entryPoints:['src/app/api/i/[file]/route.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^@\/lib\//},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
const {GET}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const req=()=>new Request('https://pixel.example/api/i/abcdefghijklmnopqrstuvwx.gif');
const params={params:Promise.resolve({file:'abcdefghijklmnopqrstuvwx.gif'})};
test('authenticated owner gets the same GIF without recording; recipient requests still record',async()=>{
 globalThis.pixelCalls=0;globalThis.pixelUser={id:'owner'};globalThis.pixelOwned=true;
 const owner=await GET(req(),params);assert.equal(owner.status,200);assert.equal(globalThis.pixelCalls,0);
 globalThis.pixelUser=null;globalThis.pixelOwned=false;
 const recipient=await GET(req(),params);assert.equal(recipient.status,200);assert.equal(globalThis.pixelCalls,1);
 assert.deepEqual(new Uint8Array(await owner.arrayBuffer()),new Uint8Array(await recipient.arrayBuffer()));
 globalThis.pixelUser={id:'other'};await GET(req(),params);assert.equal(globalThis.pixelCalls,2);
 delete globalThis.pixelUser;delete globalThis.pixelOwned;delete globalThis.pixelCalls;
});
