import assert from "assert";

import { and, eq, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";

import db from "./db";
import * as schema from "./db/schema";
import { getRagieClient, getRagieConnection } from "./ragie";
import { Member, MemberRole, MemberType } from "./schema";

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

export async function getMembersByTenantId(tenantId: string): Promise<Member[]> {
  return union(
    db
      .select({
        id: schema.profiles.id,
        email: schema.users.email,
        name: schema.users.name,
        type: sql<MemberType>`'profile'`.as("type"),
        role: sql<MemberRole>`
          case
            when ${schema.tenants.ownerId} = ${schema.users.id} then 'owner'
            else 'user'
          end
        `.as("role"),
      })
      .from(schema.profiles)
      .innerJoin(schema.users, eq(schema.profiles.userId, schema.users.id))
      .innerJoin(schema.tenants, eq(schema.tenants.id, tenantId))
      .where(eq(schema.profiles.tenantId, tenantId)),
    db
      .select({
        id: schema.invites.id,
        email: schema.invites.email,
        name: schema.invites.email,
        type: sql<MemberType>`'invite'`.as("type"),
        role: sql<MemberRole>`'invite'`.as("role"),
      })
      .from(schema.invites)
      .where(eq(schema.invites.tenantId, tenantId)),
  ).orderBy(sql`type desc`, sql`name`);
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

export async function createInvites(tenantId: string, invitedBy: string, emails: string[]) {
  return await db.transaction(
    async (tx) =>
      await Promise.all(
        emails.map(async (email) => {
          const rs = await tx
            .insert(schema.invites)
            .values({ tenantId, invitedBy, email })
            .onConflictDoUpdate({
              target: [schema.invites.tenantId, schema.invites.email],
              set: { invitedBy, updatedAt: new Date().toISOString() },
            })
            .returning();

          assert(rs.length === 1);

          return rs[0];
        }),
      ),
  );
}

export async function getProfileByTenantIdAndUserId(tenantId: string, userId: string) {
  const rs = await db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.userId, userId)));
  assert(rs.length === 1, "expected single record");
  return rs[0];
}
