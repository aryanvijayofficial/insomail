import { and, asc, count, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts, mailboxes, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { getMailboxDomainAddresses } from "@/lib/mailboxes/domain-addresses";
import { getEnv } from "@/lib/cloudflare";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request) {
 const env = getEnv(); const user = await getCurrentUser(env, request);
 if (!user) return reply({ error: "Unauthorized" }, 401);
 const query = new URL(request.url).searchParams; const mailboxId = query.get("mailboxId");
 if (!mailboxId) return reply({ error: "Mailbox is required" }, 400);
 const limit = Number(query.get("limit") ?? 50), offset = Number(query.get("offset") ?? 0), search = (query.get("q") ?? "").trim();
 if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0 || search.length > 200) return reply({ error: "Use limit 1 to 100, nonnegative offset and search up to 200 characters" }, 400);
 const db = getDb(env); const access = await getMailboxAccessLevel(db, user, mailboxId);
 if (!access?.canRead) return reply({ error: "Mailbox not found" }, 404);
 // Contacts are account-wide. A readable shared mailbox does not grant its owner's directory.
 if (access.mailbox.userId !== user.id) return reply({ error: "This mailbox does not share its owner's contact directory", code: "CONTACT_DIRECTORY_NOT_SHARED" }, 403);
 // Match the per-address endpoint's personal identity override, without per-contact lookups.
 const [[account], personalMailboxes] = await Promise.all([
  db.select({ name: users.name, avatarKey: users.avatarKey }).from(users).where(eq(users.id, user.id)).limit(1),
  db.select().from(mailboxes).where(and(eq(mailboxes.userId, user.id), eq(mailboxes.type, "personal"))),
 ]);
 const identityAddresses = new Set((await Promise.all(personalMailboxes.map(mailbox => getMailboxDomainAddresses(db, mailbox)))).flat());
 const columns = { id: contacts.id, email: contacts.email, displayName: contacts.displayName, avatarKey: contacts.avatarKey, source: contacts.source, blocked: contacts.blocked, lastSeenAt: contacts.lastSeenAt };
 type Row = { id: string; email: string; displayName: string | null; avatarKey: string | null; source: string; blocked: boolean; lastSeenAt: Date | null };
 const display = ({ id: _id, avatarKey, ...contact }: Row) => account && identityAddresses.has(contact.email)
  ? { ...contact, displayName: account.name, source: "manual", hasAvatar: !!account.avatarKey }
  : { ...contact, hasAvatar: !!avatarKey };
 const savedOnly = query.get("saved") === "1";
 const own = savedOnly
  ? and(eq(contacts.userId, user.id), inArray(contacts.source, ["manual", "outbound"]))
  : eq(contacts.userId, user.id);
 if (search) {
  // Filter the same synthesized display values returned to the client. Keyset chunks
  // keep queries bounded without dropping matches, truncating totals, or huge IN lists.
  const needle = search.toLowerCase(); let after: string | undefined; let total = 0;
  const page: ReturnType<typeof display>[] = [];
  for (;;) {
   const batch: Row[] = await db.select(columns).from(contacts).where(and(own, after ? gt(contacts.email, after) : undefined)).orderBy(asc(contacts.email)).limit(100);
   if (!batch.length) break;
   for (const row of batch) {
    const contact = display(row);
    if (!contact.email.toLowerCase().includes(needle) && !(contact.displayName ?? "").toLowerCase().includes(needle)) continue;
    if (total >= offset && page.length < limit) page.push(contact);
    total++;
   }
   after = batch[batch.length - 1].email;
   if (batch.length < 100) break;
  }
  return reply({ contacts: page, total, limit, offset, nextOffset: offset + page.length < total ? offset + page.length : null, scope: "own_account" });
 }
 const [rows, totals] = await Promise.all([
  db.select(columns).from(contacts).where(own).orderBy(asc(contacts.email), asc(contacts.id)).limit(limit).offset(offset),
  db.select({ total: count() }).from(contacts).where(own),
 ]);
 const total = totals[0]?.total ?? 0;
 return reply({ contacts: rows.map(display), total, limit, offset, nextOffset: offset + rows.length < total ? offset + rows.length : null, scope: "own_account" });
}
