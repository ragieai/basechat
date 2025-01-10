import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { updateTenantSchema } from "@/lib/schema";
import { requireSession } from "@/lib/server-utils";
import { getTenantByUserId } from "@/lib/service";

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  const json = await request.json();
  const update = updateTenantSchema.parse(json);

  await db.update(schema.tenants).set(update).where(eq(schema.tenants.id, tenant.id));

  return new Response();
}
