import Link from "next/link";
export default function LicensesPage() {
 return <section className="space-y-5"><h1 className="text-3xl font-medium">InsoMail free plans</h1><p>Professional and Team features are included at no app license charge. Each user can choose their plan in settings.</p><p>These are local InsoMail capabilities, not a purchased Mailflare license. Admin roles, mailbox permissions and service charges still apply. Vendor support and future paid updates are not included.</p><Link href="/settings/plan" className="inline-block rounded-xl bg-blue-600 px-5 py-3 text-white">Choose your free plan</Link><p className="text-sm text-neutral-500">Based on Mailflare under AGPL. <a className="underline" href="/api/source">Source code</a></p></section>;
}
