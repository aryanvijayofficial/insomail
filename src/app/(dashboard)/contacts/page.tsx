"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { UserPlus, Users } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import { authFetch } from "@/lib/auth/client";
import { normalizeEmailAddress } from "@/lib/email/address";

type ContactRow = {
	email: string;
	displayName: string | null;
	source: string;
	blocked: boolean;
	hasAvatar: boolean;
};

type ContactListResponse = {
	contacts?: ContactRow[];
	total?: number;
	nextOffset?: number | null;
	error?: string;
	code?: string;
};

export default function ContactsPage() {
	const { t } = useLanguage();
	const { selectedMailbox, isLoading: mailboxesLoading } = useSelectedMailbox();
	const [contacts, setContacts] = useState<ContactRow[]>([]);
	const [total, setTotal] = useState(0);
	const [nextOffset, setNextOffset] = useState<number | null>(null);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [directoryError, setDirectoryError] = useState<string | null>(null);
	const [newAddress, setNewAddress] = useState("");
	const [adding, setAdding] = useState(false);
	const [renaming, setRenaming] = useState<ContactRow | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [saving, setSaving] = useState(false);

	const load = useCallback(async (offset = 0, append = false) => {
		if (!selectedMailbox?.id) return;
		setLoading(true);
		try {
			const params = new URLSearchParams({ mailboxId: selectedMailbox.id, saved: "1", limit: "50", offset: String(offset) });
			if (search.trim()) params.set("q", search.trim());
			const response = await authFetch(`/api/contacts/list?${params.toString()}`, { cache: "no-store" });
			const data = (await response.json()) as ContactListResponse;
			if (!response.ok) {
				setDirectoryError(data.error ?? "error");
				setContacts([]);
				return;
			}
			setDirectoryError(null);
			setContacts((current) => append ? [...current, ...(data.contacts ?? [])] : data.contacts ?? []);
			setTotal(data.total ?? 0);
			setNextOffset(data.nextOffset ?? null);
		} finally {
			setLoading(false);
		}
	}, [selectedMailbox?.id, search]);

	useEffect(() => {
		const timer = window.setTimeout(() => void load(), 200);
		return () => window.clearTimeout(timer);
	}, [load]);

	async function addContact(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const email = normalizeEmailAddress(newAddress);
		if (!selectedMailbox?.id || !email) return;
		setAdding(true);
		try {
			const response = await authFetch("/api/contacts", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mailboxId: selectedMailbox.id, address: email }),
			});
			if (!response.ok) return;
			setNewAddress("");
			await load();
		} finally {
			setAdding(false);
		}
	}

	async function saveRename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedMailbox?.id || !renaming || !renameValue.trim()) return;
		setSaving(true);
		try {
			const response = await authFetch("/api/contacts", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mailboxId: selectedMailbox.id, address: renaming.email, displayName: renameValue.trim() }),
			});
			if (!response.ok) return;
			setRenaming(null);
			await load();
		} finally {
			setSaving(false);
		}
	}

	async function removeContact(contact: ContactRow) {
		if (!selectedMailbox?.id) return;
		const params = new URLSearchParams({ mailboxId: selectedMailbox.id, address: contact.email });
		const response = await authFetch(`/api/contacts?${params.toString()}`, { method: "DELETE" });
		if (!response.ok) return;
		await load();
	}

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6">
			<div className="mb-1 flex items-center gap-2">
				<Users className="h-5 w-5 text-neutral-500" />
				<h1 className="text-lg font-semibold text-neutral-900">{t("contacts.title")}</h1>
			</div>
			<p className="mb-4 text-sm text-neutral-500">{t("contacts.description")}</p>

			<form onSubmit={addContact} className="mb-4 flex gap-2">
				<Input
					value={newAddress}
					onChange={(event) => setNewAddress(event.target.value)}
					placeholder={t("contacts.addPlaceholder")}
					type="email"
					className="max-w-xs"
				/>
				<Button type="submit" disabled={adding || !newAddress.trim()}>
					<UserPlus className="mr-1.5 h-4 w-4" />
					{t("contacts.add")}
				</Button>
			</form>

			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder={t("contacts.searchPlaceholder")}
				className="mb-4 max-w-xs"
			/>

			{directoryError ? (
				<p className="text-sm text-neutral-500">{directoryError}</p>
			) : loading && contacts.length === 0 ? (
				<p className="text-sm text-neutral-400">...</p>
			) : contacts.length === 0 ? (
				<p className="text-sm text-neutral-500">{t("contacts.empty")}</p>
			) : (
				<>
					<ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
						{contacts.map((contact) => (
							<li key={contact.email} className="flex items-center gap-3 px-4 py-2.5">
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
									{(contact.displayName ?? contact.email).charAt(0).toUpperCase()}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium text-neutral-900">
										{contact.displayName ?? contact.email}
									</span>
									{contact.displayName && (
										<span className="block truncate text-xs text-neutral-500">{contact.email}</span>
									)}
								</span>
								{contact.blocked && (
									<span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">{t("contacts.blocked")}</span>
								)}
								{contact.source === "outbound" && (
									<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{t("contacts.fromSent")}</span>
								)}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										setRenaming(contact);
										setRenameValue(contact.displayName ?? "");
									}}
								>
									{t("contacts.rename")}
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-red-600 hover:text-red-700"
									onClick={() => void removeContact(contact)}
								>
									{t("contacts.remove")}
								</Button>
							</li>
						))}
					</ul>
					{nextOffset !== null && (
						<Button type="button" variant="ghost" className="mt-3" onClick={() => void load(nextOffset, true)}>
							{t("contacts.loadMore")} ({contacts.length}/{total})
						</Button>
					)}
				</>
			)}

			<Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("contacts.rename")}</DialogTitle>
						<DialogDescription>{renaming?.email}</DialogDescription>
					</DialogHeader>
					<form onSubmit={saveRename} className="space-y-4">
						<div className="space-y-2">
							<FormLabel htmlFor="contactName">{t("contacts.name")}</FormLabel>
							<Input id="contactName" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} autoFocus />
						</div>
						<Button type="submit" disabled={saving || !renameValue.trim()}>
							{saving ? t("navigation.saving") : t("common.save")}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
