import { NextRequest } from "next/server";
import { z } from "zod";

import { getRagieApiKeyAndPartition } from "@/lib/server/ragie";
import { RAGIE_API_BASE_URL } from "@/lib/server/settings";
import { requireAuthContext } from "@/lib/server/utils";

const reqBodySchema = z.object({
  query: z.string(),
  effort: z.string(),
  tenantSlug: z.string(),
});

// Important: The next edge runtime strips "simple headers" like "Range" from the request,
// so we need to use the Node.js runtime to preserve them.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const params = reqBodySchema.parse(await request.json());

  const { tenant } = await requireAuthContext(params.tenantSlug);

  try {
    const { apiKey, partition } = await getRagieApiKeyAndPartition(tenant.id);
    const controller = new AbortController();
    request.signal.addEventListener("abort", () => controller.abort());

    const upstreamResponse = await fetch(`${RAGIE_API_BASE_URL}/agents/search`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      method: "POST",
      body: JSON.stringify({
        query: params.query,
        effort: params.effort,
        partitions: [partition],
        stream: true,
      }),
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
    console.error("Error in transcription stream route:", error);
    return new Response("Error fetching transcription stream", { status: 500 });
  }
}
