import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col-reverse justify-end gap-5 min-h-full bg-inherit md:flex-row md:justify-start">
			<div className="min-w-0 flex-1 px-4 pt-2 pb-24 sm:px-6">
				<div className="mx-auto w-full max-w-3xl">{children}</div>
			</div>
			<SettingsNav />
		</div>
	);
}
