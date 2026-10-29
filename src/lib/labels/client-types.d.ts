export type LabelSummary = {
	id: string;
	name: string;
	color: string;
	parentId: string | null;
	descendantCount: number;
	messageCount: number;
};

export type LabelListResponse = { labels?: unknown[]; error?: string };
