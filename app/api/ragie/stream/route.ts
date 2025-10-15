import { NextRequest } from "next/server";
import { z } from "zod/v3";

import { getRagieApiKeyAndPartition } from "@/lib/server/ragie";
import { RAGIE_API_BASE_URL } from "@/lib/server/settings";
import { requireAuthContext } from "@/lib/server/utils";

const paramsSchema = z.object({
  tenant: z.string(),
  url: z.string(),
});

// Important: The next edge runtime strips "simple headers" like "Range" from the request,
// so we need to use the Node.js runtime to preserve them.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = paramsSchema.parse({
    tenant: request.nextUrl.searchParams.get("tenant"),
    url: request.nextUrl.searchParams.get("url"),
  });

  if (!params.url.startsWith(RAGIE_API_BASE_URL)) {
    return new Response("Invalid URL", { status: 400 });
  }

  const { tenant } = await requireAuthContext(params.tenant);

  try {
    const { apiKey, partition } = await getRagieApiKeyAndPartition(tenant.id);
    // Forward Range if present
    const reqRange = request.headers.get("range");
    // Propagate stream cancel from player
    const controller = new AbortController();
    request.signal.addEventListener("abort", () => controller.abort());

    const upstreamResponse = await fetch(params.url, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        partition: partition,
        ...(reqRange ? { Range: reqRange } : {}),
      },
      signal: controller.signal,
    });

    // If there's no body, bail out:
    if (!upstreamResponse.body) {
      console.error("No body in upstream response");
      return new Response("No body in upstream response", { status: 500 });
    }

    // Stream the upstream response directly back to the client preserving status, headers, etc...
    const passedThroughHeaders = [
      "Content-Type",
      "Accept-Ranges",
      "Content-Length",
      "Content-Range",
      "Transfer-Encoding",
    ];
    const headers = new Headers();
    passedThroughHeaders.forEach((header) => {
      const value = upstreamResponse.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    console.error("Error in transcription stream route:", error);
    return new Response("Error fetching transcription stream", { status: 500 });
  }
}
