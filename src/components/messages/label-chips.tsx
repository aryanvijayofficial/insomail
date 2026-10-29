"use client";

import type { LabelChipLabel } from "./types";

const MAX_VISIBLE_CHIPS = 3;

/** Small colored chips showing which labels a message carries. */
export function LabelChips({
	labelIds,
	labelsById,
	className,
}: {
	labelIds?: string[];
	labelsById?: Map<string, LabelChipLabel>;
	className?: string;
}) {
	if (!labelIds?.length || !labelsById?.size) return null;
	const labels = labelIds
		.map((id) => labelsById.get(id))
		.filter((label): label is LabelChipLabel => !!label);
	if (!labels.length) return null;
	const visible = labels.slice(0, MAX_VISIBLE_CHIPS);
	const hidden = labels.length - visible.length;
	return (
		<span className={`inline-flex max-w-full items-center gap-1 overflow-hidden ${className ?? ""}`}>
			{visible.map((label) => (
				<span
					key={label.id}
					className="inline-flex max-w-32 items-center gap-1 truncate rounded-full border border-neutral-200 bg-neutral-50 px-1.5 py-px text-[10px] leading-4 text-neutral-600"
				>
					<span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
					<span className="truncate">{label.name}</span>
				</span>
			))}
			{hidden > 0 && (
				<span className="text-[10px] leading-4 text-neutral-400">+{hidden}</span>
			)}
		</span>
	);
}
