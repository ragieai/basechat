import { deleteConnection } from "@/lib/server/service";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireAdminContextFromRequest(request);

  await deleteConnection(tenant.id, id);

  return Response.json(200, {});
}
