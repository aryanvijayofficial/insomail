import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { fcmDevices } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import {
	hashSessionToken,
	getSessionFromToken,
	getSessionTokenFromRequestHeaders,
} from "@/lib/auth/session";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";
import { fcmConfigured } from "@/lib/push/fcm";
const installation = z
	.string()
	.min(16)
	.max(128)
	.regex(/^[A-Za-z0-9_-]+$/);
const putSchema = z
	.object({
		installationId: installation,
		fcmToken: z
			.string()
			.min(20)
			.max(4096)
			.regex(/^[A-Za-z0-9_:.~-]+$/),
		platform: z.literal("android"),
	})
	.strict();
const deleteSchema = z.object({ installationId: installation }).strict();
async function body(request: Request) {
	if (Number(request.headers.get("Content-Length") ?? 0) > 8192) return null;
	const reader = request.body?.getReader();
	if (!reader) return null;
	let bytes = 0,
		text = "";
	const decoder = new TextDecoder();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > 8192) {
				await reader.cancel();
				return null;
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
		return JSON.parse(text);
	} catch {
		return null;
	} finally {
		reader.releaseLock();
	}
}
async function context(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return { error: auth.error } as const;
	if (!hasValidSessionMutationOrigin(request))
		return {
			error: Response.json({ error: "Invalid origin" }, { status: 403 }),
		} as const;
	const session = await getSessionFromToken(
		env,
		getSessionTokenFromRequestHeaders(request),
	);
	if (!session || session.userId !== auth.user.id)
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401 }),
		} as const;
	return { env, user: auth.user, session, error: null } as const;
}
export async function PUT(request: Request) {
	const c = await context(request);
	if (c.error) return c.error;
	const parsed = putSchema.safeParse(await body(request).catch(() => null));
	if (!parsed.success)
		return Response.json(
			{ error: "Invalid Android push registration" },
			{ status: 400 },
		);
	if (!fcmConfigured(c.env))
		return Response.json(
			{ error: "Android push is not configured", code: "FCM_NOT_CONFIGURED" },
			{ status: 503 },
		);
	const db = getDb(c.env),
		now = new Date(),
		tokenHash = await hashSessionToken(parsed.data.fcmToken);
	// Atomic rotation: one token per user's installation. A token's possession permits account switch.
	await db.batch([
		db
			.delete(fcmDevices)
			.where(
				and(
					eq(fcmDevices.userId, c.user.id),
					eq(fcmDevices.installationId, parsed.data.installationId),
				),
			),
		db
			.insert(fcmDevices)
			.values({
				id: newId("fcm"),
				userId: c.user.id,
				sessionId: c.session.id,
				installationId: parsed.data.installationId,
				token: parsed.data.fcmToken,
				tokenHash,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: fcmDevices.tokenHash,
				set: {
					id: newId("fcm"),
					userId: c.user.id,
					sessionId: c.session.id,
					installationId: parsed.data.installationId,
					updatedAt: now,
				},
			}),
	]);
	return Response.json({ ok: true });
}
export async function DELETE(request: Request) {
	const c = await context(request);
	if (c.error) return c.error;
	const parsed = deleteSchema.safeParse(await body(request).catch(() => null));
	if (!parsed.success)
		return Response.json(
			{ error: "Invalid Android installation" },
			{ status: 400 },
		);
	await getDb(c.env)
		.delete(fcmDevices)
		.where(
			and(
				eq(fcmDevices.userId, c.user.id),
				eq(fcmDevices.sessionId, c.session.id),
				eq(fcmDevices.installationId, parsed.data.installationId),
			),
		);
	return Response.json({ ok: true });
}
