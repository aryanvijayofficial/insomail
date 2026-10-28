// InsoMail modification, 2026-10-29. Missing optional updater credentials are not an app error.
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "./utils";
export async function GET(request: Request) {
 const authorization = await authorizeAdminRequest(request);
 if ("error" in authorization) return authorization.error;
 return NextResponse.json({configured:false,configuration:[],mode:"manual",reason:"Reviewed manual deployments preserve InsoMail customizations."});
}
