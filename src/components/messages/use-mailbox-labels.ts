"use client";

import { useEffect, useMemo, useState } from "react";
import { getMailboxLabels } from "@/lib/labels/client";
import type { LabelSummary } from "@/lib/labels/client-types";

/** Labels of the selected mailbox, refreshed when labels or messages change. */
export function useMailboxLabels(mailboxId: string | null | undefined) {
	const [labels, setLabels] = useState<LabelSummary[]>([]);

	useEffect(() => {
		if (!mailboxId) {
			setLabels([]);
			return;
		}
		let cancelled = false;
		function load() {
			getMailboxLabels<{ labels?: LabelSummary[] }>(mailboxId!)
				.then((data) => {
					if (!cancelled) setLabels(data.labels ?? []);
				})
				.catch(() => {
					if (!cancelled) setLabels([]);
				});
		}
		load();
		window.addEventListener("mailflare:labels-changed", load);
		return () => {
			cancelled = true;
			window.removeEventListener("mailflare:labels-changed", load);
		};
	}, [mailboxId]);

	const labelsById = useMemo(() => new Map(labels.map((label) => [label.id, label])), [labels]);
	return { labels, labelsById };
}
