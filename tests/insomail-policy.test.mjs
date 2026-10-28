import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const result = await build({entryPoints:['src/lib/insomail/account-policy.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {applyInsoMailAccountPolicy} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('local capabilities never claim a paid vendor plan',()=>{
 const original={plan:'community',canCustomizeBranding:false,canManageAccounts:false,canShareMailboxes:false,accountSeatLimit:0,canForwardEmail:false};
 assert.deepEqual(applyInsoMailAccountPolicy(original),{...original,canManageAccounts:true,accountSeatLimit:null,canCustomizeBranding:true,canShareMailboxes:true,canForwardEmail:true});
 assert.equal(original.canManageAccounts,false);
});
test('public source download takes no caller-selected object key',()=>{
 const source=readFileSync('src/app/api/source/route.ts','utf8');
 assert.match(source,/INSOMAIL_SOURCE_KEY/);
 assert.doesNotMatch(source,/searchParams|request\.json|requireSessionUser/);
});
test('public registration stays closed after initial admin',()=>{
 const source=readFileSync('src/app/api/auth/register/route.ts','utf8');
 assert.match(source,/if \(await hasAdminAccount\(env\)\)/);
 assert.match(source,/Registration is closed after the first account is created/);
});

test('Worker source streaming is public and declares complete archive length',()=>{
 const source=readFileSync('worker.ts','utf8');
 const route=source.slice(source.indexOf('// InsoMail source download'),source.indexOf('if (url.pathname === "/api/realtime")'));
 assert.doesNotMatch(route,/getUserFromSession|Unauthorized/);
 assert.match(route,/"Content-Length": String\(archive.size\)/);
 assert.doesNotMatch(route,/searchParams|request\.json/);
});
