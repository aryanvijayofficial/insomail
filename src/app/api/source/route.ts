// InsoMail modification, 2026-10-29. AGPL-3.0 source offer to every signed-in user.
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";

export async function GET(request: Request) {
  const env = getEnv();
  const auth = await requireSessionUser(env, request);
  if (auth.error) return auth.error;
  const key = (env as CloudflareEnv & { INSOMAIL_SOURCE_KEY?: string }).INSOMAIL_SOURCE_KEY;
  if (!key) return new Response("Source archive not configured", { status: 503 });
  const archive = await env.BUCKET.get(key);
  if (!archive) return new Response("Source archive unavailable", { status: 503 });
  return new Response(archive.body, { headers: {
    "Content-Type": "application/gzip",
    "Content-Disposition": 'attachment; filename="insomail-source.tar.gz"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
