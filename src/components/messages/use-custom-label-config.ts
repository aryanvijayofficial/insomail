"use client";

import { Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { getMailboxLabels } from "@/lib/labels/client";
import type { LabelSummary } from "@/lib/labels/client-types";
import type { MessageFolderConfig } from "./types";

export function useCustomLabelConfig(labelId: string): MessageFolderConfig {
	const { selectedMailbox } = useSelectedMailbox();
	const [labelName, setLabelName] = useState("Label");

	useEffect(() => {
		if (!selectedMailbox?.id) return;
		let cancelled = false;
		getMailboxLabels<{ labels?: LabelSummary[] }>(selectedMailbox.id)
			.then((data) => {
				if (cancelled) return;
				const label = data.labels?.find((item) => item.id === labelId);
				if (label) setLabelName(label.name);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [labelId, selectedMailbox?.id]);

	return useMemo(
		() => ({
			folder: "inbox",
			labelId,
			title: labelName,
			emptyText: "No emails with this label",
			hrefPrefix: `/labels/${labelId}`,
			icon: Tag,
			showRowBadge: false,
		}),
		[labelId, labelName],
	);
}
