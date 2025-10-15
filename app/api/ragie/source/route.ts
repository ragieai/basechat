import { NextRequest } from "next/server";
import { z } from "zod/v3";

import { getRagieApiKeyAndPartition } from "@/lib/server/ragie";
import { RAGIE_API_BASE_URL } from "@/lib/server/settings";
import { requireAuthContext } from "@/lib/server/utils";

const paramsSchema = z.object({
  tenant: z.string(),
  url: z.string(),
});

export async function GET(request: NextRequest) {
  const parsedParams = paramsSchema.safeParse({
    tenant: request.nextUrl.searchParams.get("tenant"),
    url: request.nextUrl.searchParams.get("url"),
  });
  if (!parsedParams.success) {
    return new Response("Invalid URL params", { status: 422 });
  }
  const params = parsedParams.data;

  const { tenant } = await requireAuthContext(params.tenant);

  if (!params.url.startsWith(RAGIE_API_BASE_URL)) {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    const { apiKey, partition } = await getRagieApiKeyAndPartition(tenant.id);

    const upstreamResponse = await fetch(params.url, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        partition: partition,
      },
    });

    // If there's no body, bail out:
    if (!upstreamResponse.body) {
      console.error("No body in upstream response");
      return new Response("No body in upstream response", { status: 500 });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    });
  } catch (error) {
    console.error("Error in source route:", error);
    return new Response("Error fetching document source", { status: 500 });
  }
}
