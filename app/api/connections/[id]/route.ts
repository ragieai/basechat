import { authOrRedirect } from "@/lib/server-utils";
import { deleteConnection } from "@/lib/service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await authOrRedirect();

  await deleteConnection(tenant.id, id);

  return Response.json(200, {});
}
