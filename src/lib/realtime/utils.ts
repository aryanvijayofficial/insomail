import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mailboxAccess, mailboxes } from "@/db/schema";
import { isTeamMailboxSharingEnabled } from "@/lib/mailboxes/access-utils";
import type { NewMessageNotification, AgentDraftNotification } from "./types";
import { sendPushNotifications } from "@/lib/push/server";
import { sendFcmPush } from "@/lib/push/fcm";
import { sendNativePush } from "@/lib/push/native";

export function getSessionTokenFromRequest(request: Request): string | undefined {
	const cookie = request.headers.get("Cookie");
	if (!cookie) return undefined;

	for (const part of cookie.split(";")) {
		const [name, ...valueParts] = part.trim().split("=");
		if (name === "ep_session") {
			const value = valueParts.join("=");
			return value ? decodeURIComponent(value) : undefined;
		}
	}

	return undefined;
}

export async function getMailboxNotificationUserIds(
	env: CloudflareEnv,
	mailboxId: string,
	_ownerUserId: string,
): Promise<string[]> {
	const db = getDb(env);
	const mailboxRows = await db
		.select({ ownerUserId: mailboxes.userId, type: mailboxes.type, disabled: mailboxes.disabled })
		.from(mailboxes)
		.where(eq(mailboxes.id, mailboxId))
		.limit(1);
	if (!mailboxRows[0] || mailboxRows[0].disabled) return [];
	const sharedUserIds = mailboxRows[0]?.type === "shared" && await isTeamMailboxSharingEnabled(db)
		? (await db
			.select({ userId: mailboxAccess.userId })
			.from(mailboxAccess)
			.where(eq(mailboxAccess.mailboxId, mailboxId)))
			.map((access) => access.userId)
		: [];

	return [
		...new Set([
			mailboxRows[0].ownerUserId,
			...sharedUserIds,
		].filter((userId): userId is string => !!userId)),
	];
}

export async function notifyUsersOfNewMessage(
	env: CloudflareEnv,
	userIds: string[],
	payload: NewMessageNotification | AgentDraftNotification,
): Promise<void> {
	// Next dev uses a bindings-only proxy; realtime delivery runs in worker.ts.
	if (!env.REALTIME) return;
	const results = await Promise.allSettled([
		...userIds.map((userId) => {
			const hub = env.REALTIME.getByName(userId);
			return hub.fetch("https://mailflare-realtime/notify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		}),
		...(payload.type === "agent_draft" ? [] : [sendPushNotifications(env, userIds, payload), sendNativePush(env, userIds, payload), sendFcmPush(env, userIds, payload)]),
	]);
	for (const result of results) {
		if (result.status === "rejected") console.error("New-message notification failed", result.reason);
	}
}
