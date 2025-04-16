import { unauthorized } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";

import { changeRole, deleteProfile, isProfileDeleteAllowed, ServiceError } from "@/lib/server/service";
import { requireAdminContextFromRequest, requireAuthContextFromRequest } from "@/lib/server/utils";

type Params = Promise<{ id: string }>;

function unwrap(e: unknown): Error {
  if (!(e instanceof Error)) throw e;
  return e;
}

function renderError(e: unknown) {
  const err = unwrap(e);
  const message = err instanceof ServiceError ? err.message : "Unexpected error";
  return new Response(JSON.stringify({ error: message }), { status: 500 });
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);
  const { id } = await params;

  try {
    await deleteProfile(tenant.id, id, profile);
  } catch (e) {
    return renderError(e);
  }
  return new Response(null, { status: 200 });
}

const updateProfileRoleByIdSchema = z
  .object({
    role: z.union([z.literal("admin"), z.literal("user")]),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { tenant } = await requireAdminContextFromRequest(request);
  const { id } = await params;

  const json = await request.json();
  const payload = updateProfileRoleByIdSchema.parse(json);

  try {
    await changeRole(tenant.id, id, payload.role);
  } catch (e) {
    return renderError(e);
  }
  return new Response(null, { status: 200 });
}
