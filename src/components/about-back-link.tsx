"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
export function AboutBackLink({ fallback }: { fallback: string }) {
 const [target, setTarget] = useState(fallback);
 useEffect(() => {
  // Only return to a known same-origin page, never an arbitrary external history entry.
  if (window.location.pathname === "/about/license") return;
  try {
   const from = new URLSearchParams(window.location.search).get("from");
   if (from?.startsWith("/") && !from.startsWith("//")) {
    const returnTo = new URL(from, window.location.origin);
    if (returnTo.origin === window.location.origin && !returnTo.pathname.startsWith("/about")) {
     setTarget(returnTo.pathname + returnTo.search + returnTo.hash);
     return;
    }
   }
   const previous = new URL(document.referrer);
   if (previous.origin === window.location.origin && previous.pathname !== window.location.pathname && !previous.pathname.startsWith("/about")) setTarget(previous.pathname + previous.search + previous.hash);
  } catch { /* A direct visit has no referrer; use the public home page. */ }
 }, []);
 return <Link href={target} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-blue-600"><ArrowLeft size={16} aria-hidden="true"/>Back</Link>;
}
