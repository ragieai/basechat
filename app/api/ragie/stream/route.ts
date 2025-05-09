import { NextRequest } from "next/server";
import { z } from "zod";

import { getRagieApiKey } from "@/lib/server/ragie";
import { RAGIE_API_BASE_URL } from "@/lib/server/settings";
import { requireAuthContext } from "@/lib/server/utils";

const paramsSchema = z.object({
  tenant: z.string(),
  url: z.string(),
});

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
    const ragieApiKey = await getRagieApiKey(tenant);
    const upstreamResponse = await fetch(params.url, {
      headers: {
        authorization: `Bearer ${ragieApiKey}`,
        partition: tenant.ragiePartition || tenant.id,
      },
    });

    // If there's no body, bail out:
    if (!upstreamResponse.body) {
      console.error("No body in upstream response");
      return new Response("No body in upstream response", { status: 500 });
    }

    // Stream the upstream response directly back to the client preserving status, headers, etc...
    const url = new URL(params.url);
    const mediaType = url.searchParams.get("media_type");
    let contentType = upstreamResponse.headers.get("Content-Type") ?? "application/octet-stream";

    // Override content type based on file extension if not already set correctly
    if (!mediaType) {
      if (url.pathname.toLowerCase().endsWith(".mp4")) {
        contentType = "video/mp4";
      } else if (url.pathname.toLowerCase().endsWith(".mp3")) {
        contentType = "audio/mpeg";
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("Error in transcription stream route:", error);
    return new Response("Error fetching transcription stream", { status: 500 });
  }
}
