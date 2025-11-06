import { NextRequest } from "next/server";
import { z } from "zod";

import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { requireAuthContext } from "@/lib/server/utils";

const searchParamsSchema = z.object({
  tenant: z.string(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const parsedParams = searchParamsSchema.safeParse({
    tenant: request.nextUrl.searchParams.get("tenant"),
  });
  if (!parsedParams.success) {
    return new Response("Invalid URL search params", { status: 422 });
  }

  const { tenant } = await requireAuthContext(parsedParams.data.tenant);

  try {
    const { client, partition } = await getRagieClientAndPartition(tenant.id);

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
