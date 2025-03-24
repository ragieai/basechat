import { NextRequest } from "next/server";
import { z } from "zod";

import { createTenant, setCurrentProfileId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

const setupSchema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const payload = setupSchema.parse(await request.json());
  const { profile, tenant } = await createTenant(session.user.id, payload.name);

  await setCurrentProfileId(session.user.id, profile.id);

  return Response.json({ profile, tenant });
}
