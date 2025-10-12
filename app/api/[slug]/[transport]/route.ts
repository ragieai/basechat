import { NextRequest } from "next/server";

import auth from "@/auth";
import { getRagieApiKeyAndPartition } from "@/lib/server/ragie";
import { RAGIE_API_BASE_URL } from "@/lib/server/settings";
import { requireMcpAuthContext } from "@/lib/server/utils";

const handler = async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const session = await auth.api.getMcpSession({
    headers: req.headers,
  });
  if (!session) {
    return new Response(null, {
      status: 401,
    });
  }
  const { slug } = await params;

  const { profile, tenant } = await requireMcpAuthContext(slug);
  const { apiKey, partition } = await getRagieApiKeyAndPartition(tenant.id);

  // Proxy the request to the Ragie MCP server
  const localRagieMcpUrl = `${RAGIE_API_BASE_URL}/mcp/${partition}`;

  try {
    const response = await fetch(localRagieMcpUrl, {
      method: req.method,
      headers: {
        ...Object.fromEntries(req.headers.entries()),
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": req.headers.get("content-type") || "application/json",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Error proxying request to Ragie MCP server:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to proxy request to Ragie MCP server",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

export { handler as GET, handler as POST, handler as DELETE, handler as OPTIONS };
