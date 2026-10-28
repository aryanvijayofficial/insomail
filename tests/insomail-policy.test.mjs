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

test('InsoMail maintenance never offers source-replacing updater or false missing-secret warning',()=>{
 const card=readFileSync('src/components/admin-update-card.tsx','utf8');
 assert.doesNotMatch(card,/triggerApplicationUpdate|GITHUB_UPDATE_TOKEN|update.completeConfig/);
 assert.match(card,/Manual updates are intentional/);
 assert.match(card,/getMigrationStatus/);
 const post=readFileSync('src/app/api/admin/update/POST.ts','utf8');
 assert.match(post,/authorizeAdminRequest/);
 assert.doesNotMatch(post,/dispatchUpdateWorkflow/);
 assert.match(post,/status:409/);
 const workflow=readFileSync('.github/workflows/deploy-update.yml','utf8');
 assert.doesNotMatch(workflow,/git read-tree|git push|secrets\./);
});
test('free-plan overview copy cannot regress to paid requirements in another locale',async()=>{
 const result=await build({entryPoints:['src/lib/i18n/utils.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {createTranslator}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const t=createTranslator('en',{'admin.nav.licenses':'Licenses','admin.section.accounts':'Pay for Pro'});
 assert.equal(t('admin.nav.licenses'),'Free plans');
 assert.match(t('admin.section.accounts'),/Admin-only/);
 assert.doesNotMatch(t('admin.section.accounts'),/license|Pay/);
});
