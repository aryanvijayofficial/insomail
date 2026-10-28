"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {authFetch,AUTH_SESSION_CHANGED_EVENT} from "@/lib/auth/client";
export function LicenseIndicator() {
 const [plan,setPlan]=useState<string|null>(null);
 useEffect(()=>{let active=true;const load=()=>{void authFetch("/api/settings/plan",{redirectOnUnauthorized:false}).then(async r=>{if(r.ok&&active){const data=await r.json() as {plan:string};setPlan(data.plan);}}).catch(()=>{});};load();window.addEventListener("insomail:plan-changed",load);window.addEventListener(AUTH_SESSION_CHANGED_EVENT,load);return()=>{active=false;window.removeEventListener("insomail:plan-changed",load);window.removeEventListener(AUTH_SESSION_CHANGED_EVENT,load);};},[]);
 return <Link href="/settings/plan" aria-label={plan?`Current plan: ${plan==="team"?"Team":"Professional"}. Manage plans`:"Plans"} className="rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-200">{plan==="team"?"Team":plan==="professional"?"Professional":"Plans"}</Link>;
}
