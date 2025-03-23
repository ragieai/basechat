import assert from "assert";

import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { saveConnection } from "@/lib/server/service";
import * as settings from "@/lib/server/settings";
import { requireAdminContext } from "@/lib/server/utils";

export async function GET(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get("connection_id");
  assert(connectionId, "expected connection_id");

  const { tenant } = await requireAdminContext();
  await saveConnection(tenant.id, connectionId, "syncing");
  redirect(`/${tenant.slug}/data`);
}
