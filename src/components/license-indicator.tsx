"use client";
import Link from "next/link";
export function LicenseIndicator() {
 return <Link href="/settings/plan" className="rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-200">Free plans</Link>;
}
