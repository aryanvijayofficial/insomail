import { SettingsSection } from "@/components/settings/settings-section";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { InboxThreadingSettings } from "@/components/settings/inbox-threading-settings";
import { RemoteContentSettings } from "@/components/settings/remote-content-settings";
import { RecipientAddressSettings } from "@/components/settings/recipient-address-settings";
import { ComposeDefaultsSettings } from "@/components/settings/compose-defaults-settings";
import { InboxReadingLayoutSettings } from "@/components/settings/inbox-reading-layout-settings";
import { InboxShortcutsSettings } from "@/components/settings/inbox-shortcuts-settings";
import { MailboxAutoReplyForm } from "@/components/settings/mailbox-auto-reply-form";
import { SpamFilterSettings } from "@/components/settings/spam-filter-settings";
import { TrashRetentionSettings } from "@/components/settings/trash-retention-settings";
import { PushNotificationSettings } from "@/components/settings/push-notification-settings";
import { BrowserNotificationSettings } from "@/components/settings/browser-notification-settings";

export default async function SettingsInboxPage() {
	const t = await getServerTranslator();
 return <div className="space-y-5 py-4"><h1 className="sr-only">{t("settings.nav.inbox")}</h1>
<SettingsSection title={t("settingsPage.inbox.appearance")} description={t("settingsPage.inbox.appearanceDescription")}><AppearanceSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.readingLayout")} description={t("settingsPage.inbox.readingLayoutDescription")}><InboxReadingLayoutSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.threading")} description={t("settingsPage.inbox.threadingDescription")}><InboxThreadingSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.addresses")} description={t("settingsPage.inbox.addressesDescription")}><RecipientAddressSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.compose")} description={t("settingsPage.inbox.composeDescription")}><ComposeDefaultsSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.shortcuts")} description={t("settingsPage.inbox.shortcutsDescription")}><InboxShortcutsSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.notifications")} description={t("settingsPage.inbox.notificationsDescription")}><BrowserNotificationSettings/><div className="border-t border-neutral-200 pt-5"><PushNotificationSettings/></div></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.spamProtection")} description={t("settingsPage.inbox.spamProtectionDescription")}><SpamFilterSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.remoteContent")} description={t("settingsPage.inbox.remoteContentDescription")}><RemoteContentSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.cleanup")} description={t("settingsPage.inbox.cleanupDescription")}><TrashRetentionSettings/></SettingsSection>
<SettingsSection title={t("settingsPage.inbox.autoReply")} description={t("settingsPage.inbox.autoReplyDescription")}><MailboxAutoReplyForm/></SettingsSection>
</div>;
}
