"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "./language-provider";
import { readThemePreference, resolveTheme, saveThemePreference, THEME_CHANGED_EVENT } from "./theme-utils";

export function ThemeToggle() {
  const { t } = useLanguage();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(resolveTheme(readThemePreference()) === "dark");
    sync();
    window.addEventListener(THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    media.addEventListener("change", sync);
    return () => { window.removeEventListener(THEME_CHANGED_EVENT, sync); window.removeEventListener("storage", sync); media.removeEventListener("change", sync); };
  }, []);
  const label = `${t("settings.theme.label")}: ${t(dark ? "settings.theme.light" : "settings.theme.dark")}`;
  return <button type="button" aria-label={label} title={label} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" onClick={() => saveThemePreference(dark ? "light" : "dark")}>
    {dark ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
  </button>;
}
