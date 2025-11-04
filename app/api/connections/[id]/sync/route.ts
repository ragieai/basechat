import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { getConnectionById } from "@/lib/server/service";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireAdminContextFromRequest(request);

  const connection = await getConnectionById(tenant.id, id);

  try {
    const { client } = await getRagieClientAndPartition(tenant.id);

    await client.connections.sync({
      connectionId: connection.ragieConnectionId,
    });

    return Response.json({ success: true });
  } catch (e: any) {
    // Handle errors from Ragie API
    if (e?.rawResponse) {
      const status = e.rawResponse.status;
      let errorDetail = "Failed to sync connection";

      // Try to extract error detail from response body
      try {
        // Clone the response to avoid consuming the original
        const clonedResponse = e.rawResponse.clone();
        const errorBody = await clonedResponse.json();
        errorDetail = errorBody.detail || errorDetail;
      } catch {
        // If parsing fails, check if error message contains detail
        if (e.message) {
          errorDetail = e.message;
        }
      }

      return Response.json({ error: errorDetail }, { status });
    }

    // For 404, log warning but still return error
    if (e instanceof Error && e.message?.includes("404")) {
      console.warn("connection missing in Ragie");
      return Response.json({ error: "No connection found" }, { status: 404 });
    }

    // Re-throw unexpected errors
    throw e;
  }
}
