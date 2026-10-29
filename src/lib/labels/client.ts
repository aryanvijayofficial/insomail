"use client";

import { AUTH_SESSION_CHANGED_EVENT, authFetch, getClientSessionToken } from "@/lib/auth/client";
import type { LabelListResponse } from "./client-types";

const CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 32;
const MAX_INVALIDATION_RETRIES = 8;
const cache = new Map<string, { expiresAt: number; data: LabelListResponse }>();
const requests = new Map<string, Promise<LabelListResponse>>();
let epoch = 0;
let sessionEpoch = 0;
let listenersInstalled = false;

function invalidate(): void {
	++epoch;
	cache.clear();
	requests.clear();
}

function invalidateSession(): void {
	++sessionEpoch;
	invalidate();
}

function installInvalidationListeners(): void {
	if (listenersInstalled || typeof window === "undefined") return;
	listenersInstalled = true;
	window.addEventListener(AUTH_SESSION_CHANGED_EVENT, invalidateSession);
	window.addEventListener("mailflare:messages-changed", invalidate);
	window.addEventListener("mailflare:labels-changed", invalidate);
}

export function invalidateLabelCache(): void {
	invalidate();
}

export function dispatchLabelsChanged(): void {
	invalidate();
	if (typeof window !== "undefined") window.dispatchEvent(new Event("mailflare:labels-changed"));
}

export async function getMailboxLabels<T extends LabelListResponse = LabelListResponse>(
	mailboxId: string,
): Promise<T> {
	installInvalidationListeners();
	const sessionToken = getClientSessionToken();
	const requestSessionEpoch = sessionEpoch;
	const key = `${sessionToken ?? ""}${mailboxId}`;
	for (let retries = 0; ; retries++) {
		if (sessionEpoch !== requestSessionEpoch || sessionToken !== getClientSessionToken()) {
			throw new Error("Label request was invalidated");
		}
		const now = Date.now();
		const cached = cache.get(key);
		if (cached && cached.expiresAt > now) {
			cache.delete(key);
			cache.set(key, cached);
			return cached.data as T;
		}
		if (cached) cache.delete(key);

		const requestEpoch = epoch;
		let request = requests.get(key);
		if (!request) {
			request = (async () => {
				const params = new URLSearchParams({ mailboxId });
				const response = await authFetch(`/api/labels?${params.toString()}`, { cache: "no-store" });
				const data = (await response.json()) as LabelListResponse;
				if (!response.ok) throw new Error(data.error ?? "Unable to load labels");
				if (requestEpoch !== epoch || sessionEpoch !== requestSessionEpoch ||
					sessionToken !== getClientSessionToken() || requests.get(key) !== request) {
					throw new Error("Label request was invalidated");
				}
				cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
				if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
				return data;
			})();
			requests.set(key, request);
		}
		try {
			const data = await request;
			if (sessionEpoch !== requestSessionEpoch || sessionToken !== getClientSessionToken()) {
				throw new Error("Label request was invalidated");
			}
			if (requestEpoch !== epoch) {
				if (retries >= MAX_INVALIDATION_RETRIES) throw new Error("Label request was invalidated");
				continue;
			}
			return data as T;
		} catch (error) {
			if (sessionEpoch !== requestSessionEpoch || sessionToken !== getClientSessionToken()) {
				throw new Error("Label request was invalidated");
			}
			if (requestEpoch === epoch || retries >= MAX_INVALIDATION_RETRIES) throw error;
		} finally {
			if (requests.get(key) === request) requests.delete(key);
		}
	}
}

/** Applies or removes labels on messages and refreshes label-aware UI. */
export async function updateMessageLabels(input: {
	messageIds: string[];
	addLabelIds?: string[];
	removeLabelIds?: string[];
}): Promise<{ updated: number; skipped: { id: string; reason: string }[] }> {
	const response = await authFetch("/api/messages/labels", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const data = (await response.json()) as { updated?: number; skipped?: { id: string; reason: string }[]; error?: string };
	if (!response.ok) throw new Error(data.error ?? "Unable to update labels");
	window.dispatchEvent(new Event("mailflare:messages-changed"));
	dispatchLabelsChanged();
	return { updated: data.updated ?? 0, skipped: data.skipped ?? [] };
}
