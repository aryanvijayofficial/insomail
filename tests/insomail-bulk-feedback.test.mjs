import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync('src/components/messages/message-folder-page.tsx','utf8');
const feedback=readFileSync('src/components/messages/bulk-action-feedback.tsx','utf8');
test('bulk action locks before confirmation and clears lock on settle',()=>{assert.match(page,/if \(bulkActionLock.current\) return/);assert.match(page,/bulkActionLock.current = true/);assert.match(page,/finally \{\s*bulkActionLock.current = false/s);});
test('bulk operation reports pending, success and failure without shifting rows',()=>{assert.match(page,/action === "delete" \? t\("mailbox.deleting"\)/);assert.match(page,/setBulkStatus\(t\("common.done"\)\)/);assert.match(page,/message=\{actionError \?\? bulkStatus\}/);assert.match(feedback,/absolute inset-x-0 top-0/);assert.match(feedback,/aria-busy=\{pending\}/);assert.match(feedback,/motion-reduce:animate-none/);});
