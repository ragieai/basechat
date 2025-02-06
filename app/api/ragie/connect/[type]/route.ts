import { NextRequest } from "next/server";
import { ConnectorSource } from "ragie/models/components";

import { getRagieClient } from "@/lib/server/ragie";
import { requireAuthContext } from "@/lib/server/server-utils";
import * as settings from "@/lib/server/settings";

export const dynamic = "force-dynamic"; // no caching

interface Params {
  type: string;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { tenant } = await requireAuthContext();

  const client = getRagieClient();
  const { type } = await params;

  const payload = await client.connections.createOAuthRedirectUrl({
    redirectUri: [settings.BASE_URL, "api/ragie/callback"].join("/"),
    sourceType: type as ConnectorSource | undefined,
    partition: tenant.id,
    theme: "light",
  });

  return Response.json(payload);
}
