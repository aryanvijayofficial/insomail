import { redirect } from "next/navigation";
// Keep bookmarked legacy links useful without a duplicate admin plan page.
export default function LegacyLicensesPage() { redirect("/settings/plan"); }
