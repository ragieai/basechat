import { tenantListResponseSchema } from "@/lib/api";
import { getTenantsByUserId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

export async function GET() {
  const session = await requireSession();
  // TODO: do we need authContext ?
  // const { session } = await requireAuthContext();
  const tenants = await getTenantsByUserId(session.user.id);
  return Response.json(tenantListResponseSchema.parse(tenants));
}
