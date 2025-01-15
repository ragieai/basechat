import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { updateTenantSchema } from "@/lib/schema";
import { requireAuthContext } from "@/lib/server-utils";

export async function PATCH(request: NextRequest) {
  const { tenant } = await requireAuthContext();

  const json = await request.json();
  const update = updateTenantSchema.parse(json);

  await db.update(schema.tenants).set(update).where(eq(schema.tenants.id, tenant.id));

  return new Response();
}
