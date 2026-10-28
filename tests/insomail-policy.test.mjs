import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const result = await build({entryPoints:['src/lib/insomail/account-policy.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {applyInsoMailAccountPolicy} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('changes only local account creation and seats, never paid entitlement claims',()=>{
 const original={plan:'community',canCustomizeBranding:false,canManageAccounts:false,canShareMailboxes:false,accountSeatLimit:0,canForwardEmail:false};
 assert.deepEqual(applyInsoMailAccountPolicy(original),{...original,canManageAccounts:true,accountSeatLimit:null});
 assert.equal(original.canManageAccounts,false);
});
test('source download authenticates every request and takes no caller-selected object key',()=>{
 const source=readFileSync('src/app/api/source/route.ts','utf8');
 assert.ok(source.indexOf('requireSessionUser') < source.indexOf('env.BUCKET.get'));
 assert.match(source,/if \(auth.error\) return auth.error/);
 assert.match(source,/INSOMAIL_SOURCE_KEY/);
 assert.doesNotMatch(source,/searchParams|request\.json/);
});
test('public registration stays closed after initial admin',()=>{
 const source=readFileSync('src/app/api/auth/register/route.ts','utf8');
 assert.match(source,/if \(await hasAdminAccount\(env\)\)/);
 assert.match(source,/Registration is closed after the first account is created/);
});

test('Worker source streaming authenticates and declares complete archive length',()=>{
 const source=readFileSync('worker.ts','utf8');
 const route=source.slice(source.indexOf('// InsoMail source download'),source.indexOf('if (url.pathname === "/api/realtime")'));
 assert.match(route,/getUserFromSession/);
 assert.match(route,/!user \|\| user.disabled/);
 assert.ok(route.indexOf('getUserFromSession') < route.indexOf('env.BUCKET.get'));
 assert.match(route,/"Content-Length": String\(archive.size\)/);
 assert.doesNotMatch(route,/searchParams|request\.json/);
});
