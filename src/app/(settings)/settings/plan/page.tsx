import { redirect } from "next/navigation";
// Preserve old bookmarks without retaining a plan chooser.
export default function LegacyPlanPage() { redirect("/settings/account"); }
