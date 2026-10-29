import assert from 'node:assert/strict';import test from 'node:test';import{build}from'esbuild';import{JSDOM}from'jsdom';
const dom=new JSDOM('',{url:'https://example.invalid'});for(const k of ['window','document','HTMLElement','DOMParser','Node'])globalThis[k]=k==='window'?dom.window:dom.window[k];
const r=await build({entryPoints:['src/app/api/drafts/draft-body.ts'],bundle:true,write:false,format:'esm',platform:'browser',alias:{'@':new URL('../src',import.meta.url).pathname}});const{resolveDraftBodies}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const rich='<div>Hello <strong>bold</strong></div>';
test('a client that sends html owns both bodies',()=>{
 const out=resolveDraftBodies({textBody:'old',htmlBody:rich},{text:'new',html:'<div>new <em>rich</em></div>'});
 assert.equal(out.text,'new');assert.equal(out.htmlBody,'<div>new <em>rich</em></div>');
});
test('an explicit empty html still clears the rich copy',()=>{
 const out=resolveDraftBodies({textBody:'same',htmlBody:rich},{text:'same',html:''});
 assert.equal(out.htmlBody,null);
});
test('a text-only save that keeps the text keeps the rich copy',()=>{
 const out=resolveDraftBodies({textBody:'Hello there',htmlBody:rich},{text:'Hello there'});
 assert.equal(out.text,'Hello there');assert.equal(out.htmlBody,rich);
});
test('a text-only save with no text change keeps a missing rich copy missing',()=>{
 const out=resolveDraftBodies({textBody:null,htmlBody:null},{});
 assert.equal(out.text,'');assert.equal(out.htmlBody,null);
});
test('a text-only edit rebuilds the rich copy from the new text, never the stale one',()=>{
 const out=resolveDraftBodies({textBody:'old text',htmlBody:rich},{text:'new <b>text</b>\nsecond line'});
 assert.equal(out.htmlBody,'<div>new &lt;b&gt;text&lt;/b&gt;<br>second line</div>');
 assert.ok(!out.htmlBody.includes('strong'));
});
test('a text-only edit clears the rich copy when the text is cleared',()=>{
 const out=resolveDraftBodies({textBody:'old text',htmlBody:rich},{});
 assert.equal(out.text,'');assert.equal(out.htmlBody,null);
});
test('a text-only create stores rich copy built from the text',()=>{
 const out=resolveDraftBodies(null,{text:'plain'});
 assert.equal(out.htmlBody,'<div>plain</div>');
});
test('carriage returns normalise before comparison and rebuild',()=>{
 const out=resolveDraftBodies({textBody:'a\r\nb',htmlBody:rich},{text:'a\nb'});
 assert.equal(out.htmlBody,rich);
});
