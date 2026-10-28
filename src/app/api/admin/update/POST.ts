// InsoMail modification, 2026-10-29. Never replace the customized app with upstream.
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "./utils";
export async function POST(request: Request) {
 const authorization = await authorizeAdminRequest(request);
 if ("error" in authorization) return authorization.error;
 return NextResponse.json({error:"InsoMail uses reviewed manual deployments. Automatic upstream replacement is disabled to preserve customizations."},{status:409});
}
