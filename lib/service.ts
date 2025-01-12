import assert from "assert";

import { and, eq } from "drizzle-orm";

import db from "./db";
import * as schema from "./db/schema";
import { getRagieClient, getRagieConnection } from "./ragie";
import { Profile } from "./schema";

export async function createTenant(userId: string, name: string) {
  const tenants = await db
    .insert(schema.tenants)
    .values({ name, ownerId: userId })
    .returning({ id: schema.tenants.id });
  assert(tenants.length === 1);
  const tenantId = tenants[0].id;

  const profiles = await db.insert(schema.profiles).values({ tenantId, userId }).returning({ id: schema.profiles.id });
  assert(profiles.length === 1);
  const profileId = profiles[0].id;

  return { tenantId, profileId };
}

export async function deleteConnection(tenantId: string, id: string) {
  await db.transaction(async (tx) => {
    const rs = await tx
      .select()
      .from(schema.connections)
      .where(and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.id, id)));

    assert(rs.length === 1);

    const connection = rs[0];

    await tx
      .delete(schema.connections)
      .where(and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.id, connection.id)));

    try {
      await getRagieClient().connections.deleteConnection({
        connectionId: connection.ragieConnectionId,
        deleteConnectionPayload: { keepFiles: false },
      });
    } catch (e: any) {
      if (e.rawResponse.status !== 404) throw e;
      console.warn("connection missing in Ragie");
    }
  });
}

export async function saveConnection(tenantId: string, ragieConnectionId: string, status: string) {
  const qs = await db
    .select()
    .from(schema.connections)
    .where(and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.ragieConnectionId, ragieConnectionId)))
    .for("update");
  const connection = qs.length === 1 ? qs[0] : null;

  if (!connection) {
    const ragieConnection = await getRagieConnection(ragieConnectionId);
    await db.insert(schema.connections).values({
      tenantId: tenantId,
      ragieConnectionId,
      name: ragieConnection.source_display_name,
      status,
      sourceType: ragieConnection.source_type,
    });
  } else {
    await db
      .update(schema.connections)
      .set({ status })
      .where(
        and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.ragieConnectionId, ragieConnectionId)),
      );
  }
}

export async function getProfilesByTenantId(tenantId: string): Promise<Profile[]> {
  return await db
    .select({
      id: schema.profiles.id,
      email: schema.users.email,
      name: schema.users.name,
    })
    .from(schema.profiles)
    .innerJoin(schema.users, eq(schema.profiles.userId, schema.users.id))
    .where(eq(schema.profiles.tenantId, tenantId));
}

export async function getTenantByUserId(id: string) {
  const rs = await db.select().from(schema.tenants).where(eq(schema.tenants.ownerId, id));
  assert(rs.length === 1, "expected single tenant");
  return rs[0];
}

export async function isSetupComplete(userId: string) {
  const rs = await db.select().from(schema.tenants).where(eq(schema.tenants.ownerId, userId));
  assert(rs.length === 0 || rs.length === 1, "unexpected result");
  return rs.length === 1;
}
