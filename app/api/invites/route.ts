import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthContext } from "@/lib/server-utils";
import { createInvites } from "@/lib/service";

const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1),
});

export async function POST(request: NextRequest) {
  const context = await requireAuthContext();

  const json = await request.json();
  const payload = inviteSchema.parse(json);

  const invites = await createInvites(context.tenant.id, context.profile.id, payload.emails);

  return Response.json(invites);
}
