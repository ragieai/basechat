import assert from "assert";

import { and, eq, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";

import * as settings from "@/lib/settings";

import db from "./db";
import * as schema from "./db/schema";
import { getRagieClient } from "./ragie";
import { Member, MemberRole, MemberType } from "./schema";
import { hashPassword } from "./server-utils";

export async function createTenant(userId: string, name: string) {
  const tenants = await db
    .insert(schema.tenants)
    .values({ name, ownerId: userId })
    .returning({ id: schema.tenants.id });
  assert(tenants.length === 1);
  const tenantId = tenants[0].id;

  const profiles = await db
    .insert(schema.profiles)
    .values({ tenantId, userId, role: "admin" })
    .returning({ id: schema.profiles.id });
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
      await getRagieClient().connections.delete({
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
    const ragieConnection = await getRagieClient().connections.get({ connectionId: ragieConnectionId });
    await db.insert(schema.connections).values({
      tenantId: tenantId,
      ragieConnectionId,
      name: ragieConnection.name,
      status,
      sourceType: ragieConnection.type,
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
        role: schema.profiles.role,
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
        role: schema.invites.role,
      })
      .from(schema.invites)
      .where(eq(schema.invites.tenantId, tenantId)),
  ).orderBy(sql`type desc`, sql`name`);
}

export async function getFirstTenantByUserId(id: string) {
  const rs = await db
    .select()
    .from(schema.profiles)
    .innerJoin(schema.tenants, eq(schema.profiles.tenantId, schema.tenants.id))
    .where(eq(schema.profiles.userId, id));
  return rs.length > 0 ? rs[0].tenants : null;
}

export async function createInvites(
  tenantId: string,
  invitedBy: string,
  emails: string[],
  role: (typeof schema.rolesEnum.enumValues)[number],
) {
  const invites = await db.transaction(
    async (tx) =>
      await Promise.all(
        emails.map(async (email) => {
          const rs = await tx
            .insert(schema.invites)
            .values({ tenantId, invitedBy, email, role })
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

  const options: SMTPConnection.Options = {
    host: settings.SMTP_HOST,
    port: settings.SMTP_PORT,
    secure: settings.SMTP_SECURE,
  };
  if (settings.SMTP_USER && settings.SMTP_PASSWORD) {
    options.auth = { type: "login", user: settings.SMTP_USER, pass: settings.SMTP_PASSWORD };
  }

  const promises = invites.map((invite) => {
    const inviteLink = settings.BASE_URL + "/invites/accept?invite=" + invite.id;

    return sendMail({
      to: invite.email,
      from: settings.SMTP_FROM,
      subject: `You have been invited to ${settings.APP_NAME}`,
      text: `Click the link below to accept the invite:\n\n${inviteLink}`,
    });
  });

  await Promise.all(promises);

  return invites;
}

export async function getProfileByTenantIdAndUserId(tenantId: string, userId: string) {
  const rs = await db
    .select()
    .from(schema.profiles)
    .innerJoin(schema.tenants, eq(schema.profiles.tenantId, schema.tenants.id))
    .where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.userId, userId)));
  assert(rs.length === 1, "expected single record");
  return rs[0];
}

export async function getAuthContextByUserId(userId: string) {
  const rs = await db
    .select()
    .from(schema.users)
    .innerJoin(schema.profiles, eq(schema.users.currentProfileId, schema.profiles.id))
    .innerJoin(schema.tenants, eq(schema.profiles.tenantId, schema.tenants.id))
    .where(eq(schema.users.id, userId));

  assert(rs.length === 1, "expected single record");
  const row = rs[0];

  return { profile: row.profiles, tenant: row.tenants };
}

async function getInviteById(id: string) {
  const rs = await db.select().from(schema.invites).where(eq(schema.invites.id, id));
  assert(rs.length === 1);
  return rs[0];
}

export async function acceptInvite(userId: string, inviteId: string) {
  const invite = await getInviteById(inviteId);

  const profile = await db.transaction(async (tx) => {
    const rs = await tx
      .insert(schema.profiles)
      .values({ tenantId: invite.tenantId, userId, role: invite.role })
      .returning();
    await tx.delete(schema.invites).where(eq(schema.invites.id, inviteId));
    assert(rs.length === 1, "expected new profile");
    return rs[0];
  });
  return profile;
}

export async function getTenantsByUserId(userId: string) {
  return db
    .select({ id: schema.tenants.id, name: schema.tenants.name, profileId: schema.profiles.id })
    .from(schema.tenants)
    .innerJoin(schema.profiles, eq(schema.tenants.id, schema.profiles.tenantId))
    .where(eq(schema.profiles.userId, userId));
}

export async function setCurrentProfileId(userId: string, profileId: string) {
  await db.transaction(async (tx) => {
    // Validate profile exists and is scoped to the userId
    const rs = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(and(eq(schema.profiles.userId, userId), eq(schema.profiles.id, profileId)));
    assert(rs.length === 1, "expect single record");
    const profile = rs[0];

    await db.update(schema.users).set({ currentProfileId: profile.id }).where(eq(schema.users.id, userId));
  });
}

export async function deleteInviteById(tenantId: string, id: string) {
  await db.delete(schema.invites).where(and(eq(schema.invites.tenantId, tenantId), eq(schema.invites.id, id)));
}

export async function deleteProfileById(tenantId: string, id: string) {
  await db.delete(schema.profiles).where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.id, id)));
}

export async function findUserByEmail(email: string) {
  const rs = await db.select().from(schema.users).where(eq(schema.users.email, email));
  assert(rs.length === 1 || rs.length === 0, "unexpected result");
  return rs.length ? rs[0] : null;
}

export async function sendResetPasswordVerification(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return false;

  assert(user.email, "expected not null email address");

  const token = jwt.sign({}, settings.AUTH_SECRET, {
    subject: user.email,
    expiresIn: "10m",
    audience: settings.BASE_URL,
  });

  const link = settings.BASE_URL + `/change-password?token=${token}`;

  await sendMail({
    to: email,
    subject: "Reset password verification",
    text: `Click the link below to reset your password:\n\n${link}`,
  });
  return true;
}

export async function changePassword(email: string, newPassword: string) {
  await db
    .update(schema.users)
    .set({ password: await hashPassword(newPassword) })
    .where(eq(schema.users.email, email));
}

export async function sendMail({
  to,
  subject,
  text,
  from = settings.SMTP_FROM,
}: {
  to: string;
  subject: string;
  text: string;
  from?: string;
}) {
  const options: SMTPConnection.Options = {
    host: settings.SMTP_HOST,
    port: settings.SMTP_PORT,
    secure: settings.SMTP_SECURE,
  };
  if (settings.SMTP_USER && settings.SMTP_PASSWORD) {
    options.auth = { type: "login", user: settings.SMTP_USER, pass: settings.SMTP_PASSWORD };
  }
  const transporter = nodemailer.createTransport(options);
  return transporter.sendMail({ to, from, subject, text });
}
