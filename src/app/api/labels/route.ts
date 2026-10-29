import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { labels } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";

import { labelSchema } from "@/lib/validators";
import { findLabelSiblingConflict, getMailboxLabelAccess, listLabelsForMailbox, withLabelStats } from "./utils";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const url = new URL(request.url);
	const mailboxId = url.searchParams.get("mailboxId");
	if (!mailboxId) {
		return NextResponse.json({ labels: [] });
	}

	const db = getDb(env);
	const access = await getMailboxLabelAccess(db, user, mailboxId);
	if (!access) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const rows = await listLabelsForMailbox(db, mailboxId);
	return NextResponse.json({ labels: await withLabelStats(db, rows) });
}

export async function POST(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const parsed = labelSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const db = getDb(env);
	const access = await getMailboxLabelAccess(db, user, parsed.data.mailboxId);
	if (!access?.canManage) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const name = parsed.data.name.trim();
	const parentId = parsed.data.parentId ?? null;
	const existing = await listLabelsForMailbox(db, parsed.data.mailboxId);
	if (parentId) {
		const parent = existing.find((label) => label.id === parentId);
		if (!parent) {
			return NextResponse.json({ error: "Parent label not found" }, { status: 400 });
		}
	}
	if (await findLabelSiblingConflict(db, { mailboxId: parsed.data.mailboxId, parentId, name })) {
		return NextResponse.json({ error: "Label already exists" }, { status: 409 });
	}

	const id = newId("lbl");
	await db.insert(labels).values({
		id,
		userId: access.mailboxUserId,
		mailboxId: parsed.data.mailboxId,
		name,
		color: parsed.data.color,
		parentId,
	});
	return NextResponse.json({ id, mailboxId: parsed.data.mailboxId, name, color: parsed.data.color, parentId });
}
