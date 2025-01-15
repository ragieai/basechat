import { NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/server-utils";
import { createTenant } from "@/lib/service";

const setupSchema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const payload = setupSchema.parse(await request.json());
  const { tenantId } = await createTenant(session.user.id, payload.name);
  return Response.json({ id: tenantId });
}
