export interface LabelNode {
	id: string;
	parentId: string | null;
}

/**
 * True when moving `labelId` under `newParentId` would create a cycle. Walks up
 * from the proposed parent; labels list is the full mailbox set so the walk
 * terminates at a root.
 */
export function wouldCreateLabelCycle(labels: LabelNode[], labelId: string, newParentId: string | null): boolean {
	if (!newParentId) return false;
	if (newParentId === labelId) return true;
	const byId = new Map(labels.map((label) => [label.id, label]));
	let current: LabelNode | undefined = byId.get(newParentId);
	const seen = new Set<string>([labelId]);
	while (current) {
		if (seen.has(current.id)) return true;
		seen.add(current.id);
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}
	return false;
}

/** All descendant ids of a label (children, grandchildren, ...), order unspecified. */
export function collectLabelDescendantIds(labels: LabelNode[], labelId: string): string[] {
	const childrenByParent = new Map<string | null, LabelNode[]>();
	for (const label of labels) {
		const list = childrenByParent.get(label.parentId) ?? [];
		list.push(label);
		childrenByParent.set(label.parentId, list);
	}
	const result: string[] = [];
	const queue = [...(childrenByParent.get(labelId) ?? [])];
	while (queue.length) {
		const node = queue.pop()!;
		result.push(node.id);
		queue.push(...(childrenByParent.get(node.id) ?? []));
	}
	return result;
}

/** Depth of a label within its tree; roots are 1. */
export function labelDepth(labels: LabelNode[], labelId: string): number {
	const byId = new Map(labels.map((label) => [label.id, label]));
	let depth = 0;
	let current: LabelNode | undefined = byId.get(labelId);
	const seen = new Set<string>();
	while (current && !seen.has(current.id)) {
		seen.add(current.id);
		depth += 1;
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}
	return depth;
}
