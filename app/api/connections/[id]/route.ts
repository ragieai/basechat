import { deleteConnection } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireAuthContext();

  await deleteConnection(tenant.id, id);

  return Response.json(200, {});
}
