"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { authFetch } from "@/lib/auth/client";
import { Label } from "@/components/ui/label";
import { getEmailAddress } from "@/lib/email/address";
import { cn } from "@/lib/utils";
import type { RecipientInputProps } from "./recipient-input-types";
import { getRecipientLabel, isValidRecipient, parseRecipientEntries } from "./recipient-utils";

/**
 * A To/Cc/Bcc row. Addresses become chips as soon as the user types a comma,
 * presses Enter or Tab, pastes a list, or leaves the field; Backspace on an
 * empty field pulls the last chip back out for editing.
 */
export function RecipientInput({
	id,
	label,
	value,
	onChange,
	placeholder,
	disabled,
	required,
	autoFocus,
	trailing,
}: RecipientInputProps) {
	const { t } = useLanguage();
	const { selectedMailbox } = useSelectedMailbox();
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [suggestions, setSuggestions] = useState<{ email: string; displayName: string | null }[]>([]);
	const [suggestionsOpen, setSuggestionsOpen] = useState(false);
	const [activeSuggestion, setActiveSuggestion] = useState(0);
	const suggestionRequest = useRef(0);

	// Saved-contact typeahead: debounce, ignore stale responses, hide what is already chipped.
	useEffect(() => {
		const needle = draft.trim();
		if (!selectedMailbox?.id || !needle) {
			setSuggestions([]);
			setSuggestionsOpen(false);
			return;
		}
		const requestId = ++suggestionRequest.current;
		const timer = window.setTimeout(async () => {
			try {
				const params = new URLSearchParams({ mailboxId: selectedMailbox.id!, q: needle });
				const response = await authFetch(`/api/contacts/suggest?${params.toString()}`, { cache: "no-store" });
				if (!response.ok) return;
				const data = (await response.json()) as { contacts?: { email: string; displayName: string | null }[] };
				if (suggestionRequest.current !== requestId) return;
				const chipped = new Set(value.map((entry) => getEmailAddress(entry).toLowerCase()));
				const next = (data.contacts ?? []).filter((contact) => !chipped.has(contact.email.toLowerCase()));
				setSuggestions(next);
				setActiveSuggestion(0);
				setSuggestionsOpen(next.length > 0);
			} catch {
				// Suggestions are best-effort; typing must never break.
			}
		}, 200);
		return () => window.clearTimeout(timer);
	}, [draft, selectedMailbox?.id, value]);

	function pickSuggestion(contact: { email: string; displayName: string | null }) {
		const entry = contact.displayName ? `${contact.displayName} <${contact.email}>` : contact.email;
		onChange([...value, entry]);
		setDraft("");
		setSuggestions([]);
		setSuggestionsOpen(false);
		inputRef.current?.focus();
	}

	function commit(raw = draft) {
		const entries = parseRecipientEntries(raw, value);
		if (entries.length > 0) onChange([...value, ...entries]);
		setDraft("");
		setSuggestionsOpen(false);
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (suggestionsOpen && suggestions.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setActiveSuggestion((index) => (index + 1) % suggestions.length);
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length);
				return;
			}
			if (event.key === "Escape") {
				setSuggestionsOpen(false);
				return;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				pickSuggestion(suggestions[activeSuggestion]);
				return;
			}
		}
		if (event.key === "," || event.key === ";" || event.key === "Enter" || (event.key === "Tab" && draft.trim())) {
			if (event.key !== "Tab") event.preventDefault();
			commit();
			return;
		}
		if (event.key === "Backspace" && !draft && value.length > 0) {
			event.preventDefault();
			const last = value[value.length - 1];
			onChange(value.slice(0, -1));
			setDraft(last);
		}
	}

	return (
		<div
			className="relative flex min-h-9 items-center gap-3 border-b border-neutral-100 px-4 py-1"
			onClick={() => inputRef.current?.focus()}
		>
			<Label htmlFor={id} className="w-10 shrink-0 text-sm text-neutral-500">
				{label}
			</Label>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 px-2">
				{value.map((entry) => {
					const valid = isValidRecipient(entry);
					return (
						<span
							key={entry}
							title={getEmailAddress(entry)}
							className={cn(
								"inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
								valid
									? "border-neutral-200 bg-neutral-50 text-neutral-800"
									: "border-red-200 bg-red-50 text-red-700",
							)}
						>
							<span className="truncate">{getRecipientLabel(entry)}</span>
							{!disabled && (
								<button
									type="button"
									aria-label={t("recipient.remove", { address: getEmailAddress(entry) })}
									className="rounded-full p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
									onClick={(event) => {
										event.stopPropagation();
										onChange(value.filter((item) => item !== entry));
									}}
								>
									<X className="h-3 w-3" />
								</button>
							)}
						</span>
					);
				})}
				<input
					ref={inputRef}
					id={id}
					value={draft}
					onChange={(event) => {
						// A pasted list should split immediately instead of waiting for a comma.
						if (/[,;]/.test(event.target.value) && event.target.value.length - draft.length > 1) {
							commit(event.target.value);
							return;
						}
						setDraft(event.target.value);
					}}
					onKeyDown={onKeyDown}
					onBlur={() => window.setTimeout(() => commit(), 150)}
					type="text"
					autoComplete="off"
					autoFocus={autoFocus}
					spellCheck={false}
					placeholder={value.length === 0 ? placeholder : undefined}
					disabled={disabled}
					// Native `required` would block submit while chips exist; the form checks itself.
					aria-required={required}
					className="h-7 min-w-32 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
				/>
			</div>
			{suggestionsOpen && suggestions.length > 0 && (
				<ul
					role="listbox"
					aria-label={t("navigation.contacts")}
					className="absolute left-0 top-full z-40 mt-1 max-h-60 w-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
				>
					{suggestions.map((contact, index) => (
						<li key={contact.email}>
							<button
								type="button"
								role="option"
								aria-selected={index === activeSuggestion}
								className={`flex w-full flex-col rounded-lg px-3 py-1.5 text-left ${index === activeSuggestion ? "bg-blue-50" : "hover:bg-neutral-50"}`}
								onMouseDown={(event) => {
									event.preventDefault();
									pickSuggestion(contact);
								}}
							>
								<span className="truncate text-sm text-neutral-900">{contact.displayName ?? contact.email}</span>
								{contact.displayName && <span className="truncate text-xs text-neutral-500">{contact.email}</span>}
							</button>
						</li>
					))}
				</ul>
			)}
			{trailing && (
				// Toggles live inside the clickable row; keep their clicks from refocusing this field.
				<div
					className="flex shrink-0 items-center gap-1 text-xs text-neutral-500"
					onClick={(event) => event.stopPropagation()}
				>
					{trailing}
				</div>
			)}
		</div>
	);
}
