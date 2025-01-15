import { tenantListResponseSchema } from "@/lib/schema";
import { requireSession } from "@/lib/server-utils";
import { getTenantsByUserId } from "@/lib/service";

export async function GET() {
  const session = await requireSession();
  const tenants = await getTenantsByUserId(session.user.id);
  return Response.json(tenantListResponseSchema.parse(tenants));
}
