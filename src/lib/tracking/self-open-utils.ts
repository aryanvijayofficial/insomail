import { parseTrackingToken } from "./open-tracking-utils";

/** Recognize pixel paths without fetching the image or exposing its token. */
export function trackingTokenFromUrl(value: string): string | null {
 try {
  const url = new URL(value.replaceAll("&amp;", "&"), "https://local.invalid");
  if (url.pathname.startsWith("/api/remote-images")) {
   const nested = url.searchParams.get("url");
   return nested && nested !== value ? trackingTokenFromUrl(nested) : null;
  }
  const match = /^\/api\/i\/([^/]+)$/.exec(url.pathname);
  return match ? parseTrackingToken(decodeURIComponent(match[1])) : null;
 } catch { return null; }
}

const IMAGE_TAG = /<img\b[^>]*>/gi;
function imageToken(tag: string): string | null {
 const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
 return src ? trackingTokenFromUrl(src[1] ?? src[2] ?? src[3]) : null;
}
export function embeddedTrackingTokens(html: string): string[] {
 return [...new Set((html.match(IMAGE_TAG) ?? []).map(imageToken).filter((v): v is string => !!v))];
}
/** Remove only identified owner pixels, leaving other senders' images intact. */
export function stripOwnedPixelImages(html: string, owned: ReadonlySet<string>): string {
 return html.replace(IMAGE_TAG, tag => { const token = imageToken(tag); return token && owned.has(token) ? "" : tag; });
}
