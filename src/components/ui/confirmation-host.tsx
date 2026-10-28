"use client";

import { useLanguage } from "@/components/language-provider";
import { useEffect } from "react";
import { useConfirmDialog } from "./use-confirm-dialog";

const EVENT = "insomail:request-confirmation";
type Request = { description: string; resolve: (value: boolean) => void };
/** Browser-native confirmations use the same accessible, cancel-first shell as other dialogs. */
export function requestConfirmation(description: string): Promise<boolean> {
 if (typeof window === "undefined") return Promise.resolve(false);
 return new Promise(resolve => window.dispatchEvent(new CustomEvent<Request>(EVENT, { detail: { description, resolve } })));
}
export function ConfirmationHost() {
 const { t } = useLanguage();
 const { confirm, confirmationDialog } = useConfirmDialog();
 useEffect(() => {
  const receive = (event: Event) => {
   const { description, resolve } = (event as CustomEvent<Request>).detail;
   void confirm({ title: t("common.confirmAction"), description, confirmLabel: t("common.confirm") }).then(resolve);
  };
  window.addEventListener(EVENT, receive);
  return () => window.removeEventListener(EVENT, receive);
 }, [confirm, t]);
 return confirmationDialog;
}
