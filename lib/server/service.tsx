import assert from "assert";

import { render } from "@react-email/components";
import { User as SlackUser } from "@slack/web-api/dist/types/response/UsersInfoResponse";
import { asc, and, eq, ne, sql, inArray, like, or } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import { unstable_cache, revalidateTag } from "next/cache";
import nodemailer from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";

import { Member, MemberType } from "@/lib/api";
import { getDisabledModels } from "@/lib/llm/types";
import * as settings from "@/lib/server/settings";

import { buildTags, buildTenantTag, buildTenantUserTag } from "../../cache-handler";
import { InviteHtml, PagesLimitReachedHtml, ResetPasswordHtml, VerifyEmailHtml } from "../mail";

import { provisionBillingCustomer } from "./billing";
import db from "./db";
import * as schema from "./db/schema";
import { getRagieClientAndPartition } from "./ragie";

type Role = (typeof schema.rolesEnum.enumValues)[number];

async function getUniqueSlug(name: string) {
  // Remove any non-alphanumeric characters except hyphens and spaces
  let slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    // Replace spaces and repeated hyphens with single hyphen
    .replace(/[\s_-]+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");

  // Ensure slug is not empty
  if (!slug) {
    slug = "tenant";
  }

  // Check if slug exists and append number if needed
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tenants)
    .where(or(eq(schema.tenants.slug, slug), like(schema.tenants.slug, `${slug}-%`)));
  const numExistingSlugs = Number(result[0]?.count ?? 0);

  if (numExistingSlugs > 0) {
    let counter = 1;
    let newSlug = `${slug}-${numExistingSlugs + counter - 1}`;

    while (
      (await db.select({ slug: schema.tenants.slug }).from(schema.tenants).where(eq(schema.tenants.slug, newSlug)))
        .length > 0 &&
      counter < 10
    ) {
      counter++;
      newSlug = `${slug}-${numExistingSlugs + counter - 1}`;
    }

    slug = newSlug;
  }
  return slug;
}

