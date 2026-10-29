import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, webcrypto } from "node:crypto";
import test, { after } from "node:test";
import { build } from "esbuild";
const root = process.cwd(),
	out = mkdtempSync(join(root, "tests", ".tmp-fcm-"));
const originalFetch = globalThis.fetch;
globalThis.crypto ??= webcrypto;
after(() => {
	rmSync(out, { recursive: true, force: true });
	delete globalThis.fcmFixture;
	globalThis.fetch = originalFetch;
});
await build({
	entryPoints: {
		route: "src/app/api/mobile/push/fcm/route.ts",
		fcm: "src/lib/push/fcm.ts",
		database: "server/runtime/sqlite-database.ts",
		migrate: "server/runtime/migrate.ts",
	},
	outdir: out,
	outExtension: { ".js": ".mjs" },
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
	logLevel: "silent",
	plugins: [
		{
			name: "auth",
			setup(b) {
				b.onResolve({ filter: /^next\/server$/ }, () => ({
					path: "next/server",
					namespace: "next-mock",
				}));
				b.onLoad({ filter: /.*/, namespace: "next-mock" }, () => ({
					contents: "export const NextResponse=Response;",
					loader: "js",
				}));
				b.onResolve(
					{ filter: /^@\/lib\/(cloudflare|auth\/cookies)$/ },
					(a) => ({ path: a.path, namespace: "mock" }),
				);
				b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
					contents: a.path.endsWith("cloudflare")
						? "export function getEnv(){return globalThis.fcmFixture.env}"
						: "export async function getCurrentUser(){return globalThis.fcmFixture.user}",
					loader: "js",
				}));
			},
		},
	],
});
const route = await import(pathToFileURL(join(out, "route.mjs"))),
	fcm = await import(pathToFileURL(join(out, "fcm.mjs"))),
	{ SqliteDatabase } = await import(pathToFileURL(join(out, "database.mjs"))),
	{ applyMigrations } = await import(pathToFileURL(join(out, "migrate.mjs")));
const hash = (x) => createHash("sha256").update(x).digest("hex");
const config = {
	project_id: "insomail",
	client_email: "insomail-fcm-sender@insomail.iam.gserviceaccount.com",
	private_key_id: "fixture-key",
	private_key: "-----BEGIN PRIVATE KEY-----fixture-----END PRIVATE KEY-----",
};
async function fixture(t) {
	const db = new SqliteDatabase(":memory:");
	t.after(() => db.db.close());
	await applyMigrations(db, join(root, "drizzle/migrations"));
	db.db.exec(
		`INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES('owner','owner@example.test','Owner','x','admin',0),('other','other@example.test','Other','x','user',0);INSERT INTO domains(id,user_id,hostname,zone_id,created_at) VALUES('d','owner','example.test','z',0);INSERT INTO mailboxes(id,user_id,domain_id,local_part,type,disabled,created_at) VALUES('mine','owner','d','owner','personal',0,0),('foreign','other','d','other','personal',0,0);`,
	);
	for (const [id, userId] of [
		["s1", "owner"],
		["s2", "owner"],
		["s3", "other"],
	])
		db.db
			.prepare(
				"INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,0)",
			)
			.run(id, userId, hash(id), Math.floor(Date.now() / 1000) + 3600);
	globalThis.fcmFixture = {
		env: { DB: db, FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(config) },
		user: { id: "owner", email: "owner@example.test", role: "admin" },
	};
	return db.db;
}
const installationId = "install_0123456789",
	token = "fixture_token_01234567890123456789";
