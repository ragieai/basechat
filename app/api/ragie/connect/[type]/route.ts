import { NextRequest } from "next/server";
import { Ragie } from "ragie";

import { authOrRedirect } from "@/lib/server-utils";
import * as settings from "@/lib/settings";

export const dynamic = "force-dynamic"; // no caching

interface Params {
  type: string;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { tenant } = await authOrRedirect();

  const client = new Ragie({ auth: settings.RAGIE_API_KEY, serverURL: settings.RAGIE_API_BASE_URL });
  const { type } = await params;

  const payload = await client.connections.createOAuthRedirectUrl({
    redirectUri: [settings.BASE_URL, "api/ragie/callback"].join("/"),
    sourceType: type,
    partition: tenant.id,
  });

  return Response.json(payload);
}
