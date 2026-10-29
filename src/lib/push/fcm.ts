import { and, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { fcmDevices, sessions, users } from "@/db/schema";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import type { NewMessageNotification } from "@/lib/realtime/types";
type Config = {
	project_id: string;
	client_email: string;
	private_key: string;
	private_key_id: string;
};
function config(env: CloudflareEnv): Config | null {
	try {
		const c = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON ?? "");
		return c.project_id === "insomail" &&
			c.client_email ===
				"insomail-fcm-sender@insomail.iam.gserviceaccount.com" &&
			typeof c.private_key === "string" &&
			c.private_key.includes("BEGIN PRIVATE KEY") &&
			typeof c.private_key_id === "string"
			? c
			: null;
	} catch {
		return null;
	}
}
export function fcmConfigured(env: CloudflareEnv) {
	return config(env) !== null;
}
const encode = (value: Uint8Array) =>
	btoa(String.fromCharCode(...value))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
const json = (value: unknown) =>
	encode(new TextEncoder().encode(JSON.stringify(value)));
let cached: { key: string; token: string; expires: number } | null = null;
async function accessToken(c: Config) {
	if (cached?.key === c.private_key_id && cached.expires > Date.now())
		return cached.token;
	const der = Uint8Array.from(
		atob(c.private_key.replace(/-----[^-]+-----|\s/g, "")),
		(c) => c.charCodeAt(0),
	);
	const key = await crypto.subtle.importKey(
		"pkcs8",
		der,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
	const now = Math.floor(Date.now() / 1000),
		base =
			json({ alg: "RS256", typ: "JWT", kid: c.private_key_id }) +
			"." +
			json({
				iss: c.client_email,
				scope: "https://www.googleapis.com/auth/firebase.messaging",
				aud: "https://oauth2.googleapis.com/token",
				iat: now,
				exp: now + 3600,
			});
	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(base),
	);
	const r = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: base + "." + encode(new Uint8Array(signature)),
		}),
		signal: AbortSignal.timeout(10000),
	});
	if (!r.ok) throw new Error("FCM authorization failed");
	const data = (await r.json()) as {
		access_token?: string;
		expires_in?: number;
	};
	if (!data.access_token) throw new Error("FCM authorization response invalid");
	cached = {
		key: c.private_key_id,
		token: data.access_token,
		expires:
			Date.now() +
			Math.max(0, Math.min(data.expires_in ?? 3600, 3600) - 120) * 1000,
	};
	return cached.token;
}
export function fcmPayload(token: string, message: NewMessageNotification) {
	return {
		message: {
			token,
			notification: { title: "insoMail", body: "New message" },
			data: {
				type: "new_message",
				mailboxId: message.mailboxId,
				messageId: message.messageId,
			},
			android: {
				priority: "high",
				ttl: "300s",
				notification: { channel_id: "insomail_mail", tag: message.messageId },
			},
		},
	};
}
export async function sendFcmPush(
	env: CloudflareEnv,
	userIds: string[],
	message: NewMessageNotification,
) {
	const c = config(env);
	if (!c || !userIds.length) return;
	const db = getDb(env);
	const devices = await db
		.select({
			id: fcmDevices.id,
			token: fcmDevices.token,
			sessionId: fcmDevices.sessionId,
			userId: fcmDevices.userId,
		})
		.from(fcmDevices)
		.innerJoin(
			sessions,
			and(
				eq(fcmDevices.sessionId, sessions.id),
				eq(fcmDevices.userId, sessions.userId),
			),
		)
		.innerJoin(users, eq(fcmDevices.userId, users.id))
		.where(
			and(
				inArray(fcmDevices.userId, [...new Set(userIds)]),
				gt(sessions.expiresAt, new Date()),
				eq(users.disabled, false),
			),
		);
	if (!devices.length) return;
	let bearer: string;
	try {
		bearer = await accessToken(c);
	} catch {
		console.warn("FCM authorization unavailable");
		return;
	}
	// Bound concurrency and recheck session after potentially slow OAuth. Never log tokens or provider response bodies.
	for (const d of devices) {
		try {
			const [active] = await db
				.select({ id: sessions.id, role: users.role })
				.from(sessions)
				.innerJoin(users, eq(sessions.userId, users.id))
				.where(
					and(
						eq(sessions.id, d.sessionId),
						eq(sessions.userId, d.userId),
						gt(sessions.expiresAt, new Date()),
						eq(users.disabled, false),
					),
				)
				.limit(1);
			if (!active) continue;
			if (
				!(
					await getMailboxAccessLevel(
						db,
						{ id: d.userId, role: active.role },
						message.mailboxId,
					)
				)?.canRead
			)
				continue;
			const [current] = await db
				.select({ id: fcmDevices.id })
				.from(fcmDevices)
				.where(
					and(
						eq(fcmDevices.id, d.id),
						eq(fcmDevices.sessionId, d.sessionId),
						eq(fcmDevices.token, d.token),
					),
				)
				.limit(1);
			if (!current) continue;
			const r = await fetch(
				`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${bearer}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(fcmPayload(d.token, message)),
					signal: AbortSignal.timeout(10000),
				},
			);
			if (r.status === 404) {
				const data = (await r.json().catch(() => null)) as {
					error?: { details?: Array<{ errorCode?: string }> };
				} | null;
				if (data?.error?.details?.some((x) => x.errorCode === "UNREGISTERED"))
					await db
						.delete(fcmDevices)
						.where(
							and(
								eq(fcmDevices.id, d.id),
								eq(fcmDevices.token, d.token),
								eq(fcmDevices.sessionId, d.sessionId),
							),
						);
			} else if (!r.ok) {
				if (r.status === 401) cached = null;
				console.warn(`FCM delivery failed (${r.status})`);
			}
		} catch {
			console.warn("FCM delivery unavailable");
		}
	}
}
