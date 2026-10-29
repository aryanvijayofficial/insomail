import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['src/lib/tracking/self-open-utils.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {trackingTokenFromUrl,embeddedTrackingTokens,stripOwnedPixelImages}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const own='abcdefghijklmnopqrstuvwx', other='ABCDEFGHIJKLMNOPQRSTUVWX';
test('direct, custom host, relative and proxy pixel paths are recognized without loading',()=>{
 for(const url of [`https://mail.insomail.com/api/i/${own}.gif`,`/api/i/${own}.gif`,`/api/remote-images?url=${encodeURIComponent(`https://old.example/api/i/${own}.gif`)}`]) assert.equal(trackingTokenFromUrl(url),own);
 assert.equal(trackingTokenFromUrl('https://cdn.example/logo.png'),null);
});
test('owner pixels are removed from legacy, quoted and forwarded HTML, other images preserved',()=>{
 const html=`<blockquote><img src="https://old.example/api/i/${own}.gif" /></blockquote><img src='/api/i/${other}.gif'><img src="https://cdn.example/logo.png">`;
 assert.deepEqual(embeddedTrackingTokens(html),[own,other]);
 const safe=stripOwnedPixelImages(html,new Set([own]));
 assert.ok(!safe.includes(own)); assert.ok(safe.includes(other)); assert.ok(safe.includes('logo.png'));
 assert.equal(stripOwnedPixelImages(html,new Set()),html);
});
