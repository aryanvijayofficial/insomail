import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('selected sent message displays its read-receipt status outside the email HTML', () => {
 const page = readFileSync('src/app/(dashboard)/inbox/[messageId]/page.tsx', 'utf8');
 assert.match(page, /import \{ MessageOpenStatus \}/);
 assert.match(page, /message.direction === "outbound" && message.status !== "draft" &&/);
 assert.match(page, /<MessageOpenStatus key=\{message.id\} messageId=\{message.id\} \/>/);
 assert.ok(page.indexOf('<MessageOpenStatus key=') < page.indexOf('<EmailHtmlRenderer key='));
});
