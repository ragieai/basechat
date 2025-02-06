import assert from "assert";

import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { saveConnection } from "@/lib/server/service";
import { RAGIE_WEBHOOK_SECRET } from "@/lib/server/settings";
import { validateSignature } from "@/lib/server/utils";

interface WebhookEvent {
  type: string;
  payload: any;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return Response.json({ message: "missing signature" }, { status: 400 });
  }

  const buffer = await request.arrayBuffer();

  const isValid = await validateSignature(RAGIE_WEBHOOK_SECRET, buffer, signature);
  if (!isValid) {
    return Response.json({ message: "invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(new TextDecoder("utf-8").decode(buffer)) as WebhookEvent;

  // Ignore all other webhooks
  if (
    event.type !== "connection_sync_started" &&
    event.type !== "connection_sync_progress" &&
    event.type !== "connection_sync_finished"
  ) {
    return Response.json({ message: "success" });
  }

  const status =
    event.type === "connection_sync_started" || event.type === "connection_sync_progress" ? "syncing" : "ready";

  // FIXME: This fails if we don't already know about the connection
  const rs = await db
    .select()
    .from(schema.connections)
    .where(eq(schema.connections.ragieConnectionId, event.payload.connection_id));
  assert(rs.length === 1, "failed connection lookup");
  await saveConnection(rs[0].tenantId, event.payload.connection_id, status);

  return Response.json({ message: "success" });
}
