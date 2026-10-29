import assert from 'node:assert/strict';import test from 'node:test';import{readFileSync}from'node:fs';import{build}from'esbuild';import{JSDOM}from'jsdom';
const dom=new JSDOM('',{url:'https://example.invalid'});for(const k of ['window','document','HTMLElement','DOMParser','Node'])globalThis[k]=k==='window'?dom.window:dom.window[k];
const r=await build({entryPoints:['src/components/compose/rich-text-utils.ts'],bundle:true,write:false,format:'esm',platform:'browser'});const{isSignatureOnlyHtml,applyMailboxSignatureHtml,hasMeaningfulHtml}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const rich='<div>Regards,<br><strong>Demo</strong><br><a href="mailto:demo@example.invalid">demo@example.invalid</a><img src="https://example.invalid/logo.png" alt="Logo"></div>';
const autosaves=({html='',signature=rich,to=[],cc=[],bcc=[],subject='',quotedHtml='',attachments=[],storedAttachments=[]}={})=>Boolean(to.length||cc.length||bcc.length||subject.trim()||quotedHtml||attachments.length||storedAttachments.length||(hasMeaningfulHtml(html)&&!isSignatureOnlyHtml(html,signature)));
test('untouched rich/plain/image-only signatures never create empty drafts',()=>{
 for(const signature of [rich,'Regards,\nA & B','<img src="https://example.invalid/logo.png" alt="Logo">']){
 const html=applyMailboxSignatureHtml('',null,signature);assert.equal(isSignatureOnlyHtml(html,signature),true);assert.equal(autosaves({html,signature}),false);
 }
});
test('substantive new and existing draft content continues autosaving',()=>{
 const html=applyMailboxSignatureHtml('',null,rich);
 for(const changes of [{to:['demo@example.invalid']},{cc:['demo@example.invalid']},{bcc:['demo@example.invalid']},{subject:'A real draft'},{quotedHtml:'<p>Prior reply</p>'},{attachments:[{}]},{storedAttachments:[{}]},{html:'<p>Hello</p>'+html},{html:'<img src="https://example.invalid/added.png">'+html},{html:html.replace('mailto:demo@example.invalid','mailto:changed@example.invalid')},{html:'<img src="https://example.invalid/standalone.png">',signature:''}])assert.equal(autosaves({html,...changes}),true);
 assert.equal(isSignatureOnlyHtml('<p>Changed signature text</p>',rich),false);
});
test('autosave uses same normalized guard, contains no draft cleanup/deletion behavior',()=>{
 const source=readFileSync('src/components/compose/compose-form.tsx','utf8');const guard=source.slice(source.indexOf('pendingSave.current = null;\n\t\tconst signatureOnly'),source.indexOf('const generation = draftGeneration.current;'));
 assert.match(guard,/isSignatureOnlyHtml\(html, selectedMailbox\?\.signature\)/);assert.match(guard,/storedAttachments.length/);assert.match(guard,/hasMeaningfulHtml\(html\) && !signatureOnly/);assert.doesNotMatch(guard,/fetch|DELETE/);
});
