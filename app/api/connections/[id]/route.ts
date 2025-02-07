import { deleteConnection } from "@/lib/server/service";
import { requireAdminContext } from "@/lib/server/utils";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireAdminContext();

  await deleteConnection(tenant.id, id);

  return Response.json(200, {});
}
