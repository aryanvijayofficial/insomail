import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { domains, mailboxAliases, mailboxes, users } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth/cookies";
import { newId } from "@/lib/ids";
import { canManageUserAccount, canManageUsers } from "@/lib/auth/admin";
import { getLicenseEntitlements } from "@/lib/licenses/service";
import { tracksAccountIdentity } from "@/lib/profile/identity-utils";
import { mailboxSchema } from "@/lib/validators";
import { ensureMailboxDomainRouting, getMailboxDomainAddresses } from "@/lib/mailboxes/domain-addresses";
import { ensurePersonalMailbox } from "./utils";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const db = getDb(env);
	const accessible = await ensurePersonalMailbox(env, db, user);
	const entitlements = await getLicenseEntitlements(env);
	let rows = accessible;
	// The admin Mailboxes page also lists mailboxes owned by accounts this admin manages,
	// not only the ones they own or are shared on. Settings access still gates opening them.
	if (new URL(request.url).searchParams.get("manage") === "1" && canManageUsers(user) && entitlements.canManageAccounts) {
		const seen = new Set(accessible.map((mailbox) => mailbox.id));
		const managed = await db
			.select({
				id: mailboxes.id,
				userId: mailboxes.userId,
				domainId: mailboxes.domainId,
				localPart: mailboxes.localPart,
				displayName: mailboxes.displayName,
				signature: mailboxes.signature,
				autoReplyEnabled: mailboxes.autoReplyEnabled,
				autoReplySubject: mailboxes.autoReplySubject,
				autoReplyBody: mailboxes.autoReplyBody,
				useAllDomains: mailboxes.useAllDomains,
				avatarKey: mailboxes.avatarKey,
				type: mailboxes.type,
				disabled: mailboxes.disabled,
				createdAt: mailboxes.createdAt,
				hostname: domains.hostname,
				ownerRole: users.role,
				ownerIsPrimaryAdmin: users.isPrimaryAdmin,
			})
			.from(mailboxes)
			.innerJoin(domains, eq(mailboxes.domainId, domains.id))
			.innerJoin(users, eq(mailboxes.userId, users.id))
			.where(and(eq(mailboxes.disabled, false), isNull(users.deletedAt)));
		const extra = managed
			.filter((row) => !seen.has(row.id) && canManageUserAccount(user, { role: row.ownerRole, isPrimaryAdmin: row.ownerIsPrimaryAdmin }))
			.map(({ avatarKey, ownerRole: _role, ownerIsPrimaryAdmin: _primary, ...mailbox }) => ({
				...mailbox,
				hasAvatar: !!avatarKey,
				permission: "full_access" as const,
				isPrimary: false,
			}));
		rows = [...accessible, ...extra];
	}
	return NextResponse.json({
		mailboxes: await Promise.all(rows.map(async (mailbox) => ({
			...mailbox,
			...(mailbox.userId === user.id && tracksAccountIdentity(mailbox, user.email)
				? { displayName: user.name, hasAvatar: !!user.avatarKey }
				: {}),
			senderAddresses: await getMailboxDomainAddresses(db, mailbox),
		}))),
		canCreateShared: user.role === "admin" && entitlements.canShareMailboxes,
	});
}

export async function POST(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const parsed = mailboxSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const db = getDb(env);
	const mailboxType = parsed.data.type ?? "personal";
	if (mailboxType === "shared") {
		const entitlements = await getLicenseEntitlements(env);
		if (user.role !== "admin" || !entitlements.canShareMailboxes) {
			return NextResponse.json({ error: "Shared inbox creation is not allowed" }, { status: 403 });
		}
	}
	const ownerUserId = mailboxType === "shared" ? user.id : parsed.data.ownerUserId ?? user.id;
	if (ownerUserId !== user.id) {
		if (user.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		const [owner] = await db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.id, ownerUserId), eq(users.createdByUserId, user.id)))
			.limit(1);
		if (!owner) return NextResponse.json({ error: "Account not found" }, { status: 404 });
	}
	const [domain] = await db
		.select()
		.from(domains)
		.where(eq(domains.id, parsed.data.domainId))
		.limit(1);
	const canUseDomain = domain && (
		domain.userId === user.id ||
		(user.canManageMailboxes && !!user.createdByUserId && domain.userId === user.createdByUserId)
	);
	if (!canUseDomain) {
		return NextResponse.json({ error: "Domain not found" }, { status: 404 });
	}

	const localPart = parsed.data.localPart.toLowerCase();
	const [existing] = await db
		.select()
		.from(mailboxes)
		.where(and(eq(mailboxes.domainId, domain.id), eq(mailboxes.localPart, localPart)))
		.limit(1);
	if (existing) {
		return NextResponse.json({ error: "Mailbox already exists" }, { status: 409 });
	}
	const [existingAlias] = await db
		.select({ id: mailboxAliases.id })
		.from(mailboxAliases)
		.where(and(eq(mailboxAliases.domainId, domain.id), eq(mailboxAliases.localPart, localPart)))
		.limit(1);
	if (existingAlias) {
		return NextResponse.json({ error: "An alias already uses this address" }, { status: 409 });
	}

	const id = newId("mbx");
	await db.insert(mailboxes).values({
		id,
		userId: ownerUserId,
		domainId: parsed.data.domainId,
		localPart,
		displayName: parsed.data.displayName,
		type: mailboxType,
	});
	try {
		await ensureMailboxDomainRouting(env, db, { id, domainId: domain.id, localPart, useAllDomains: true });
	} catch (err) {
		await db.delete(mailboxes).where(eq(mailboxes.id, id));
		const message = err instanceof Error ? err.message : "Failed to create Cloudflare routing rule";
		return NextResponse.json({ error: message }, { status: 502 });
	}

	const address = `${localPart}@${domain.hostname}`;

	return NextResponse.json({
		id,
		address,
		type: mailboxType,
	});
}
