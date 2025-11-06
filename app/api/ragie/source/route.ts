import { NextRequest } from "next/server";
import { z } from "zod";

import { getRagieClientAndPartition } from "@/lib/server/ragie";
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
    const { client, partition } = await getRagieClientAndPartition(tenant.id);
    const url = new URL(params.url);
    const pathParts = url.pathname.split("/").filter(Boolean); // Remove empty strings
    // Expected path: ["documents", "{documentId}", "source"]
    if (pathParts.length !== 3 || pathParts[0] !== "documents" || pathParts[2] !== "source") {
      return new Response("Invalid URL format", { status: 400 });
    }
    const documentId = pathParts[1];

    const res = await client.documents.getSource({ partition, documentId });

    // If there's no body, bail out:
    if (!res) {
      console.error("No body in upstream response");
      return new Response("No body in upstream response", { status: 500 });
    }

    return new Response(res, {
      status: 200,
      headers: {
        "Content-Type": "*/*",
      },
    });
  } catch (error) {
    console.error("Error in source route:", error);
    return new Response("Error fetching document source", { status: 500 });
  }
}
