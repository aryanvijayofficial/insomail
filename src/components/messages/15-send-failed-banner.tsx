"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useCompose } from "@/components/compose/compose-context";
import { authFetch } from "@/lib/auth/client";
import { clearMessageDetailCache } from "@/lib/messages/detail-cache";

/** Shown above an outbound message the provider rejected; editing returns it to Drafts and reopens it. */
export function SendFailedBanner({ messageId, error }: { messageId: string; error?: string | null }) {
	const { t } = useLanguage();
	const { openDraftComposer } = useCompose();
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	async function reopen() {
		setBusy(true);
		setFailed(false);
		try {
			const response = await authFetch(`/api/messages/${messageId}/reopen-failed`, { method: "POST" });
			if (!response.ok) throw new Error("Unable to reopen");
			clearMessageDetailCache();
			window.dispatchEvent(new Event("mailflare:messages-changed"));
			openDraftComposer(messageId);
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div role="alert" className="mx-6 mb-2 flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
			<TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
			<span className="min-w-0 flex-1">
				<span className="block font-medium">{t("send.failed.title")}</span>
				<span className="block">{t("send.failed.body")}</span>
				{error && <span className="mt-1 block break-words text-xs text-red-600">{error}</span>}
				{failed && <span className="mt-1 block text-xs">{t("send.failed.reopenFailed")}</span>}
			</span>
			<button type="button" onClick={() => void reopen()} disabled={busy} className="shrink-0 font-medium text-red-700 underline hover:no-underline disabled:opacity-50">
				{t("send.failed.edit")}
			</button>
		</div>
	);
}
