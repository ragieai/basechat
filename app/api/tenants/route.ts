import { tenantListResponseSchema } from "@/lib/schema";
import { requireSession } from "@/lib/server/server-utils";
import { getTenantsByUserId } from "@/lib/server/service";

export async function GET() {
  const session = await requireSession();
  const tenants = await getTenantsByUserId(session.user.id);
  return Response.json(tenantListResponseSchema.parse(tenants));
}
