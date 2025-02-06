import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { updateTenantSchema } from "@/lib/schema";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { requireAuthContext } from "@/lib/server/server-utils";

export async function PATCH(request: NextRequest) {
  const { tenant } = await requireAuthContext();

  const json = await request.json();
  const update = updateTenantSchema.parse(json);

  await db.update(schema.tenants).set(update).where(eq(schema.tenants.id, tenant.id));

  return new Response();
}
