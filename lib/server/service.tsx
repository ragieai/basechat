import assert from "assert";

import { render } from "@react-email/components";
import { asc, and, eq, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";

import { Member, MemberType } from "@/lib/api";
import * as settings from "@/lib/server/settings";

import { InviteHtml, ResetPasswordHtml } from "../mail";

import db from "./db";
import * as schema from "./db/schema";
import { getRagieClient } from "./ragie";
import { hashPassword } from "./utils";

type Role = (typeof schema.rolesEnum.enumValues)[number];

export async function createTenant(userId: string, name: string) {
  const tenants = await db.insert(schema.tenants).values({ name }).returning({ id: schema.tenants.id });
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

export async function createInvites(tenantId: string, invitedBy: string, emails: string[], role: Role) {
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

  const promises = invites.map(async (invite) => {
    const inviteLink = settings.BASE_URL + "/invites/accept?invite=" + invite.id;

    return sendMail({
      to: invite.email,
      from: settings.SMTP_FROM,
      subject: `You have been invited to ${settings.APP_NAME}`,
      text: `Click the link below to accept the invite:\n\n${inviteLink}`,
      html: await render(<InviteHtml name={null} link={inviteLink} />),
    });
  });

  await Promise.all(promises);

  return invites;
}

export async function getAuthContextByUserId(userId: string, slug: string) {
  const rs = await db
    .select()
    .from(schema.tenants)
    .innerJoin(schema.profiles, and(eq(schema.profiles.userId, userId), eq(schema.tenants.slug, slug)))
    .innerJoin(schema.users, eq(schema.users.id, userId))
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
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      logoUrl: schema.tenants.logoUrl,
      profileId: schema.profiles.id,
    })
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
    html: await render(<ResetPasswordHtml name={user.name} link={link} />),
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
  html,
  text,
  from = settings.SMTP_FROM,
}: {
  to: string;
  subject: string;
  html?: string;
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
  return transporter.sendMail({ to, from, subject, html, text });
}

export function getAdminProfiles(tenantId: string) {
  return db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.role, "admin")));
}

export class ServiceError extends Error {}

export async function changeRole(tenantId: string, profileId: string, newRole: Role) {
  if (newRole === "user") {
    const lastAdmin = await isLastAdmin(tenantId, profileId);
    if (lastAdmin) {
      throw new ServiceError("Cannot change role of the last admin");
    }
  }
  return await updateProfileRoleById(tenantId, profileId, newRole);
}

export async function deleteProfile(tenantId: string, profileId: string) {
  const lastAdmin = await isLastAdmin(tenantId, profileId);
  if (lastAdmin) {
    throw new ServiceError("Cannot delete the last admin");
  }
  return await deleteProfileById(tenantId, profileId);
}

async function isLastAdmin(tenantId: string, profileId: string) {
  const admins = await getAdminProfiles(tenantId);
  assert(admins.length > 0, "there must be at least one admin per tenant");
  return admins.length === 1 && admins[0].id === profileId;
}

export async function updateProfileRoleById(tenantId: string, profileId: string, newRole: Role) {
  await db
    .update(schema.profiles)
    .set({ role: newRole })
    .where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.id, profileId)));
  return;
}

export async function updateInviteRoleById(tenantId: string, inviteId: string, newRole: Role) {
  await db
    .update(schema.invites)
    .set({ role: newRole })
    .where(and(eq(schema.invites.tenantId, tenantId), eq(schema.invites.id, inviteId)));
  return;
}

export async function createConversationMessage(message: typeof schema.messages.$inferInsert) {
  const rs = await db
    .insert(schema.messages)
    .values({
      tenantId: message.tenantId,
      role: message.role,
      conversationId: message.conversationId,
      content: message.content,
      sources: message.sources,
    })
    .returning();
  assert(rs.length === 1);
  return rs[0];
}

export async function updateConversationMessageContent(
  tenantId: string,
  profileId: string,
  conversationId: string,
  messageId: string,
  content: string,
) {
  return await db
    .update(schema.messages)
    .set({ content })
    .where(
      and(
        eq(schema.messages.tenantId, tenantId),
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.id, messageId),
      ),
    );
}

export async function getConversation(tenantId: string, profileId: string, conversationId: string) {
  const rs = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.tenantId, tenantId),
        eq(schema.conversations.profileId, profileId),
        eq(schema.conversations.id, conversationId),
      ),
    );
  assert(rs.length === 1);
  return rs[0];
}

export async function getConversationMessage(
  tenantId: string,
  profileId: string,
  conversationId: string,
  messageId: string,
) {
  const rs = await db
    .select()
    .from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
    .where(
      and(
        eq(schema.messages.tenantId, tenantId),
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.id, messageId),
        eq(schema.conversations.profileId, profileId),
      ),
    );
  assert(rs.length === 1);
  return rs[0].messages;
}

export async function getConversationMessages(tenantId: string, profileId: string, conversationId: string) {
  const rs = await db
    .select()
    .from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
    .where(
      and(
        eq(schema.messages.tenantId, tenantId),
        eq(schema.messages.conversationId, conversationId),
        eq(schema.conversations.profileId, profileId),
      ),
    )
    .orderBy(asc(schema.messages.createdAt));
  return rs.map((r) => r.messages);
}

export async function setTenantLogo(tenantId: string, logoFileName: string, logoObjectName: string, logoUrl: string) {
  await db.update(schema.tenants).set({ logoUrl, logoObjectName, logoFileName }).where(eq(schema.tenants.id, tenantId));
}

export async function deleteTenantLogo(tenantId: string) {
  await db
    .update(schema.tenants)
    .set({ logoUrl: null, logoObjectName: null, logoFileName: null })
    .where(eq(schema.tenants.id, tenantId));
}
