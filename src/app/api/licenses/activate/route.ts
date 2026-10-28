import { getEnv } from "@/lib/cloudflare";
import { requireLicenseAdmin } from "../utils";
export async function POST(request: Request) {
 const forbidden=await requireLicenseAdmin(getEnv(),request); if(forbidden)return forbidden;
 return Response.json({error:"License selection is not used by this application."},{status:410});
}
