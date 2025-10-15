import { NextRequest } from "next/server";
import { z } from "zod/v3";

import { deleteInviteById, updateInviteRoleById } from "@/lib/server/service";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

type Params = Promise<{ id: string }>;

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAdminContextFromRequest(request);
  const { id } = await params;
  try {
    await deleteInviteById(tenant.id, id);
  } catch (error) {
    console.error(error);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}

const updateInviteRoleByIdSchema = z
  .object({
    role: z.union([z.literal("admin"), z.literal("user")]),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAdminContextFromRequest(request);
  const { id } = await params;

  const json = await request.json();
  const payload = updateInviteRoleByIdSchema.parse(json);
  await updateInviteRoleById(tenant.id, id, payload.role);
  return new Response(null, { status: 200 });
}
