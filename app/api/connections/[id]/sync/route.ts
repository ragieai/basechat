import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { getRagieConnectionIdByConnectionId } from "@/lib/server/service";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireAdminContextFromRequest(request);

  const ragieConnectionId = await getRagieConnectionIdByConnectionId(tenant.id, id);

  try {
    const { client } = await getRagieClientAndPartition(tenant.id);

    await client.connections.sync({
      connectionId: ragieConnectionId,
    });
  } catch (e: any) {
    if (e.rawResponse.status !== 404) throw e;
    console.warn("connection missing in Ragie");
  }

  return Response.json(200, {});
}
