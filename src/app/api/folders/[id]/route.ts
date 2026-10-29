import { and, eq, ne, notExists, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { folders, messages, routingRules } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getEnv } from "@/lib/cloudflare";
import { readJsonBody } from "@/lib/http/request";
import { isUniqueConstraintError } from "@/lib/database-errors";
import { getMailboxFolderAccess } from "../utils";

type Context = { params: Promise<{ id: string }> };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function context(request: Request, params: Context["params"]) {
 const env = getEnv(); const user = await getCurrentUser(env, request);
 if (!user) return { error: reply({ error: "Unauthorized" }, 401) };
 if (!hasValidSessionMutationOrigin(request)) return { error: reply({ error: "Invalid origin" }, 403) };
 const mailboxId = new URL(request.url).searchParams.get("mailboxId");
 if (!mailboxId) return { error: reply({ error: "Mailbox is required" }, 400) };
 const db = getDb(env); const access = await getMailboxFolderAccess(db, user, mailboxId);
 if (!access?.canManage) return { error: reply({ error: "Folder not found" }, 404) };
 const { id } = await params;
 const [folder] = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.mailboxId, mailboxId))).limit(1);
 if (!folder) return { error: reply({ error: "Folder not found" }, 404) };
 return { db, folder, mailboxId };
}
export async function PATCH(request: Request, { params }: Context) {
 const ctx = await context(request, params); if (ctx.error) return ctx.error;
 let body: unknown; try { body = await readJsonBody(request, 4096); } catch { return reply({ error: "Invalid folder request" }, 400); }
 const name = body && typeof body === "object" && "name" in body && typeof body.name === "string" ? body.name.trim() : "";
 if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return reply({ error: "Use a folder name of 1 to 80 characters" }, 400);
 const [duplicate] = await ctx.db.select({ id: folders.id }).from(folders).where(and(eq(folders.mailboxId, ctx.mailboxId), eq(folders.name, name), ne(folders.id, ctx.folder.id))).limit(1);
 if (duplicate) return reply({ error: "Folder already exists" }, 409);
 try {
  const [folder] = await ctx.db.update(folders).set({ name }).where(and(eq(folders.id, ctx.folder.id), eq(folders.mailboxId, ctx.mailboxId))).returning();
  return folder ? reply({ folder }) : reply({ error: "Folder not found" }, 404);
 } catch (error) { if (isUniqueConstraintError(error)) return reply({ error: "Folder already exists" }, 409); throw error; }
}
export async function DELETE(request: Request, { params }: Context) {
 const ctx = await context(request, params); if (ctx.error) return ctx.error;
 // Single conditional statement closes the check/delete race. Never move mail or alter rules.
 const unused = and(
  notExists(ctx.db.select({ value: sql`1` }).from(messages).where(eq(messages.folderId, ctx.folder.id))),
  notExists(ctx.db.select({ value: sql`1` }).from(routingRules).where(eq(routingRules.folderId, ctx.folder.id))),
 );
 const removed = await ctx.db.delete(folders).where(and(eq(folders.id, ctx.folder.id), eq(folders.mailboxId, ctx.mailboxId), unused)).returning({ id: folders.id });
 if (!removed.length) return reply({ error: "Only an empty folder with no routing rules can be deleted. Move its messages and update its rules first.", code: "FOLDER_IN_USE" }, 409);
 return reply({ ok: true, deletedId: ctx.folder.id });
}
