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
    const statusCode = e.statusCode;
    const bodyJSON = JSON.parse(e.body);
    const errorDetail = bodyJSON.detail;

    return Response.json({ error: errorDetail }, { status: statusCode });
  }
}
