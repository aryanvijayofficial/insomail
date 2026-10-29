import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(root, "tests", ".tmp-labels-contacts-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: {
		labelUtils: join(root, "src/lib/labels/utils.ts"),
		contactUtils: join(root, "src/app/api/contacts/utils.ts"),
	},
	outdir: outDir,
	outExtension: { ".js": ".mjs" },
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	tsconfig: join(root, "tsconfig.json"),
	external: ["better-sqlite3", "drizzle-orm", "drizzle-orm/*", "next", "next/*"],
	logLevel: "silent",
});
const load = (name) => import(pathToFileURL(join(outDir, `${name}.mjs`)).href);
const { wouldCreateLabelCycle, collectLabelDescendantIds, labelDepth } = await load("labelUtils");
const { promoteContactToSaved, unsaveContact } = await load("contactUtils");

const { migrations } = JSON.parse(readFileSync(new URL("../src/lib/migrations/bundle.json", import.meta.url), "utf8"));

function database(foreignKeys = false) {
	const sqlite = new Database(":memory:");
	sqlite.pragma(`foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
	for (const migration of migrations) for (const statement of migration.statements) sqlite.exec(statement);
	return sqlite;
}

const tree = [
	{ id: "a", parentId: null },
	{ id: "b", parentId: "a" },
	{ id: "c", parentId: "b" },
	{ id: "d", parentId: null },
];

test("migrations including 0081 apply cleanly to a fresh database", () => {
	const sqlite = database();
	const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('labels', 'message_labels') ORDER BY name").all();
	assert.deepEqual(tables, [{ name: "labels" }, { name: "message_labels" }]);
	sqlite.close();
});

test("label tree utils: depth, descendants, cycle detection", () => {
	assert.equal(labelDepth(tree, "a"), 1); // roots are depth 1
	assert.equal(labelDepth(tree, "c"), 3);
	assert.deepEqual(collectLabelDescendantIds(tree, "a").sort(), ["b", "c"]);
	assert.equal(wouldCreateLabelCycle(tree, "a", "c"), true);
	assert.equal(wouldCreateLabelCycle(tree, "c", "d"), false);
	assert.equal(wouldCreateLabelCycle(tree, "a", null), false);
});

function insertLabel(sqlite, id, name, parentId = null, mailboxId = "mb1") {
	sqlite.prepare("INSERT INTO labels (id, user_id, mailbox_id, name, color, parent_id, created_at) VALUES (?, 'u1', ?, ?, '#2563eb', ?, 1)").run(id, mailboxId, name, parentId);
}

function seedUserAndMailbox(sqlite) {
	sqlite.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES ('u1', 'u1@example.org', 'x', 'U1', 1)").run();
	sqlite.prepare("INSERT INTO domains (id, user_id, hostname, zone_id, status, created_at) VALUES ('d1', 'u1', 'example.org', 'z1', 'active', 1)").run();
	sqlite.prepare("INSERT INTO mailboxes (id, user_id, domain_id, local_part, created_at) VALUES ('mb1', 'u1', 'd1', 'inbox', 1)").run();
}

test("root label sibling names are unique case-insensitively within a mailbox", () => {
	const sqlite = database();
	insertLabel(sqlite, "l1", "Work");
	assert.throws(() => insertLabel(sqlite, "l2", "work"), /UNIQUE/);
	insertLabel(sqlite, "l3", "Work", null, "mb2"); // other mailbox is fine
	sqlite.close();
});

test("child label names are unique case-insensitively under one parent, free across parents", () => {
	const sqlite = database();
	insertLabel(sqlite, "p1", "Parent One");
	insertLabel(sqlite, "p2", "Parent Two");
	insertLabel(sqlite, "c1", "Receipts", "p1");
	assert.throws(() => insertLabel(sqlite, "c2", "RECEIPTS", "p1"), /UNIQUE/);
	insertLabel(sqlite, "c3", "Receipts", "p2");
	sqlite.close();
});

test("deleting a parent label cascades to its children", () => {
	const sqlite = database(true);
	seedUserAndMailbox(sqlite);
	insertLabel(sqlite, "p1", "Parent");
	insertLabel(sqlite, "c1", "Child", "p1");
	sqlite.prepare("DELETE FROM message_labels WHERE label_id = 'p1'").run();
	sqlite.prepare("DELETE FROM labels WHERE id = 'p1'").run();
	assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM labels").get().n, 0);
	sqlite.close();
});

test("message-label membership pair is unique", () => {
	const sqlite = database();
	insertLabel(sqlite, "l1", "Work");
	seedUserAndMailbox(sqlite);
	sqlite.prepare("INSERT INTO messages (id, user_id, mailbox_id, direction, from_addr, to_addr, status, created_at, read, starred) VALUES ('m1', 'u1', 'mb1', 'inbound', 'a@b.c', '[]', 'inbox', 1, 0, 0)").run();
	const membership = sqlite.prepare("INSERT INTO message_labels (message_id, label_id, created_at) VALUES ('m1', 'l1', 1)");
	membership.run();
	assert.throws(() => membership.run(), /UNIQUE/);
	sqlite.close();
});

function seedContact(sqlite, overrides = {}) {
	const row = {
		id: "u1:iris@example.org",
		user_id: "u1",
		email: "iris@example.org",
		display_name: "Iris",
		avatar_key: "avatar-1",
		source: "outbound",
		blocked: 1,
		remote_content_allowed: 1,
		last_seen_at: 1,
		created_at: 1,
		...overrides,
	};
	sqlite.prepare(
		"INSERT INTO contacts (id, user_id, email, display_name, avatar_key, source, blocked, remote_content_allowed, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	).run(row.id, row.user_id, row.email, row.display_name, row.avatar_key, row.source, row.blocked, row.remote_content_allowed, row.last_seen_at, row.created_at);
}

test("promoting a contact to saved preserves name, avatar, blocked flag and image allowance", async () => {
	const sqlite = database();
	seedContact(sqlite);
	const db = drizzle(sqlite);
	const contact = await promoteContactToSaved(db, { userId: "u1", email: "iris@example.org" });
	assert.equal(contact.source, "manual");
	assert.equal(contact.displayName, "Iris");
	assert.equal(contact.avatarKey, "avatar-1");
	assert.equal(contact.blocked, true);
	assert.equal(contact.remoteContentAllowed, true);
	sqlite.close();
});

test("promoting an unknown address inserts it as manual with the given name", async () => {
	const sqlite = database();
	const db = drizzle(sqlite);
	const contact = await promoteContactToSaved(db, { userId: "u1", email: "new@example.org", displayName: "New Person" });
	assert.equal(contact.source, "manual");
	assert.equal(contact.displayName, "New Person");
	sqlite.close();
});

test("unsaving a contact demotes it to inbound and keeps safety metadata", async () => {
	const sqlite = database();
	seedContact(sqlite, { source: "manual" });
	const db = drizzle(sqlite);
	const contact = await unsaveContact(db, { userId: "u1", email: "iris@example.org" });
	assert.equal(contact.source, "inbound");
	assert.equal(contact.displayName, "Iris");
	assert.equal(contact.blocked, true);
	assert.equal(contact.remoteContentAllowed, true);
	assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM contacts").get().n, 1);
	sqlite.close();
});

test("unsaving an unknown address returns null without inserting a row", async () => {
	const sqlite = database();
	const db = drizzle(sqlite);
	assert.equal(await unsaveContact(db, { userId: "u1", email: "ghost@example.org" }), null);
	assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM contacts").get().n, 0);
	sqlite.close();
});
