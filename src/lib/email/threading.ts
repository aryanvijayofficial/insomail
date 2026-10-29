import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/db";
import { messages, outboundJobs } from "@/db/schema";
import { getResendApiKey, getResendDeliveredMessageId } from "@/lib/email/outbound-provider";
import { newId } from "@/lib/ids";
import type { ResolveThreadInput } from "@/lib/email/threading-types";
import { normalizeMessageId, selectThreadLookupIds } from "@/lib/email/thread-lookup";

export { normalizeMessageId } from "@/lib/email/thread-lookup";

type Db = ReturnType<typeof getDb>;

/** A References header is a whitespace (occasionally comma) separated list of Message-IDs. */
export function parseMessageIdList(value: string | null | undefined): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const token of (value ?? "").split(/[\s,]+/)) {
		const id = normalizeMessageId(token);
		if (!id || seen.has(id)) continue;
		seen.add(id);
		result.push(id);
	}
	return result;
}

export function formatMessageIdHeader(ids: string[]): string {
	return ids.map((id) => `<${id}>`).join(" ");
}

/**
 * The References line a reply should carry: the parent's own chain followed by
 * the parent itself. Long chains keep the root and the most recent ancestors,
 * which is what mail clients use to reconstruct a conversation.
 */
export function buildReplyReferences(parentReferences: string[], parentMessageId: string | null): string[] {
	const ids = [...parentReferences];
	const parent = normalizeMessageId(parentMessageId);
	if (parent && !ids.includes(parent)) ids.push(parent);
	const MAX = 30;
	if (ids.length <= MAX) return ids;
	return [ids[0], ...ids.slice(ids.length - (MAX - 1))];
}

/**
 * Work out which conversation a message belongs to. A reply names its parent in
 * In-Reply-To or References; if that parent is stored in the same mailbox, the
 * new message joins the parent's thread. Otherwise it starts a thread keyed by
 * its own Message-ID so later replies can find it.
 */
export async function resolveThreadId(db: Db, input: ResolveThreadInput, env?: CloudflareEnv): Promise<string> {
	const candidates = selectThreadLookupIds(input.inReplyTo, input.references ?? []);

	if (input.mailboxId && candidates.length > 0) {
		// Stored Message-IDs may or may not include their angle brackets.
		const variants = candidates.flatMap((id) => [id, `<${id}>`]);
		const [parent] = await db
			.select({ threadId: messages.threadId, providerMessageId: messages.providerMessageId })
			.from(messages)
			.where(and(eq(messages.mailboxId, input.mailboxId), inArray(messages.providerMessageId, variants)))
			.orderBy(asc(messages.createdAt))
			.limit(1);
		if (parent) {
			return parent.threadId ?? normalizeMessageId(parent.providerMessageId) ?? newId("thr");
		}
	}


 // For rewritten Resend IDs, use the retained provider email ID to recover an exact
 // References match. Never join by subject, participant or time alone.
 if (env && input.mailboxId && candidates.length) {
  const jobs = await db.select({ payload: outboundJobs.payload, threadId: messages.threadId, providerMessageId: messages.providerMessageId })
   .from(outboundJobs).innerJoin(messages, eq(messages.id, outboundJobs.messageId))
   .where(and(eq(messages.mailboxId, input.mailboxId), eq(outboundJobs.status, "sent")))
   .orderBy(desc(outboundJobs.createdAt)).limit(10);
  const retained = jobs.flatMap(job => { try { const value = JSON.parse(job.payload).providerDeliveryId; return typeof value === "string" ? [{ ...job, deliveryId: value }] : []; } catch { return []; } });
  if (retained.length) {
   const key = await getResendApiKey(env).catch(() => null);
   if (key) for (const job of retained) {
    const actual = normalizeMessageId(await getResendDeliveredMessageId(key, job.deliveryId));
    if (actual && candidates.includes(actual)) return job.threadId ?? normalizeMessageId(job.providerMessageId) ?? actual;
   }
  }
 }

	return normalizeMessageId(input.messageId) ?? newId("thr");
}
