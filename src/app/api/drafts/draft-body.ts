import { textToHtml } from "@/components/compose/rich-text-utils";

/**
 * Resolves the bodies stored for a draft save. A client that sends `html` owns
 * both bodies (an explicit empty string clears the rich copy). A text-only
 * client, such as the mobile app, never sees the rich copy: when its text
 * still matches the stored text the rich copy is kept, and when the text
 * changed the rich copy is rebuilt from that text so stale formatting can
 * never override the edit the user just made.
 */
export function resolveDraftBodies(
	existing: { textBody: string | null; htmlBody: string | null } | null,
	input: { text?: string; html?: string },
): { text: string; htmlBody: string | null } {
	const text = input.text ?? "";
	if (input.html !== undefined) return { text, htmlBody: input.html || null };
	const normalize = (value: string) => value.replace(/\r\n?/g, "\n");
	if (existing && normalize(existing.textBody ?? "") === normalize(text)) return { text, htmlBody: existing.htmlBody };
	return { text, htmlBody: textToHtml(text) || null };
}
