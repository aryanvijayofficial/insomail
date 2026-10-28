import { getServerTranslator } from "@/lib/i18n/server";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MfaSettings } from "@/components/settings/mfa-settings";
import { DeviceSettings } from "@/components/settings/device-settings";

export default async function SecuritySettingsPage() {
	const t = await getServerTranslator();
	return <div className="mx-auto max-w-3xl space-y-6 px-1 py-5 sm:py-8">
		<section className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{t("settingsPage.security.title")}</h1>
				<p className="mt-2 text-sm leading-6 text-neutral-500">{t("settingsPage.security.description")}</p>
			</div>
			<div className="space-y-6 rounded-2xl border border-neutral-200 bg-white px-5 py-6 sm:rounded-3xl sm:p-7">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">{t("settingsPage.security.changePassword")}</h2>
					<p className="mt-2 text-sm leading-6 text-neutral-500">{t("settingsPage.security.changePasswordDescription")}</p>
				</div>
				<ChangePasswordForm />
			</div>
			<div className="space-y-6 rounded-2xl border border-neutral-200 bg-white px-5 py-6 sm:rounded-3xl sm:p-7">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">{t("settingsPage.security.mfa")}</h2>
					<p className="mt-2 text-sm leading-6 text-neutral-500">{t("settingsPage.security.mfaDescription")}</p>
				</div>
				<MfaSettings />
			</div>
			<div className="space-y-6 rounded-2xl border border-neutral-200 bg-white px-5 py-6 sm:rounded-3xl sm:p-7">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">{t("settingsPage.security.devices")}</h2>
					<p className="mt-2 text-sm leading-6 text-neutral-500">{t("settingsPage.security.devicesDescription")}</p>
				</div>
				<DeviceSettings />
			</div>
		</section>
	</div>;
}
