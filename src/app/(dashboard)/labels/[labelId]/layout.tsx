"use client";

import { useParams } from "next/navigation";
import { MessageSplitLayout } from "@/components/messages/message-split-layout";
import { useCustomLabelConfig } from "@/components/messages/use-custom-label-config";

export default function LabelLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const params = useParams<{ labelId: string }>();
	const config = useCustomLabelConfig(params.labelId);

	return <MessageSplitLayout config={config}>{children}</MessageSplitLayout>;
}
