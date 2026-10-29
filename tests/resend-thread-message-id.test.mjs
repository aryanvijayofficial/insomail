import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['src/lib/email/outbound-provider.ts'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',alias:{'@':process.cwd()+'/src'},plugins:[{name:'mock',setup(b){b.onResolve({filter:/^@\/lib\/aws\/config$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export function requireAwsConfig(){throw Error("unused")}'}));}}]});
// Keep dependencies in a real module path for external package resolution.
import {writeFileSync,unlinkSync} from 'node:fs';
const path=new URL('../node_modules/.resend-thread-test.mjs',import.meta.url);writeFileSync(path,bundle.outputFiles[0].text);
const provider=await import(path.href);unlinkSync(path);
test('Resend stores delivered RFC Message-ID and retains provider email ID, not invented header',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json(init.method==='POST'?{id:'provider-123'}:{message_id:'<actual@email.amazonses.com>'});};
 try {const result=await provider.sendThroughProvider({}, {provider:'resend',apiKey:'fake'}, {from:'a@example.com',to:['b@example.com'],subject:'x',text:'x'});assert.deepEqual(result,{messageId:'<actual@email.amazonses.com>',providerDeliveryId:'provider-123'});assert.equal(calls[1].url,'https://api.resend.com/emails/provider-123');}finally{globalThis.fetch=original;}
});
test('accepted send remains successful when detail ID is not yet exposed',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url,init)=>Response.json(init.method==='POST'?{id:'provider-456'}:{});
 try {const result=await provider.sendThroughProvider({}, {provider:'resend',apiKey:'fake'}, {from:'a@example.com',to:['b@example.com'],subject:'x',headers:{'Message-ID':'<requested@example.com>'},text:'x'});assert.equal(result.messageId,'<requested@example.com>');assert.equal(result.providerDeliveryId,'provider-456');}finally{globalThis.fetch=original;}
});
