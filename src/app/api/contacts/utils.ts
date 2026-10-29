import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { contacts } from "@/db/schema";
import { getContactId } from "@/lib/contacts/utils";

type Db = ReturnType<typeof getDb>;

export async function getContactByEmail(db: Db, userId: string, email: string) {
	const [contact] = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.userId, userId), eq(contacts.email, email)))
		.limit(1);
	return contact ?? null;
}

export function toContactDetails(contact: Awaited<ReturnType<typeof getContactByEmail>>) {
	if (!contact) return null;
	const { avatarKey, ...details } = contact;
	return { ...details, hasAvatar: !!avatarKey };
}

export async function saveManualContactName(
	db: Db,
	input: { userId: string; email: string; displayName: string },
) {
	const existing = await getContactByEmail(db, input.userId, input.email);
	if (existing) {
		await db
			.update(contacts)
			.set({ displayName: input.displayName, source: "manual" })
			.where(eq(contacts.id, existing.id));
		return { ...existing, displayName: input.displayName, source: "manual" as const };
	}

	const id = getContactId(input.userId, input.email);
	await db.insert(contacts).values({
		id,
		userId: input.userId,
		email: input.email,
		displayName: input.displayName,
		source: "manual",
	});
	return getContactByEmail(db, input.userId, input.email);
}

/**
 * Marks a contact saved (source "manual") without touching its name, avatar,
 * blocked flag or image allowance. Used by address-only "add to contacts".
 */
export async function promoteContactToSaved(
	db: Db,
	input: { userId: string; email: string; displayName?: string | null },
) {
	const existing = await getContactByEmail(db, input.userId, input.email);
	if (existing) {
		await db.update(contacts).set({ source: "manual" }).where(eq(contacts.id, existing.id));
		return { ...existing, source: "manual" as const };
	}

	const id = getContactId(input.userId, input.email);
	await db.insert(contacts).values({
		id,
		userId: input.userId,
		email: input.email,
		displayName: input.displayName ?? null,
		source: "manual",
	});
	return getContactByEmail(db, input.userId, input.email);
}

/**
 * Removes a contact from the saved directory by demoting it to inbound-only.
 * The row, its blocked flag, image allowance, avatar and name are preserved:
 * blocking and remote-content safety must survive "remove from contacts".
 */
export async function unsaveContact(db: Db, input: { userId: string; email: string }) {
	const existing = await getContactByEmail(db, input.userId, input.email);
	if (!existing) return null;
	if (existing.source !== "inbound") {
		await db.update(contacts).set({ source: "inbound" }).where(eq(contacts.id, existing.id));
	}
	return { ...existing, source: "inbound" as const };
}
