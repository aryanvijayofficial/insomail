"use client";

import { useParams } from "next/navigation";
import { MessageFolderPage } from "@/components/messages/message-folder-page";
import { useCustomLabelConfig } from "@/components/messages/use-custom-label-config";

export default function LabelPage() {
	const params = useParams<{ labelId: string }>();
	const config = useCustomLabelConfig(params.labelId);

	return <MessageFolderPage config={config} />;
}