const req = (method, body, session = "s1", headers = {}) =>
	new Request("https://insomail.test/api/mobile/push/fcm", {
		method,
		headers: {
			"Content-Type": "application/json",
			...(session ? { Authorization: "Bearer " + session } : {}),
			...headers,
		},
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
const put = (extra = {}) => ({
	installationId,
	fcmToken: token,
	platform: "android",
	...extra,
});
test("FCM registration authenticates current session, validates strict body and origin", async (t) => {
	const db = await fixture(t);
	for (const body of [
		null,
		{},
		put({ platform: "ios" }),
		put({ userId: "other" }),
		put({ fcmToken: "short" }),
		put({ installationId: "x" }),
		put({ fcmToken: "x".repeat(4097) }),
	])
		assert.equal((await route.PUT(req("PUT", body))).status, 400);
	assert.equal((await route.PUT(req("PUT", put(), null))).status, 403);
	assert.equal((await route.PUT(req("PUT", put(), "absent"))).status, 401);
	assert.equal((await route.PUT(req("PUT", put(), "s3"))).status, 401);
	assert.equal((await route.PUT(req("PUT", "bad json"))).status, 400);
	assert.equal((await route.PUT(req("PUT", "x".repeat(9000)))).status, 400);
	globalThis.fcmFixture.user = null;
	assert.equal((await route.PUT(req("PUT", put()))).status, 401);
	assert.equal(db.prepare("select count(*) n from fcm_devices").get().n, 0);
});
test("rotation, session rebinding, logout and account-switch cannot cross-delete", async (t) => {
	const db = await fixture(t);
	assert.deepEqual(await (await route.PUT(req("PUT", put()))).json(), {
		ok: true,
	});
	const first = db.prepare("select * from fcm_devices").get();
	assert.equal(first.user_id, "owner");
	assert.equal(first.token_hash, hash(token));
	await route.PUT(req("PUT", put({ fcmToken: token + "new" })));
	assert.equal(
		db.prepare("select token from fcm_devices").get().token,
		token + "new",
	);
	await route.PUT(req("PUT", put(), "s2"));
	assert.equal(
		db.prepare("select session_id from fcm_devices").get().session_id,
		"s2",
	);
	await route.DELETE(req("DELETE", { installationId }));
	assert.equal(db.prepare("select count(*) n from fcm_devices").get().n, 1);
	globalThis.fcmFixture.user = { id: "other", role: "user" };
	await route.PUT(req("PUT", put(), "s3"));
	assert.equal(
		db.prepare("select user_id from fcm_devices").get().user_id,
		"other",
	);
	globalThis.fcmFixture.user = { id: "owner", role: "admin" };
	await route.DELETE(req("DELETE", { installationId }, "s2"));
	assert.equal(db.prepare("select count(*) n from fcm_devices").get().n, 1);
	db.prepare("DELETE FROM sessions where id=?").run("s3");
	assert.equal(db.prepare("select count(*) n from fcm_devices").get().n, 0);
});
test("unconfigured environment reports 503 but unregister stays idempotent", async (t) => {
	await fixture(t);
	delete globalThis.fcmFixture.env.FCM_SERVICE_ACCOUNT_JSON;
	assert.equal((await route.PUT(req("PUT", put()))).status, 503);
	assert.equal(
		(await route.DELETE(req("DELETE", { installationId }))).status,
		200,
	);
	assert.equal(
		(await route.DELETE(req("DELETE", { installationId }))).status,
		200,
	);
	assert.equal(
		(await route.DELETE(req("DELETE", { installationId, userId: "other" })))
			.status,
		400,
	);
});
const message = {
	type: "new_message",
	mailboxId: "mine",
	messageId: "m1",
	from: "private@example.test",
	fromName: "Private Person",
	subject: "Private Subject",
};
test("content-free wire payload contains only routing identifiers", () => {
	const p = fcm.fcmPayload(token, message);
	assert.deepEqual(p.message.notification, {
		title: "insoMail",
		body: "New message",
	});
	assert.deepEqual(p.message.data, {
		type: "new_message",
		mailboxId: "mine",
		messageId: "m1",
	});
	assert.equal(p.message.android.notification.channel_id, "insomail_mail");
	assert.equal(JSON.stringify(p).includes("Private"), false);
	assert.equal(
		fcm.fcmConfigured({
			FCM_SERVICE_ACCOUNT_JSON: JSON.stringify({
				...config,
				project_id: "foreign",
			}),
		}),
		false,
	);
});
let credential;
async function signedConfig() {
	if (!credential) {
		const kp = await crypto.subtle.generateKey(
			{
				name: "RSASSA-PKCS1-v1_5",
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256",
			},
			true,
			["sign", "verify"],
		);
		const der = Buffer.from(
			await crypto.subtle.exportKey("pkcs8", kp.privateKey),
		).toString("base64");
		credential = {
			...config,
			private_key:
				"-----BEGIN PRIVATE KEY-----\n" + der + "\n-----END PRIVATE KEY-----",
			publicKey: kp.publicKey,
		};
	}
	return credential;
}
test("HTTP v1 signs OAuth, sends generic payload, caches token and removes only UNREGISTERED registration", async (t) => {
	const db = await fixture(t),
		c = await signedConfig();
	globalThis.fcmFixture.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify(c);
	await route.PUT(req("PUT", put()));
	const calls = [];
	globalThis.fetch = async (url, init) => {
		calls.push([url, init]);
		if (url.includes("oauth2")) {
			const assertion = init.body.get("assertion"),
				[h, p, s] = assertion.split(".");
			assert.equal(
				await crypto.subtle.verify(
					"RSASSA-PKCS1-v1_5",
					c.publicKey,
					Buffer.from(s, "base64url"),
					new TextEncoder().encode(h + "." + p),
				),
				true,
			);
			assert.equal(
				JSON.parse(Buffer.from(p, "base64url")).aud,
				"https://oauth2.googleapis.com/token",
			);
			return Response.json({
				access_token: "fixture-bearer",
				expires_in: 3600,
			});
		}
		assert.equal(init.headers.Authorization, "Bearer fixture-bearer");
		assert.equal(JSON.parse(init.body).message.token, token);
		return Response.json({ name: "fixture" });
	};
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	assert.equal(calls.length, 3);
	globalThis.fetch = async () =>
		Response.json(
			{ error: { details: [{ errorCode: "UNREGISTERED" }] } },
			{ status: 404 },
		);
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	assert.equal(db.prepare("select count(*) n from fcm_devices").get().n, 0);
});
test("revoked/expired sessions, disabled users, foreign mailbox and removed ownership receive no FCM send", async (t) => {
	const db = await fixture(t),
		c = await signedConfig();
	globalThis.fcmFixture.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify(c);
	await route.PUT(req("PUT", put()));
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		throw Error("unexpected");
	};
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["other"], message);
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], {
		...message,
		mailboxId: "foreign",
	});
	db.exec("UPDATE users SET disabled=1 WHERE id='owner'");
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	db.exec("UPDATE users SET disabled=0;UPDATE sessions SET expires_at=0");
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	db.exec("DELETE FROM sessions");
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	assert.equal(calls, 0);
});

test("stale UNREGISTERED response cannot erase an account-switch registration", async (t) => {
	const db = await fixture(t),
		c = await signedConfig();
	globalThis.fcmFixture.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify(c);
	await route.PUT(req("PUT", put()));
	globalThis.fetch = async () => {
		globalThis.fcmFixture.user = { id: "other", role: "user" };
		assert.equal((await route.PUT(req("PUT", put(), "s3"))).status, 200);
		return Response.json(
			{ error: { details: [{ errorCode: "UNREGISTERED" }] } },
			{ status: 404 },
		);
	};
	await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
	assert.equal(
		db.prepare("select user_id from fcm_devices").get().user_id,
		"other",
	);
});
test("transient and generic 404 failures keep registration for retry", async (t) => {
	const db = await fixture(t),
		c = await signedConfig();
	globalThis.fcmFixture.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify(c);
	await route.PUT(req("PUT", put()));
	for (const status of [404, 429, 500]) {
		globalThis.fetch = async () =>
			Response.json({ error: { status: "NOT_FOUND" } }, { status });
		await fcm.sendFcmPush(globalThis.fcmFixture.env, ["owner"], message);
		assert.equal(db.prepare("select count(*) n from fcm_devices").get().n, 1);
	}
});
