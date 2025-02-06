import { NextRequest } from "next/server";
import { z } from "zod";

import { deleteInviteById, updateInviteRoleById } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

type Params = Promise<{ id: string }>;

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAuthContext();
  const { id } = await params;
  await deleteInviteById(tenant.id, id);
  return new Response(null, { status: 200 });
}

const updateInviteRoleByIdSchema = z
  .object({
    role: z.union([z.literal("admin"), z.literal("user")]),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAuthContext();
  const { id } = await params;

  const json = await request.json();
  const payload = updateInviteRoleByIdSchema.parse(json);
  await updateInviteRoleById(tenant.id, id, payload.role);
  return new Response(null, { status: 200 });
}
