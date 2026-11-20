export type DomainListResult = {
	domains?: { id: string; hostname: string }[];
};

export type DomainCreateResult = {
	domain?: { id: string };
	error?: string;
	code?: "MX_RECORDS_CONFLICT";
};

export type DomainPreflight = {
	hostname: string;
	zone: { id: string; name: string };
};

export type DomainPreflightResponse = {
	ok: boolean;
	domain?: DomainPreflight;
	error?: string;
	/** ZONE_NOT_FOUND means the DNS is managed elsewhere; show it as a note, not an error. */
	code?: string;
};

export type MailboxCreateResult = {
	error?: string;
};
