import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { labels, messageLabels } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { collectLabelDescendantIds, wouldCreateLabelCycle } from "@/lib/labels/utils";
import { updateLabelSchema } from "@/lib/validators";
import { findLabelSiblingConflict, getLabelForMailbox, getMailboxLabelAccess, listLabelsForMailbox } from "../utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
	const { id } = await context.params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const parsed = updateLabelSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const db = getDb(env);
	const mailboxId = parsed.data.mailboxId;
	const access = await getMailboxLabelAccess(db, user, mailboxId);
	if (!access?.canManage) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}
	const label = await getLabelForMailbox(db, id, mailboxId);
	if (!label) {
		return NextResponse.json({ error: "Label not found" }, { status: 404 });
	}

	const name = parsed.data.name?.trim() ?? label.name;
	const parentId = parsed.data.parentId === undefined ? label.parentId : parsed.data.parentId;
	const color = parsed.data.color ?? label.color;

	const all = await listLabelsForMailbox(db, mailboxId);
	if (parentId !== label.parentId) {
		if (parentId && !all.some((row) => row.id === parentId)) {
			return NextResponse.json({ error: "Parent label not found" }, { status: 400 });
		}
		if (wouldCreateLabelCycle(all, id, parentId)) {
			return NextResponse.json({ error: "A label cannot be nested under itself or its descendants" }, { status: 400 });
		}
	}
	if (await findLabelSiblingConflict(db, { mailboxId, parentId, name, excludeId: id })) {
		return NextResponse.json({ error: "Label already exists" }, { status: 409 });
	}

	await db
		.update(labels)
		.set({ name, color, parentId })
		.where(and(eq(labels.id, id), eq(labels.mailboxId, mailboxId)));
	return NextResponse.json({ id, mailboxId, name, color, parentId });
}

export async function DELETE(request: Request, context: RouteContext) {
	const { id } = await context.params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const url = new URL(request.url);
	const mailboxId = url.searchParams.get("mailboxId");
	if (!mailboxId) {
		return NextResponse.json({ error: "Mailbox is required" }, { status: 400 });
	}

	const db = getDb(env);
	const access = await getMailboxLabelAccess(db, user, mailboxId);
	if (!access?.canManage) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}
	const label = await getLabelForMailbox(db, id, mailboxId);
	if (!label) {
		return NextResponse.json({ error: "Label not found" }, { status: 404 });
	}

	// labels.parent_id cascades, so one delete removes the whole subtree and its
	// message_labels rows; the count is reported so clients can confirm impact first.
	const all = await listLabelsForMailbox(db, mailboxId);
	const descendantIds = collectLabelDescendantIds(all, id);
	const removed = [id, ...descendantIds];
	await db.delete(messageLabels).where(inArray(messageLabels.labelId, removed));
	await db.delete(labels).where(and(eq(labels.id, id), eq(labels.mailboxId, mailboxId)));
	return NextResponse.json({ ok: true, deletedLabels: removed.length });
}
