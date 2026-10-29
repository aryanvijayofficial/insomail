import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const component=readFileSync('src/components/messages/bulk-action-feedback.tsx','utf8');
const css=readFileSync('src/app/globals.css','utf8');
test('mail notice is shared, content-sized and never replaces toolbar',()=>{
 assert.match(component,/if \(!message\) return null/);
 assert.doesNotMatch(component,/inset-x-0|top-0|min-h-14|bg-white/);
 assert.match(css,/\.mail-action-notice \{[\s\S]*?position: fixed;[\s\S]*?width: max-content;/);
 assert.match(css,/max-width: min\(28rem, calc\(100vw - 2rem\)\)/);
 assert.match(css,/\.dark \.mail-action-notice \{ background: #bbf7d0; color: #052e16/);
});
test('pending, error, accessible announcement and dismissal remain intact',()=>{
 for(const pattern of [/aria-live=\{error \? "assertive" : "polite"\}/,/aria-busy=\{pending\}/,/!pending && <button/,/aria-label=\{dismissLabel\}/,/onClick=\{onDismiss\}/,/pending && <LoaderCircle/])assert.match(component,pattern);
 assert.match(css,/\.dark \.mail-action-notice-error/);
 assert.match(css,/focus-visible/);
});
