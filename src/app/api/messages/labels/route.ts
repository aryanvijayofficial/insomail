import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { labels, messageLabels, messages } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";

interface BulkLabelPayload {
	messageIds?: string[];
	addLabelIds?: string[];
	removeLabelIds?: string[];
}

type SkipReason = "not_found" | "forbidden" | "label_mailbox_mismatch";

/**
 * Bulk label set/unset. Membership is per-message and independent of folders and
 * of archive/trash status. Every label must belong to the message's mailbox.
 */
export async function POST(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const payload = (await request.json()) as BulkLabelPayload;
	const messageIds = payload.messageIds?.filter(Boolean) ?? [];
	const addLabelIds = [...new Set(payload.addLabelIds?.filter(Boolean) ?? [])];
	const removeLabelIds = [...new Set(payload.removeLabelIds?.filter(Boolean) ?? [])];
	if (messageIds.length === 0 || (addLabelIds.length === 0 && removeLabelIds.length === 0)) {
		return NextResponse.json({ error: "Messages and labels are required" }, { status: 400 });
	}
	if (messageIds.length > 200) {
		return NextResponse.json({ error: "Too many messages" }, { status: 400 });
	}

	const db = getDb(env);
	const labelRows = [...addLabelIds, ...removeLabelIds].length
		? await db.select().from(labels).where(inArray(labels.id, [...new Set([...addLabelIds, ...removeLabelIds])]))
		: [];
	const labelById = new Map(labelRows.map((row) => [row.id, row]));

	const skipped: { id: string; reason: SkipReason }[] = [];

	const rows = await db
		.select({ id: messages.id, mailboxId: messages.mailboxId })
		.from(messages)
		.where(inArray(messages.id, messageIds));
	const rowById = new Map(rows.map((row) => [row.id, row]));

	let updated = 0;
	for (const messageId of messageIds) {
		const row = rowById.get(messageId);
		if (!row || !row.mailboxId) {
			skipped.push({ id: messageId, reason: "not_found" });
			continue;
		}
		const access = await getMailboxAccessLevel(db, user, row.mailboxId);
		if (!access?.canManage) {
			skipped.push({ id: messageId, reason: "forbidden" });
			continue;
		}
		const validAdd = addLabelIds.filter((labelId) => labelById.get(labelId)?.mailboxId === row.mailboxId);
		const validRemove = removeLabelIds.filter((labelId) => labelById.get(labelId)?.mailboxId === row.mailboxId);
		if (validAdd.length !== addLabelIds.length || validRemove.length !== removeLabelIds.length) {
			skipped.push({ id: messageId, reason: "label_mailbox_mismatch" });
			continue;
		}
		if (validRemove.length) {
			await db
				.delete(messageLabels)
				.where(and(eq(messageLabels.messageId, messageId), inArray(messageLabels.labelId, validRemove)));
		}
		for (const labelId of validAdd) {
			await db
				.insert(messageLabels)
				.values({ messageId, labelId })
				.onConflictDoNothing({ target: [messageLabels.messageId, messageLabels.labelId] });
		}
		updated += 1;
	}

	return NextResponse.json({ updated, skipped });
}
