"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { isHtmlSignature } from "@/components/compose/rich-text-utils";
import { EmailHtmlRenderer } from "@/components/messages/email-html-renderer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SignatureEditor } from "./signature-editor";
import { updateMailboxSignature } from "./utils";

export function MailboxSignatureForm() {
	const { t } = useLanguage();
	const { selectedMailbox, setSelectedMailbox, isLoading } = useSelectedMailbox();
	const [signature, setSignature] = useState("");
	const [savedSignature, setSavedSignature] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
 const currentMailboxId=useRef(selectedMailbox?.id);currentMailboxId.current=selectedMailbox?.id;

	useEffect(() => {
		const nextSignature = selectedMailbox?.signature ?? "";
		setSignature(nextSignature);
		setSavedSignature(nextSignature);
		setStatus(null);
	}, [selectedMailbox?.id, selectedMailbox?.signature]);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedMailbox || selectedMailbox.permission !== "full_access") return;
 const savingMailboxId=selectedMailbox.id;
		setSaving(true);
		setStatus(null);
		try {
			const saved = await updateMailboxSignature(savingMailboxId, signature);
 if(currentMailboxId.current!==savingMailboxId)return;
			setSignature(saved);
			setSavedSignature(saved);
			setSelectedMailbox({ ...selectedMailbox, signature: saved });
			setStatus(t("common.saved"));
		} catch (error) {
			if(currentMailboxId.current===savingMailboxId)setStatus(error instanceof Error ? error.message : t("settings.signature.failed"));
		} finally {
			setSaving(false);
		}
	}

	if (isLoading) return <p className="text-sm text-neutral-500">{t("settings.signature.loadingInbox")}</p>;
	if (!selectedMailbox) return <p className="text-sm text-neutral-500">{t("settings.signature.selectInbox")}</p>;

	const address = `${selectedMailbox.localPart}@${selectedMailbox.hostname}`;
	const canManage = selectedMailbox.permission === "full_access";

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="mailboxSignature">{t("settings.signature.for", { address })}</Label>
                <SignatureEditor key={selectedMailbox.id} id="mailboxSignature" value={signature} onChange={setSignature} disabled={!canManage || saving}/>

				<p className="text-xs leading-5 text-neutral-500">
					Use the toolbar to format your signature. Images use HTTPS URLs; external images stay blocked until you load the preview.
				</p>
			</div>
			{isHtmlSignature(signature) && (
				<div className="space-y-2">
					<p className="text-xs font-medium text-neutral-500">{t("settings.signature.preview")}</p>
					<EmailHtmlRenderer
						className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-900"
						html={signature}
					/>
				</div>
			)}
			<div className="flex items-center gap-3">
				<Button type="submit" disabled={!canManage || saving || signature.trim() === savedSignature}>
					{saving ? t("common.saving") : t("settings.signature.save")}
				</Button>
				{!canManage && <p className="text-sm text-neutral-500">{t("settings.signature.needFullAccess")}</p>}
				{status && <p role="status" className="text-sm text-neutral-500">{status}</p>}
			</div>
		</form>
	);
}
