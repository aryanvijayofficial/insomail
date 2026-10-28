// InsoMail modification, 2026-10-29. A user's own free plan, never admin rights.
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
export async function GET(request: Request) {
 const env=getEnv(); const auth=await requireSessionUser(env,request); if(auth.error)return auth.error;
 const [user]=await getDb(env).select({plan:users.insomailPlan}).from(users).where(eq(users.id,auth.user.id)).limit(1);
 return Response.json({plan:user?.plan ?? "professional",price:0,currency:"USD",provider:"InsoMail local policy"},{headers:{"Cache-Control":"private, no-store"}});
}
export async function PATCH(request: Request) {
 const env=getEnv(); const auth=await requireSessionUser(env,request); if(auth.error)return auth.error;
 if(!hasValidSessionMutationOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
 const input=await request.json().catch(()=>null) as {plan?:unknown}|null;
 if(!input || Object.keys(input).some(key=>key!=="plan") || (input.plan!=="professional" && input.plan!=="team"))return Response.json({error:"Choose Professional or Team"},{status:400});
 await getDb(env).update(users).set({insomailPlan:input.plan}).where(eq(users.id,auth.user.id));
 return Response.json({plan:input.plan,price:0},{headers:{"Cache-Control":"private, no-store"}});
}
