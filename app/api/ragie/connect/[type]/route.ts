import { NextRequest } from "next/server";
import { ConnectorSource } from "ragie/models/components";

import { getRagieClient } from "@/lib/server/ragie";
import * as settings from "@/lib/server/settings";
import { requireAdminContext } from "@/lib/server/utils";

export const dynamic = "force-dynamic"; // no caching

interface Params {
  type: string;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { tenant } = await requireAdminContext();

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
