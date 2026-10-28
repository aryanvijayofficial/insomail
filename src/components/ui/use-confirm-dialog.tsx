"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

type Confirmation = { title: string; description: string; confirmLabel: string; action?: () => Promise<void> };
/** Shared themed confirmation. Cancel is focused first; no effect occurs before explicit confirmation. */
export function useConfirmDialog() {
 const { t } = useLanguage();
 const [request, setRequest] = useState<Confirmation | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const resolver = useRef<((confirmed: boolean) => void) | null>(null);
 const cancelRef = useRef<HTMLButtonElement>(null);
 const active = useRef(false);
 const busyRef = useRef(false);
 const trigger = useRef<HTMLElement | null>(null);
 useEffect(()=>()=>{resolver.current?.(false);resolver.current=null;active.current=false;},[]);
 function settle(value:boolean) { resolver.current?.(value);resolver.current=null;active.current=false;busyRef.current=false;setRequest(null);setBusy(false);setError(null); }
 function confirm(options: Confirmation): Promise<boolean> {
  if(active.current)return Promise.resolve(false);
  active.current=true;trigger.current=document.activeElement as HTMLElement;setRequest(options);setError(null);
  return new Promise(resolve=>{resolver.current=resolve});
 }
 async function accept() {
  if(!request||busyRef.current)return;
  busyRef.current=true;setBusy(true);setError(null);
  try {await request.action?.();settle(true);}
  catch(cause){setError(cause instanceof Error?cause.message:t("actions.error.update"));busyRef.current=false;setBusy(false);}
 }
 const confirmationDialog=<Dialog open={!!request} onOpenChange={open=>{if(!open&&!busy)settle(false)}}>
  <DialogContent onOpenAutoFocus={event=>{event.preventDefault();cancelRef.current?.focus()}} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus()}} onEscapeKeyDown={event=>{if(busy)event.preventDefault()}} onPointerDownOutside={event=>{if(busy)event.preventDefault()}} closeClassName={busy?"hidden":undefined} className="border border-neutral-200" aria-busy={busy}>
   <DialogTitle className="pr-7">{request?.title}</DialogTitle>
   <DialogDescription className="mt-3 leading-6">{request?.description}</DialogDescription>
   {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
   <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button ref={cancelRef} type="button" variant="outline" disabled={busy} onClick={()=>settle(false)}>{t("common.cancel")}</Button>
    <Button type="button" disabled={busy} onClick={()=>void accept()} className="bg-red-600 text-white hover:bg-red-700">{busy?t("common.processing"):request?.confirmLabel}</Button>
   </div>
  </DialogContent>
 </Dialog>;
 return {confirm,confirmationDialog};
}
