import { getMembersByTenantId } from "@/lib/server/service";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");

  const { tenant } = await requireAdminContextFromRequest(request);
  const { members, total } = await getMembersByTenantId(tenant.id, page, pageSize);

  return Response.json({ members, total, page, pageSize });
}
