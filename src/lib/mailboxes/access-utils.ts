// insoMail modification, 2026-10-29. Local capability, not a paid-license claim.
import type { AppDatabase } from "@/db";
export async function isTeamMailboxSharingEnabled(_db: AppDatabase): Promise<boolean> {
 return true;
}
