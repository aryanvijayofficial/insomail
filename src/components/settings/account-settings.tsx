"use client";

import { SettingsSection } from "./settings-section";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { LanguageSelector } from "@/components/language-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { MailboxSignatureForm } from "./mailbox-signature-form";
import { ProfileForm } from "./profile-form";
import { TimeZoneForm } from "./time-zone-form";
import type { AccountSettingsResponse } from "./types";
import { loadAccountSettings } from "./utils";

export function AccountSettings() {
	const { t } = useLanguage();
	const [user, setUser] = useState<AccountSettingsResponse["user"]>();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		loadAccountSettings()
			.then((nextUser) => {
				if (!cancelled) setUser(nextUser);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : t("settings.account.loadFailed"));
			});

		return () => {
			cancelled = true;
		};
	}, [t]);

	if (error) {
		return <p role="alert" className="py-8 text-sm text-red-600">{error}</p>;
	}

	if (!user) {
		return (
			<div className="space-y-6 py-4">
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-72 w-full rounded-3xl" />
			</div>
		);
	}

 return <div className="space-y-5 py-4"><h1 className="sr-only">{t("settings.nav.account")}</h1>
 <SettingsSection title={t("settings.account.detailsTitle")} description={t("settings.account.detailsDescription")}><ProfileForm accountName={user.name} initialResetEmail={user.resetEmail??""}/></SettingsSection>
 <SettingsSection title={t("settings.account.signatureTitle")} description={t("settings.account.signatureDescription")}><MailboxSignatureForm/></SettingsSection>
 <SettingsSection title={t("settings.account.generalTitle")} description={t("settings.account.generalDescription")}><div className="space-y-5"><div className="space-y-2"><LanguageSelector/></div><TimeZoneForm userId={user.id} initialTimeZone={user.timeZone}/></div></SettingsSection>
 </div>;
}
