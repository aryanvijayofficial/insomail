// insoMail modification, 2026-10-29. AGPL-3.0 source offer to every network user.
import { getEnv } from "@/lib/cloudflare";

export async function GET(request: Request) {
  const env = getEnv();
  const key = (env as CloudflareEnv & { INSOMAIL_SOURCE_KEY?: string }).INSOMAIL_SOURCE_KEY;
  if (!key) return new Response("Source archive not configured", { status: 503 });
  const archive = await env.BUCKET.get(key);
  if (!archive) return new Response("Source archive unavailable", { status: 503 });
  return new Response(archive.body, { headers: {
    "Content-Type": "application/gzip",
    "Content-Length": String(archive.size),
    "Content-Disposition": 'attachment; filename="insomail-source.tar.gz"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
