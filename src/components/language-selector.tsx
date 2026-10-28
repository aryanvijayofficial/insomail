"use client";

import { Select } from "./ui/select";
import { Label } from "./ui/label";
import { useId } from "react";
import { locales, supportedLocales } from "@/lib/i18n/locales";
import { resolveLocale } from "@/lib/i18n/utils";
import { useLanguage } from "./language-provider";

export function LanguageSelector({ variant = "field" }: { variant?: "field" | "text" }) {
	const id = useId();
	const { locale, setLocale, t } = useLanguage();
	const options = supportedLocales.map((value) => (
		<option key={value} value={value} lang={value}>{locales[value].label}</option>
	));

	if (variant === "text") {
        return <Select id={id} aria-label={t("language.label")} value={locale} onChange={event=>setLocale(resolveLocale(event.target.value))} containerClassName="w-auto" className="h-9 border-transparent bg-transparent text-sm font-medium text-neutral-600 shadow-none">{options}</Select>;
	}

	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id}>{t("language.label")}</Label>
			<Select id={id} value={locale} onChange={(event) => setLocale(resolveLocale(event.target.value))}>
				{options}
			</Select>
		</div>
	);
}
