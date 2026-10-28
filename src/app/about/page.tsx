import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Code2, FileText, Mail } from "lucide-react";
import { AboutBackLink } from "@/components/about-back-link";
import { getHomeBranding } from "../home-server-utils";

export default async function AboutPage() {
 const branding = await getHomeBranding();
 return <div className="min-h-dvh bg-[#f6f8fc] text-neutral-900">
  <header className="border-b border-neutral-200/70 bg-white/80">
   <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
    <Link href="/" className="flex min-w-0 items-center gap-3 font-semibold"><img src={branding.hasCustomIcon ? "/api/branding/icon?v=insomail-current" : "/icon-96.png"} alt="" className="h-9 w-9 object-contain"/><span className="truncate">{branding.appName}</span></Link>
    <AboutBackLink fallback="/"/>
   </div>
  </header>
  <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
   <div className="mb-8 max-w-2xl"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-700">About &amp; License</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your email. Your workspace.</h1><p className="mt-4 text-base leading-7 text-neutral-600">{branding.appName} brings personal email and shared inboxes together.</p></div>
   <section aria-labelledby="source-heading" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/70 sm:p-8">
    <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Code2 size={22}/></span><div><h2 id="source-heading" className="text-lg font-semibold">Open source, available to you</h2><p className="mt-1 text-sm text-neutral-600">Read, download and modify the code under the GNU AGPL.</p></div></div>
    <div className="flex flex-col gap-3 sm:flex-row"><a href="/api/source" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Download source<ArrowUpRight size={16}/></a><a href="https://github.com/aryanvijayofficial/insomail" className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-medium hover:bg-neutral-50">View repository<ArrowUpRight size={16}/></a></div>
   </section>
   <div className="mt-5 grid gap-5 md:grid-cols-2">
    <section className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 sm:p-8"><Mail className="mb-4 text-neutral-500" size={22}/><h2 className="text-lg font-semibold">Built on Mailflare</h2><p className="mt-3 text-sm leading-6 text-neutral-600">This modified application is based on Mailflare v0.5.3. Copyright (C) 2026 Hieu Nguyen and contributors.</p><p className="mt-3 text-sm leading-6 text-neutral-600">Local changes dated October 29, 2026 include a single feature set, account policy and custom branding.</p><a href="https://github.com/hieunc229/mailflare" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">Upstream project<ArrowUpRight size={15}/></a></section>
    <section className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 sm:p-8"><FileText className="mb-4 text-neutral-500" size={22}/><h2 className="text-lg font-semibold">License &amp; your rights</h2><p className="mt-3 text-sm leading-6 text-neutral-600">GNU Affero General Public License, version 3 or later. You may copy, redistribute and modify this software under that license.</p><p className="mt-3 text-sm leading-6 text-neutral-600">There is no warranty, including no implied warranty of merchantability or fitness for a particular purpose, except as required by law.</p><Link href="/about/license" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">Read full license<ArrowUpRight size={15}/></Link></section>
   </div>
  </main>
 </div>;
}
