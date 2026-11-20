import { findZoneByHostname } from "@/lib/cloudflare-api";
import type { DomainPreflightResult } from "@/lib/domains/types";

/** The domain's DNS is not in this account's Cloudflare: expected for manual-DNS domains, not a fault. */
export class ZoneNotFoundError extends Error {
	readonly code = "ZONE_NOT_FOUND";
}

export async function preflightDomain(
	env: CloudflareEnv,
	hostname: string,
): Promise<DomainPreflightResult> {
	const normalized = hostname.toLowerCase().trim();
	const zone = await findZoneByHostname(env, normalized);
	if (!zone) {
		throw new ZoneNotFoundError(
			`DNS for "${normalized}" is not managed in this Cloudflare account. Turn on "Skip DNS setup" to add the domain and enter its DNS records yourself.`,
		);
	}

	return { hostname: normalized, zone };
}
