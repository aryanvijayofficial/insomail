import { DnsQueryError } from "@/lib/dns-query";

/** A SERVFAIL can mean unavailable DQS access, but cannot prove a key is invalid. */
export function spamhausCheckError(error: unknown): string {
	if (error instanceof DnsQueryError && (error.dnsStatus === 2 || error.dnsStatus === 5)) {
		return "The DNS resolver could not complete the Spamhaus DQS check (SERVFAIL or REFUSED). This can happen if ZEN access is not active for this query key, or because of a temporary DNS problem. Check the DQS query key and ZEN access in Spamhaus, then retry. Nothing was saved.";
	}
	return "Could not complete the Spamhaus key check because of a network or DNS error. Try again. Nothing was saved.";
}
