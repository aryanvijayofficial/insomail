import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React from 'react';
import {createRoot} from 'react-dom/client';
const dom=new JSDOM('<div id="root"></div>',{url:'https://example.invalid'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});
const built=await build({entryPoints:['src/components/ui/use-confirm-dialog.tsx'],bundle:true,write:false,format:'esm',platform:'node',packages:'external',jsx:'automatic',plugins:[{name:'mock',setup(b){b.onResolve({filter:/^react(?:\/.*)?$/},a=>({path:a.path,external:true}));b.onResolve({filter:/language-provider|\.\/dialog$|\.\/button$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.includes('language-provider')?`export const useLanguage=()=>({t:k=>k});`:a.path.endsWith('button')?`import React from 'react';export const Button=React.forwardRef((p,r)=>React.createElement('button',{...p,ref:r}));`:`import React from 'react';export const Dialog=({open,children,onOpenChange})=>open?React.createElement('section',null,children,React.createElement('button',{id:'dismiss',onClick:()=>onOpenChange(false)},'dismiss')):null;export const DialogContent=({children})=>React.createElement('div',null,children);export const DialogTitle=({children})=>React.createElement('h1',null,children);export const DialogDescription=({children})=>React.createElement('p',null,children);`,loader:'js'}));}}]});
// Import from local module so external React resolves exactly once.
import {writeFileSync,unlinkSync} from 'node:fs';
const bundle=new URL('../node_modules/.insomail-confirm-test.mjs',import.meta.url);writeFileSync(bundle,built.outputFiles[0].text);const {useConfirmDialog}=await import(bundle.href);unlinkSync(bundle);
let api;const root=createRoot(document.getElementById('root'));const tick=()=>new Promise(r=>setTimeout(r,15));
function Harness(){api=useConfirmDialog();return api.confirmationDialog}
root.render(React.createElement(Harness));await tick();
const click=text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(b,text);b.click()};
test('opening, cancel and dismiss never run the action; explicit confirm runs once',async()=>{
 let calls=0;const opts={title:'Empty Trash',description:'Permanent',confirmLabel:'Empty Trash',action:async()=>{calls++}};
 let p=api.confirm(opts);await tick();assert.equal(calls,0);click('common.cancel');assert.equal(await p,false);await tick();assert.equal(calls,0);
 p=api.confirm(opts);await tick();click('dismiss');assert.equal(await p,false);await tick();assert.equal(calls,0);
 p=api.confirm(opts);await tick();click('Empty Trash');assert.equal(await p,true);await tick();assert.equal(calls,1);
});
test('busy operation prevents cancel and duplicate action; errors stay in dialog for retry',async()=>{
 let reject;let calls=0;const p=api.confirm({title:'Empty Trash',description:'Permanent',confirmLabel:'Empty Trash',action:()=>{calls++;return new Promise((_,r)=>reject=r)}});await tick();click('Empty Trash');await tick();assert.equal(calls,1);assert.ok([...document.querySelectorAll('button')].find(b=>b.textContent==='common.cancel').disabled);reject(new Error('Try again'));await tick();assert.equal(document.querySelector('[role=alert]').textContent,'Try again');click('common.cancel');assert.equal(await p,false);await tick();
});
test('empty confirmation executes only captured folder/mailbox through existing handler',()=>{const s=readFileSync('src/components/messages/message-folder-page.tsx','utf8');assert.match(s,/await confirm\(\{title:getEmptyFolderLabel/);assert.match(s,/action:async\(\)=>/);assert.match(s,/emptyMessageFolder\(mailboxId,folder\)/);assert.doesNotMatch(s,/window\.confirm|window\.alert/);const hook=readFileSync('src/components/ui/use-confirm-dialog.tsx','utf8');assert.match(hook,/cancelRef.current\?\.focus/);assert.match(hook,/onCloseAutoFocus/);assert.match(hook,/if\(busy\)event.preventDefault/)});
