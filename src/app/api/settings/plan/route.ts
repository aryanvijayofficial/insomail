// Legacy authenticated endpoint. Stored tier values are inert; there is no chooser.
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
export async function GET(request: Request) {
 const auth=await requireSessionUser(getEnv(),request); if(auth.error)return auth.error;
 return Response.json({featureSet:"standard",selectionRequired:false},{headers:{"Cache-Control":"private, no-store"}});
}
export async function PATCH(request: Request) {
 const auth=await requireSessionUser(getEnv(),request); if(auth.error)return auth.error;
 return Response.json({error:"Feature selection is no longer required. Refresh the application."},{status:410,headers:{"Cache-Control":"private, no-store"}});
}
