import { and, asc, count, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { labels, messageLabels, messages } from "@/db/schema";
import { collectLabelDescendantIds, type LabelNode } from "@/lib/labels/utils";
import type { SessionUser } from "@/lib/auth/types";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";

type Db = ReturnType<typeof getDb>;

export async function getMailboxLabelAccess(db: Db, user: SessionUser, mailboxId: string) {
	const access = await getMailboxAccessLevel(db, user, mailboxId);
	if (!access?.canRead) return null;
	return { mailboxId: access.mailbox.id, mailboxUserId: access.mailbox.userId, canManage: access.canManage };
}

/** Statuses hidden from label views and label message counts: trash and spam. */
export const LABEL_EXCLUDED_STATUSES = ["trash", "spam"] as const;

export function listLabelsForMailbox(db: Db, mailboxId: string) {
	return db.select().from(labels).where(eq(labels.mailboxId, mailboxId)).orderBy(asc(labels.name));
}

export async function getLabelForMailbox(db: Db, labelId: string, mailboxId: string) {
	const [label] = await db
		.select()
		.from(labels)
		.where(and(eq(labels.id, labelId), eq(labels.mailboxId, mailboxId)))
		.limit(1);
	return label ?? null;
}

/**
 * Case-insensitive sibling-name conflict: same mailbox, same parent (NULL-safe),
 * same lowercased name, excluding an optional id (for renames).
 */
export async function findLabelSiblingConflict(
	db: Db,
	input: { mailboxId: string; parentId: string | null; name: string; excludeId?: string },
) {
	const rows = await db
		.select({ id: labels.id, name: labels.name, parentId: labels.parentId })
		.from(labels)
		.where(and(eq(labels.mailboxId, input.mailboxId), sql`lower(${labels.name}) = lower(${input.name})`));
	const needle = input.parentId ?? null;
	return rows.find((row) => (row.parentId ?? null) === needle && row.id !== input.excludeId) ?? null;
}

/** Adds descendantCount and messageCount (excluding trash/spam) to each label row. */
export async function withLabelStats<T extends LabelNode>(db: Db, rows: T[]) {
	if (rows.length === 0) return rows.map((row) => ({ ...row, descendantCount: 0, messageCount: 0 }));
	const membership = await db
		.select({ labelId: messageLabels.labelId, total: count() })
		.from(messageLabels)
		.innerJoin(messages, eq(messages.id, messageLabels.messageId))
		.where(
			and(
				inArray(messageLabels.labelId, rows.map((row) => row.id)),
				notInArray(messages.status, [...LABEL_EXCLUDED_STATUSES]),
			),
		)
		.groupBy(messageLabels.labelId);
	const counts = new Map(membership.map((row) => [row.labelId, row.total]));
	return rows.map((row) => ({
		...row,
		descendantCount: collectLabelDescendantIds(rows, row.id).length,
		messageCount: counts.get(row.id) ?? 0,
	}));
}
