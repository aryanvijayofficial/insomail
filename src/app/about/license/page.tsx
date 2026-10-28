import Link from "next/link";
import { AboutBackLink } from "@/components/about-back-link";
import { ArrowLeft } from "lucide-react";
import { getHomeBranding } from "../../home-server-utils";
import { AGPL_LICENSE } from "@/lib/insomail/license-text";
export default async function LicensePage() {
 const branding = await getHomeBranding();
 return <div className="min-h-dvh bg-[#f6f8fc] text-neutral-900"><header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><img src="/api/branding/icon?v=insomail-current" alt="" className="h-8 w-8 object-contain"/><AboutBackLink fallback="/about"/></div><a href="/api/source" className="text-sm font-medium text-blue-700 hover:underline">Source code</a></div></header><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12"><h1 className="text-2xl font-semibold sm:text-3xl">GNU AGPL license</h1><p className="mt-3 text-sm text-neutral-600">The complete, unmodified license text.</p><pre className="mt-6 whitespace-pre-wrap break-words rounded-2xl bg-white p-5 font-mono text-xs leading-6 ring-1 ring-neutral-200 sm:p-8 sm:text-sm">{AGPL_LICENSE}</pre><Link href="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-700"><ArrowLeft size={16}/>Back to About</Link></main></div>;
}
