import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';const read=p=>readFileSync(p,'utf8');
test('compound email fields reserve real columns and stack below small breakpoint',()=>{for(const p of ['src/app/(admin)/mailboxes/page.tsx','src/app/(admin)/accounts/page.tsx','src/app/(admin)/accounts/account-aliases.tsx']){const s=read(p);assert.match(s,/grid-cols-\[auto_minmax\(0,1fr\)\] sm:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);assert.match(s,/max-sm:col-span-2/);}});
test('shared dialog matches help dialog header and square visible close target',()=>{const s=read('src/components/ui/dialog.tsx');assert.match(s,/h-8 w-8.*rounded-lg bg-neutral-50/);assert.match(s,/border-b border-neutral-100/);assert.match(s,/text-base font-semibold/);assert.match(s,/focus-visible:outline-2/)});
test('blocklist replacement is opt-in and removal remains separately confirmed',()=>{const s=read('src/app/(admin)/spam-filter/page.tsx');assert.match(s,/\(!source\|\|editing\)/);assert.match(s,/source==="settings"/);assert.match(s,/await confirm\(/);assert.match(s,/setEditing\(false\);setValue\(""\)/)});
test('browser-native confirmations are consistently replaced by cancel-first dialog',()=>{function scan(dir){for(const f of readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())scan(p);else if(p.endsWith('.tsx'))assert.doesNotMatch(read(p),/window\.confirm\(/,p)}}scan('src');const s=read('src/components/ui/confirmation-host.tsx');assert.match(s,/useConfirmDialog/);assert.match(read('src/components/providers.tsx'),/<ConfirmationHost/)});

test('backup history uses labelled mobile cards instead of clipping a fixed-width table', () => {
 const source = readFileSync('src/app/(admin)/backups/page.tsx', 'utf8');
 assert.match(source, /grid grid-cols-2 items-start/);
 assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_110px_110px_170px_120px\]/);
 assert.match(source, /aria-label=\{t\("backups.download"\)\}/);
 assert.match(source, /min-w-0 pr-16/);
});


test('compose footer wraps on narrow phones and sender label has a real gap',()=>{
 assert.match(read('src/components/compose/rich-text-editor.tsx'), /shrink-0 items-center gap-0.5 max-md:flex-wrap/);
 assert.match(read('src/components/compose/compose-form.tsx'), /px-4 py-1 flex flex-row items-center gap-2/);
});


test('booking editor replaces the list at narrow widths instead of clipping save controls',()=>{
 assert.match(read('src/app/(calendar)/booking/page.tsx'), /form && "max-xl:hidden"/);
 assert.match(read('src/app/(calendar)/booking/booking-editor.tsx'), /w-full xl:w-\[392px\]/);
});


test('booking native time inputs get full rows on phones so minutes and AM/PM stay visible',()=>{
 assert.match(read('src/app/(calendar)/booking/booking-editor.tsx'), /grid w-full grid-cols-\[minmax\(0,1fr\)_auto\] items-end gap-2 sm:flex/);
});


test('schedule sheet keeps timezone title readable and public booking branding wraps',()=>{
 assert.match(read('src/components/compose/schedule-send-sheet.tsx'), /min-w-0 flex-1 break-words text-center/);
 assert.match(read('src/app/book/[userId]/[eventId]/page.tsx'), /flex min-w-0 flex-wrap items-center gap-3/);
});
