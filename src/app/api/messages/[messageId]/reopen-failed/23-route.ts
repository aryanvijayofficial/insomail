import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages, outboundJobs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";

/** Turns a failed send back into a draft so it can be edited and sent again. */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ messageId: string }> },
) {
	const { messageId } = await params;
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const db = getDb(env);
	const [message] = await db
		.select({ id: messages.id, mailboxId: messages.mailboxId, direction: messages.direction, status: messages.status })
		.from(messages)
		.where(eq(messages.id, messageId))
		.limit(1);
	if (!message?.mailboxId) return NextResponse.json({ error: "Message not found" }, { status: 404 });

	const access = await getMailboxAccessLevel(db, user, message.mailboxId);
	if (!access?.canRead) return NextResponse.json({ error: "Message not found" }, { status: 404 });
	if (!access.canSendAs && !access.canSendOnBehalf) {
		return NextResponse.json({ error: "You cannot send from this mailbox" }, { status: 403 });
	}
	if (message.direction !== "outbound" || message.status !== "failed") {
		return NextResponse.json({ error: "This message did not fail to send" }, { status: 409 });
	}
	await db.update(messages).set({ status: "draft" }).where(and(eq(messages.id, messageId), eq(messages.status, "failed")));
	await db.delete(outboundJobs).where(and(eq(outboundJobs.messageId, messageId), eq(outboundJobs.status, "failed")));
	return NextResponse.json({ ok: true });
}
