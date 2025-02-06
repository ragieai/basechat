import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthContext } from "@/lib/server-utils";
import { deleteProfileById, updateProfileRoleById } from "@/lib/service";

type Params = Promise<{ id: string }>;

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAuthContext();
  const { id } = await params;
  await deleteProfileById(tenant.id, id);
  return new Response(null, { status: 200 });
}

const updateProfileRoleByIdSchema = z
  .object({
    role: z.union([z.literal("admin"), z.literal("user")]),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAuthContext();
  const { id } = await params;

  const json = await request.json();
  const payload = updateProfileRoleByIdSchema.parse(json);
  await updateProfileRoleById(tenant.id, id, payload.role);
  return new Response(null, { status: 200 });
}
