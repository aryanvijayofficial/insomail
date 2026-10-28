"use client";

import React, { useId, useRef, useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { ShortcutDefinition } from "./types";
import { useDialogFocus } from "@/components/use-dialog-focus";

interface ShortcutsHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutDefinition[];
}

// Puts a styled key badge where the translation has its {key} placeholder.
function withKey(text: string, key: string) {
  const [before, after = ""] = text.split("{key}");
  return (
    <>
      {before}
      <kbd className="px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded font-mono">{key}</kbd>
      {after}
    </>
  );
}

export function ShortcutsHelpDialog({ isOpen, onClose, shortcuts }: ShortcutsHelpDialogProps) {
  if (!isOpen) return null;
  return <ShortcutsHelpDialogContent onClose={onClose} shortcuts={shortcuts} />;
}

function ShortcutsHelpDialogContent({
  onClose,
  shortcuts,
}: Omit<ShortcutsHelpDialogProps, "isOpen">) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useDialogFocus(dialogRef, closeRef);

  const grouped = shortcuts.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShortcutDefinition[]>);

  const [apple, setApple] = useState(false);
  useEffect(() => { setApple(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  const formatKey = (shortcut: ShortcutDefinition) => {
    const mods = shortcut.modifiers ?? [];
    const keys = mods.includes("ctrl") && mods.includes("meta")
      ? [apple ? "⌘" : t("shortcutsHelp.ctrl"), ...mods.filter(m => m !== "ctrl" && m !== "meta")]
      : mods.map(m => m === "meta" ? "⌘" : m === "ctrl" ? t("shortcutsHelp.ctrl") : m === "alt" ? "Alt" : "Shift");
    const sequence = shortcut.key.split(" ");
    return <span className="flex shrink-0 items-center gap-1" aria-label={keys.length ? [...keys, shortcut.key].join(" + ") : sequence.join(" then ")}>
      {[...keys, ...sequence].map((key, index) => <React.Fragment key={index}>{index > 0 && <span className="text-[10px] text-neutral-500">{keys.length ? "+" : "then"}</span>}<kbd className="min-w-6 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-center text-xs font-mono text-neutral-700">{key === "escape" ? "Esc" : key.toUpperCase()}</kbd></React.Fragment>)}
    </span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key !== "Escape" && event.key !== "?") return;
          event.stopPropagation();
          onClose();
        }}
        className="relative w-full max-w-xl bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[calc(100dvh-2rem)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-neutral-900">
                {t("shortcutsHelp.title")}
              </h2>
              <p className="text-xs text-neutral-500">
                {t("shortcutsHelp.subtitle")}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("shortcutsHelp.close")}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="overflow-y-auto min-h-0 p-4 sm:p-5 space-y-5">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-1.5">
                {t(`shortcut.category.${category}` as TranslationKey)}
              </h3>
              <div className="space-y-1.5">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50"
                  >
                    <span className="text-neutral-700">
                      {item.label}
                    </span>
                    {formatKey(item)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 bg-neutral-50 border-t border-neutral-100 flex flex-wrap gap-2 items-center justify-between text-xs text-neutral-500">
          <span>{withKey(t("shortcutsHelp.pressToToggle", { key: "{key}" }), "?")}</span>
          <span>{withKey(t("shortcutsHelp.pressToClose", { key: "{key}" }), "ESC")}</span>
        </div>
      </div>
    </div>
  );
}
