// InsoMail modification, 2026-10-29. Free local plans, separate from vendor licenses.
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { users } from "@/db/schema";
export async function hasInsoMailTeamPlan(db: AppDatabase, userId: string): Promise<boolean> {
 const [user] = await db.select({plan:users.insomailPlan}).from(users).where(eq(users.id,userId)).limit(1);
 return user?.plan === "team";
}
