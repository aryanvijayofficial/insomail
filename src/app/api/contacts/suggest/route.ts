import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { getEnv } from "@/lib/cloudflare";

const reply = (body: unknown, status = 200) =>
	Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

const MAX_SUGGESTIONS = 10;

function rankContacts<T extends { email: string; displayName: string | null; source: string; lastSeenAt: Date | null }>(
	rows: T[],
	needle: string,
): T[] {
	const q = needle.toLowerCase();
	const startsAtWord = (value: string) => value.startsWith(q) || value.includes(` ${q}`);
	const score = (row: T) => {
		const email = row.email.toLowerCase();
		const name = (row.displayName ?? "").toLowerCase();
		if (q && (email.startsWith(q) || startsAtWord(name))) return 0;
		return 1;
	};
	return rows
		.slice()
		.sort((a, b) =>
			score(a) - score(b)
			|| (a.source === "manual" ? 0 : 1) - (b.source === "manual" ? 0 : 1)
			|| (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0)
			|| a.email.localeCompare(b.email),
		);
}

/**
 * Compose typeahead: the CALLER's own saved directory (manual + outbound, never
 * blocked), ranked prefix-first. Works for any mailbox the caller can read;
 * a shared mailbox never exposes its owner's contacts.
 */
export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return reply({ error: "Unauthorized" }, 401);

	const query = new URL(request.url).searchParams;
	const mailboxId = query.get("mailboxId");
	const q = (query.get("q") ?? "").trim();
	if (q.length > 200) return reply({ error: "Search is limited to 200 characters" }, 400);

	const db = getDb(env);
	if (mailboxId) {
		const access = await getMailboxAccessLevel(db, user, mailboxId);
		if (!access?.canRead) return reply({ error: "Mailbox not found" }, 404);
	}

	const rows = await db
		.select({
			email: contacts.email,
			displayName: contacts.displayName,
			avatarKey: contacts.avatarKey,
			source: contacts.source,
			lastSeenAt: contacts.lastSeenAt,
		})
		.from(contacts)
		.where(and(eq(contacts.userId, user.id), inArray(contacts.source, ["manual", "outbound"]), eq(contacts.blocked, false)))
		.orderBy(desc(contacts.lastSeenAt))
		.limit(500);

	const needle = q.toLowerCase();
	const matches = needle
		? rows.filter((row) => row.email.toLowerCase().includes(needle) || (row.displayName ?? "").toLowerCase().includes(needle))
		: rows;

	return reply({
		contacts: rankContacts(matches, needle).slice(0, MAX_SUGGESTIONS).map(({ avatarKey, ...row }) => ({
			...row,
			hasAvatar: !!avatarKey,
		})),
	});
}