export async function createTenant(userId: string, name: string) {
  const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

  try {
    const slug = await getUniqueSlug(name);

    const tenants = await db
      .insert(schema.tenants)
      .values({ name, slug, trialExpiresAt: new Date(Date.now() + ONE_WEEK_IN_MS) })
      .returning({ id: schema.tenants.id, slug: schema.tenants.slug });

    assert(tenants.length === 1);
    const tenantId = tenants[0].id;

    const profile = await createProfile(tenantId, userId, "admin");

    if (!isNaN(settings.DEFAULT_PARTITION_LIMIT)) {
      const { client, partition } = await getRagieClientAndPartition(tenantId);
      await client.partitions.create({
        name: partition,
        pagesProcessedLimitMax: settings.DEFAULT_PARTITION_LIMIT,
      });
    }

    if (settings.BILLING_ENABLED) {
      const user = await getUserById(userId);
      const userName = user.name ?? user.id;
      const userEmail = user.email ?? user.id;
      await provisionBillingCustomer(tenantId, userName, userEmail);
    }

    return { tenant: tenants[0], profile };
  } catch (error) {
    throw new ServiceError(`Failed to create tenant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createProfile(tenantId: string, userId: string, role: Role) {
  const profiles = await db.insert(schema.profiles).values({ tenantId, userId, role }).returning();
  assert(profiles.length === 1);
  return profiles[0];
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
      const { client } = await getRagieClientAndPartition(tenantId);
      await client.connections.delete({
        connectionId: connection.ragieConnectionId,
        deleteConnectionPayload: { keepFiles: false },
      });
    } catch (e: any) {
      if (e.rawResponse.status !== 404) throw e;
      console.warn("connection missing in Ragie");
    }
  });
}

export async function saveConnection(tenantId: string, ragieConnectionId: string, status: string, addedBy?: string) {
  const qs = await db
    .select()
    .from(schema.connections)
    .where(and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.ragieConnectionId, ragieConnectionId)))
    .for("update");
  const connection = qs.length === 1 ? qs[0] : null;

  const lastSyncedAt = status === "ready" ? new Date() : null;

  if (!connection) {
    const { client } = await getRagieClientAndPartition(tenantId);
    const ragieConnection = await client.connections.get({ connectionId: ragieConnectionId });
    await db.insert(schema.connections).values({
      tenantId: tenantId,
      ragieConnectionId,
      name: ragieConnection.name,
      status,
      sourceType: ragieConnection.type,
      lastSyncedAt,
      addedBy: addedBy || null,
    });
  } else {
    await db
      .update(schema.connections)
      .set({ status, lastSyncedAt })
      .where(
        and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.ragieConnectionId, ragieConnectionId)),
      );
  }
}

export async function getConnectionById(tenantId: string, connectionId: string) {
  const rs = await db
    .select()
    .from(schema.connections)
    .where(and(eq(schema.connections.tenantId, tenantId), eq(schema.connections.id, connectionId)));
  assert(rs.length === 1);
  return rs[0];
}

async function getMembersByTenantIdInternal(
  tenantId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ members: Member[]; totalUsersInternal: number; totalInvitesInternal: number }> {
  const offset = (page - 1) * pageSize;

  const [members, totalUsers, totalInvites] = await Promise.all([
    union(
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
        .where(and(eq(schema.profiles.tenantId, tenantId), ne(schema.profiles.role, "guest")))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          id: schema.invites.id,
          email: schema.invites.email,
          name: schema.invites.email,
          type: sql<MemberType>`'invite'`.as("type"),
          role: schema.invites.role,
        })
        .from(schema.invites)
        .where(eq(schema.invites.tenantId, tenantId))
        .limit(pageSize)
        .offset(offset),
    ).orderBy(sql`type desc`, sql`name`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.profiles)
      .where(and(eq(schema.profiles.tenantId, tenantId), ne(schema.profiles.role, "guest"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.invites)
      .where(eq(schema.invites.tenantId, tenantId)),
  ]);

  return { members, totalUsersInternal: totalUsers[0].count, totalInvitesInternal: totalInvites[0].count };
}

export async function getMembersByTenantId(
  tenantId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ members: Member[]; totalUsers: number; totalInvites: number }> {
  const { members, totalUsersInternal, totalInvitesInternal } = await getMembersByTenantIdInternal(
    tenantId,
    page,
    pageSize,
  );
  const totalUsers = Number(totalUsersInternal);
  const totalInvites = Number(totalInvitesInternal);
  return { members, totalUsers, totalInvites };
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
              set: { invitedBy, updatedAt: new Date() },
            })
            .returning();

          assert(rs.length === 1);

          return rs[0];
        }),
      ),
  );

  // Get tenant name and inviter name from database
  const [tenant, inviterData] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
      columns: { name: true },
    }),
    db
      .select({
        name: schema.users.name,
      })
      .from(schema.profiles)
      .innerJoin(schema.users, eq(schema.profiles.userId, schema.users.id))
      .where(eq(schema.profiles.id, invitedBy))
      .limit(1),
  ]);

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
      html: await render(
        <InviteHtml name={inviterData[0]?.name || null} link={inviteLink} tenantName={tenant?.name || null} />,
      ),
    });
  });

  await Promise.all(promises);

  return invites;
}

/**
 * Internal function that retrieves authentication context data from the database
 * This function gets cached
 */
async function getAuthContextByUserIdInternal(userId: string, slug: string) {
  const rs = await db
    .select()
    .from(schema.tenants)
    .innerJoin(schema.users, eq(schema.users.id, userId))
    .innerJoin(schema.profiles, eq(schema.tenants.id, schema.profiles.tenantId))
    .where(and(eq(schema.profiles.userId, userId), eq(schema.tenants.slug, slug)));

  assert(rs.length === 1, "expected single record");
  const row = rs[0];

  return {
    profile: row.profiles,
    tenant: {
      ...row.tenants,
      disabledModels: getDisabledModels(row.tenants.disabledModels),
    },
  };
}

/**
 * Retrieves serialized authentication context data from cache or database
 */
export function getSerializedCachedAuthContext(userId: string, slug: string) {
  return unstable_cache(
    async (userId: string, slug: string) => {
      return await getAuthContextByUserIdInternal(userId, slug);
    },
    ["basechat-auth-context"],
    {
      revalidate: 86400, // 24 hours in seconds
      tags: buildTags(userId, slug),
    },
  )(userId, slug);
}

/**
 * Invalidate the auth context cache for a specific user in a tenant
 */
// export function invalidateUserCache(userId: string, slug: string) {
//   const tag = buildTenantUserTag(userId, slug);
//   revalidateTag(tag);
// }

/**
 * Invalidate the auth context cache for all users in this tenant
 */
export function invalidateTenantCache(slug: string) {
  console.log("Invalidating tenant cache for slug:", slug);
  const tag = buildTenantTag(slug);
  revalidateTag(tag);
}

/**
 * Retrieves authentication context data with proper type transformations.
 * Gets cached data and transforms serialized date strings back to Date objects.
 */
export async function getCachedAuthContext(userId: string, slug: string): Promise<any> {
  const cachedResult = await getSerializedCachedAuthContext(userId, slug);

  // Transform the tenant object to ensure Date fields are proper Date objects
  const tenant = {
    ...cachedResult.tenant,
    // Convert date strings back to Date objects
    trialExpiresAt: new Date(cachedResult.tenant.trialExpiresAt),
    partitionLimitExceededAt: cachedResult.tenant.partitionLimitExceededAt
      ? new Date(cachedResult.tenant.partitionLimitExceededAt)
      : null,
    createdAt: new Date(cachedResult.tenant.createdAt),
    updatedAt: new Date(cachedResult.tenant.updatedAt),
    // Transform metadata plans dates if they exist
    metadata: cachedResult.tenant.metadata
      ? {
          ...cachedResult.tenant.metadata,
          plans: cachedResult.tenant.metadata.plans?.map((plan: any) => ({
            ...plan,
            endedAt: plan.endedAt ? new Date(plan.endedAt) : null,
            startedAt: new Date(plan.startedAt),
          })),
        }
      : cachedResult.tenant.metadata,
  };

  // Transform profile dates as well
  const profile = {
    ...cachedResult.profile,
    createdAt: new Date(cachedResult.profile.createdAt),
    updatedAt: new Date(cachedResult.profile.updatedAt),
  };

  return {
    profile,
    tenant,
  };
}

export async function findInviteById(id: string) {
  const rs = await db.select().from(schema.invites).where(eq(schema.invites.id, id));
  if (rs.length === 0) {
    return null;
  }
  return rs[0];
}

async function getInviteById(id: string) {
  const rs = await findInviteById(id);
  assert(rs, "expected invite");
  return rs;
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

export async function getTenantBySlackTeamId(teamId: string) {
  const rs = await db.select().from(schema.tenants).where(eq(schema.tenants.slackTeamId, teamId));
  assert(rs.length === 1, "expected single record");
  return rs[0];
}

export async function getTenantByTenantId(tenantId: string) {
  const rs = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
  if (rs.length === 0) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  return rs[0];
}

export async function getTenantsByUserId(userId: string) {
  const profileInfo = await db
    .select({
      tenantId: schema.profiles.tenantId,
      profileId: schema.profiles.id,
      profileRole: schema.profiles.role,
    })
    .from(schema.profiles)
    .where(and(eq(schema.profiles.userId, userId)));

  const tenantIds = profileInfo.map((obj) => obj.tenantId);

  const tenantIdToProfile = new Map<string, { profileId: string; profileRole: string }>();

  for (const { tenantId, profileId, profileRole } of profileInfo.values()) {
    tenantIdToProfile.set(tenantId, { profileId, profileRole });
  }

  const tenantInfo = await db
    .select({
      id: schema.tenants.id,
      userCount: sql<number>`COUNT(*)`.mapWith(Number).as("user_count"),
      name: schema.tenants.name,
      slug: schema.tenants.slug,
      logoUrl: schema.tenants.logoUrl,
    })
    .from(schema.tenants)
    .leftJoin(schema.profiles, and(eq(schema.tenants.id, schema.profiles.tenantId), ne(schema.profiles.role, "guest")))
    .where(inArray(schema.tenants.id, tenantIds))
    .groupBy(schema.tenants.id);

  const result = [];

  for (const item of tenantInfo.values()) {
    const profileInfo = tenantIdToProfile.get(item.id);
    if (profileInfo === undefined) {
      continue;
    }

    const lastAdmin = profileInfo.profileRole === "admin" && (await isLastAdmin(item.id, profileInfo.profileId));
    result.push({
      ...profileInfo,
      ...item,
      lastAdmin,
    });
  }
  return result;
}

export async function findTenantBySlug(slug: string) {
  const tenants = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug));
  assert(tenants.length === 0 || tenants.length === 1, "expect single record");
  return tenants.length ? tenants[0] : null;
}

export async function setCurrentProfileId(userId: string, profileId: string) {
  await db.transaction(async (tx) => {
    // Validate profile exists and is scoped to the userId
    const rs = await tx
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(and(eq(schema.profiles.userId, userId), eq(schema.profiles.id, profileId)));
    assert(rs.length === 1, "expect single record");
    const profile = rs[0];

    await tx.update(schema.users).set({ currentProfileId: profile.id }).where(eq(schema.users.id, userId));
  });
}

export async function setUserTenant(userId: string, tenantId: string) {
  const profiles = await db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.userId, userId)));

  assert(profiles.length === 1, "expect single record");
  const profile = profiles[0];

  await db.update(schema.users).set({ currentProfileId: profile.id }).where(eq(schema.users.id, userId));
}

export async function deleteInviteById(tenantId: string, id: string) {
  await db.delete(schema.invites).where(and(eq(schema.invites.tenantId, tenantId), eq(schema.invites.id, id)));
}

export async function deleteProfileById(tenantId: string, id: string) {
  await db.delete(schema.profiles).where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.id, id)));
}

export async function findProfileByTenantIdAndUserId(tenantId: string, userId: string) {
  const rs = await db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.tenantId, tenantId), eq(schema.profiles.userId, userId)));
  assert(rs.length === 1 || rs.length === 0, "unexpected result");
  return rs.length ? rs[0] : null;
}

export async function findUserByEmail(email: string) {
  const rs = await db.select().from(schema.users).where(eq(schema.users.email, email));
  assert(rs.length === 1 || rs.length === 0, "unexpected result");
  return rs.length ? rs[0] : null;
}

export async function findUserBySlackUserId(slackUserId: string) {
  const rs = await db.select().from(schema.users).where(eq(schema.users.slackUserId, slackUserId));
  assert(rs.length === 1 || rs.length === 0, "unexpected result");
  return rs.length ? rs[0] : null;
}

export async function findUserById(id: string) {
  const rs = await db.select().from(schema.users).where(eq(schema.users.id, id));
  assert(rs.length === 1 || rs.length === 0, "unexpected result");
  return rs.length ? rs[0] : null;
}

export async function getUserById(id: string) {
  const user = await findUserById(id);
  assert(user, "unexpected result");
  return user;
}

export async function sendResetPasswordEmail(user: { name: string; email: string }, url: string, _token: string) {
  // TODO: callbackURL is not being set from the reset flow. This looks like a bug in better-auth.
  const urlObj = new URL(url);
  urlObj.searchParams.set("callbackURL", `${settings.BASE_URL}/change-password`);

  const link = urlObj.toString();

  await sendMail({
    to: user.email,
    subject: "Reset password verification",
    text: `Click the link below to reset your password:\n\n${link}`,
    html: await render(<ResetPasswordHtml name={user.name} link={link} />),
  });
}

export async function sendVerificationEmail(user: { name: string; email: string }, url: string, _token: string) {
  const urlObj = new URL(url);
  urlObj.searchParams.set("callbackURL", `${settings.BASE_URL}`);

  const link = urlObj.toString();

  await sendMail({
    to: user.email,
    subject: "Email verification",
    text: `Click the link below to verify your email:\n\n${link}`,
    html: await render(<VerifyEmailHtml name={user.name} link={link} />),
  });
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
  const fromWithDisplayName = from ? `"${settings.APP_NAME}" <${from}>` : settings.SMTP_FROM;
  const transporter = nodemailer.createTransport(options);
  return transporter.sendMail({ to, from: fromWithDisplayName, subject, html, text });
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

export async function deleteProfile(
  principalProfile: { id: string; role: string },
  tenantId: string,
  targetProfileId: string,
) {
  const lastAdmin = await isLastAdmin(tenantId, targetProfileId);
  if (lastAdmin) {
    throw new ServiceError("Cannot delete the last admin");
  }
  const isDeleteAllowed = isProfileDeleteAllowed(principalProfile, targetProfileId);
  if (!isDeleteAllowed) {
    throw new ServiceError("Cannot delete profile");
  }
  return await deleteProfileById(tenantId, targetProfileId);
}

async function isLastAdmin(tenantId: string, profileId: string) {
  const admins = await getAdminProfiles(tenantId);
  assert(admins.length > 0, "there must be at least one admin per tenant");
  return admins.length === 1 && admins[0].id === profileId;
}

export function isProfileDeleteAllowed(currentProfile: { id: string; role: string }, targetProfileId: string): boolean {
  if (currentProfile.role === "admin") {
    return true;
  }
  if (currentProfile.role === "user" && currentProfile.id === targetProfileId) {
    return true;
  }
  return false;
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

async function updateConversationTimestamp(tenantId: string, conversationId: string) {
  return await db
    .update(schema.conversations)
    .set({ updatedAt: sql`now()` })
    .where(and(eq(schema.conversations.tenantId, tenantId), eq(schema.conversations.id, conversationId)));
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
      model: message.model,
      isBreadth: message.isBreadth ?? false,
      rerankEnabled: message.rerankEnabled ?? false,
      prioritizeRecent: message.prioritizeRecent ?? false,
    })
    .returning();
  assert(rs.length === 1);

  // Update the conversation's timestamp
  await updateConversationTimestamp(message.tenantId, message.conversationId);

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

export async function linkUsers(fromUserId: string, toUserId: string) {
  return await db.transaction(async (tx) => {
    // Get all profiles for the anonymous user
    const anonymousProfiles = await tx.select().from(schema.profiles).where(eq(schema.profiles.userId, fromUserId));

    // Get all profiles for the real user
    const realUserProfiles = await tx.select().from(schema.profiles).where(eq(schema.profiles.userId, toUserId));

    // Map tenantId -> real user profile
    const realUserProfileMap = new Map(realUserProfiles.map((profile) => [profile.tenantId, profile]));

    let realUserProfile = undefined;

    for (const anonymousProfile of anonymousProfiles) {
      realUserProfile = realUserProfileMap.get(anonymousProfile.tenantId);

      // Create a guest profile in this tenant for the authenticated user if doesn't exist
      if (!realUserProfile) {
        realUserProfile = await createProfile(anonymousProfile.tenantId, toUserId, "guest");
      }

      // Transfer all conversations from anonymous profile to authenticated profile
      await tx
        .update(schema.conversations)
        .set({ profileId: realUserProfile.id })
        .where(eq(schema.conversations.profileId, anonymousProfile.id));

      // Delete the anonymous profile
      await tx.delete(schema.profiles).where(eq(schema.profiles.id, anonymousProfile.id));
    }

    if (realUserProfile) {
      await setCurrentProfileId(toUserId, realUserProfile.id);
      const tenant = await getTenantByTenantId(realUserProfile.tenantId);
      if (tenant) {
        //invalidateUserCache(toUserId, tenant.slug);
        invalidateTenantCache(tenant.slug);
      }
    }
  });
}

export async function updateTenantPaidStatus(tenantId: string, paidStatus: "trial" | "active" | "expired") {
  await db.update(schema.tenants).set({ paidStatus }).where(eq(schema.tenants.id, tenantId));
}

export async function createSlackUser(slackUserId: string, slackUser: SlackUser) {
  const rs = await db.insert(schema.users).values({ slackUserId, slackUser: slackUser }).returning();
  assert(rs.length === 1, "expect single record");
  return rs[0];
}

export async function sendPageLimitNotificationEmail(email: string, tenantName: string, upgradeLink: string) {
  await sendMail({
    to: email,
    subject: "Page Limit Reached",
    text: "You've reached your page processing limit",
    html: await render(<PagesLimitReachedHtml tenantName={tenantName} link={upgradeLink} />),
  });
}
