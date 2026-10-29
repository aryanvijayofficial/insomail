import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, messageTracking } from "@/db/schema";
import { isMissingTableError } from "@/lib/database-errors";
import { embeddedTrackingTokens, stripOwnedPixelImages } from "./self-open-utils";

export async function ownedTrackingTokens(env: CloudflareEnv, userId: string, tokens: string[]): Promise<Set<string>> {
 if (!tokens.length) return new Set();
 try {
  const rows = await getDb(env).select({ token: messageTracking.token }).from(messageTracking)
   .innerJoin(messages, eq(messages.id, messageTracking.messageId))
   .where(and(inArray(messageTracking.token, tokens), eq(messages.userId, userId)));
  return new Set(rows.map(row => row.token));
 } catch (error) { if (isMissingTableError(error)) return new Set(); throw error; }
}
/** Read-only response transformation: stored mail and recipient payloads stay unchanged. */
export async function suppressOwnPixels<T extends { htmlBody: string | null }>(env: CloudflareEnv, userId: string, rows: T[]): Promise<T[]> {
 const tokens = [...new Set(rows.flatMap(row => embeddedTrackingTokens(row.htmlBody ?? "")))];
 const owned = await ownedTrackingTokens(env, userId, tokens);
 return rows.map(row => ({ ...row, htmlBody: row.htmlBody === null ? null : stripOwnedPixelImages(row.htmlBody, owned) }));
}
