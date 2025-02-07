import { NextRequest } from "next/server";
import { z } from "zod";

import { createInvites } from "@/lib/server/service";
import { requireAdminContext } from "@/lib/server/utils";

const inviteSchema = z
  .object({
    emails: z.array(z.string().email()).min(1),
    role: z.union([z.literal("admin"), z.literal("user")]),
  })
  .strict();

export async function POST(request: NextRequest) {
  const { profile, tenant } = await requireAdminContext();

  const json = await request.json();
  const payload = inviteSchema.parse(json);

  const invites = await createInvites(tenant.id, profile.id, payload.emails, payload.role);

  return Response.json(invites);
}
