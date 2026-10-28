// InsoMail modification, 2026-10-29. Covered by the repository AGPL-3.0 license.
import type { LicenseEntitlements } from "@/lib/licenses/types";

/** Local account policy, not a paid license or a claim of Team entitlement.
 * Admin authorization, account isolation and closed registration are unchanged.
 * Infrastructure and provider quotas still apply to all accounts together.
 */
export function applyInsoMailAccountPolicy(entitlements: LicenseEntitlements): LicenseEntitlements {
  return { ...entitlements, canManageAccounts: true, accountSeatLimit: null };
}
