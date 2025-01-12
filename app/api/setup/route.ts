import { NextRequest } from "next/server";
import { z } from "zod";

import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireSession } from "@/lib/server-utils";
import { createTenant } from "@/lib/service";

const setupSchema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const session = await requireSession();

  const payload = setupSchema.parse(await request.json());

  await createTenant(session.user.id, payload.name);

  return Response.json(200, {});
}
