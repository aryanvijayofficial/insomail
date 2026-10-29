import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const form=readFileSync('src/components/compose/compose-form.tsx','utf8');const recipients=readFileSync('src/components/compose/recipient-input.tsx','utf8');
test('composer labels have a consistent reserved width and gap before padded controls',()=>{
 for(const source of [form,recipients]){assert.match(source,/w-10 shrink-0 text-sm text-neutral-500/);assert.match(source,/items-center gap-3/);}
 assert.match(form,/h-8 px-2 py-1 text-sm shadow-none/);
 assert.match(form,/h-8 border-0 px-2 py-1 shadow-none/);
 assert.match(recipients,/min-w-0 flex-1 flex-wrap items-center gap-1.5 px-2/);
});
