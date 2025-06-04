import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "@/lib/server/db/schema";

/**
 * Test database helpers and utilities
 *
 * Usage:
 * ```typescript
 * import { createTestUser, createTestTenant } from "@/lib/test/helpers";
 *
 * const user = await createTestUser({ email: "test@example.com" });
 * const tenant = await createTestTenant({ name: "Test Tenant" });
 * ```
 */

// Database connection for tests
let testDb: NodePgDatabase<typeof schema>;
let testClient: pg.Client;

/**
 * Initialize test database connection
 * Call this in your test setup (beforeAll)
 */
export async function initTestDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for tests");
  }

  testClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await testClient.connect();
  testDb = drizzle(testClient, { schema });

  return { db: testDb, client: testClient };
}

/**
 * Close test database connection
 * Call this in your test teardown (afterAll)
 */
export async function closeTestDb() {
  if (testClient) {
    await testClient.end();
  }
}

/**
 * Get the test database instance
 * Make sure to call initTestDb() first
 */
export function getTestDb() {
  if (!testDb) {
    throw new Error("Test database not initialized. Call initTestDb() first.");
  }
  return testDb;
}

// Test data creation helpers

/**
 * Create a test user with optional partial data
 */
export async function createTestUser(partial: Partial<typeof schema.users.$inferInsert> = {}) {
  const db = getTestDb();
  const id = randomUUID();

  return (
    await db
      .insert(schema.users)
      .values({
        name: `Test User ${id.slice(0, 8)}`,
        email: `test-${id.slice(0, 8)}@example.com`,
        isAnonymous: false,
        emailVerified: true,
        ...partial,
      })
      .returning()
  )[0];
}

/**
 * Create a test tenant with optional partial data
 */
export async function createTestTenant(partial: Partial<typeof schema.tenants.$inferInsert> = {}) {
  const db = getTestDb();
  const id = randomUUID();

  return (
    await db
      .insert(schema.tenants)
      .values({
        name: `Test Tenant ${id.slice(0, 8)}`,
        slug: `test-tenant-${id.slice(0, 8)}`,
        trialExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
        ...partial,
      })
      .returning()
  )[0];
}

/**
 * Create a test profile linking a user to a tenant
 */
export async function createTestProfile(
  tenant: typeof schema.tenants.$inferSelect,
  user: typeof schema.users.$inferSelect,
  partial: Partial<typeof schema.profiles.$inferInsert> = {},
) {
  const db = getTestDb();

  return (
    await db
      .insert(schema.profiles)
      .values({
        tenantId: tenant.id,
        userId: user.id,
        role: "user",
        ...partial,
      })
      .returning()
  )[0];
}

/**
 * Create a test conversation
 */
export async function createTestConversation(
  tenant: typeof schema.tenants.$inferSelect,
  profile: typeof schema.profiles.$inferSelect,
  partial: Partial<typeof schema.conversations.$inferInsert> = {},
) {
  const db = getTestDb();
  const id = randomUUID();

  return (
    await db
      .insert(schema.conversations)
      .values({
        tenantId: tenant.id,
        profileId: profile.id,
        title: `Test Conversation ${id.slice(0, 8)}`,
        ...partial,
      })
      .returning()
  )[0];
}

/**
 * Create a complete test setup with user, tenant, and profile
 * Returns all created entities
 */
export async function createTestSetup(
  options: {
    user?: Partial<typeof schema.users.$inferInsert>;
    tenant?: Partial<typeof schema.tenants.$inferInsert>;
    profile?: Partial<typeof schema.profiles.$inferInsert>;
  } = {},
) {
  const user = await createTestUser(options.user);
  const tenant = await createTestTenant(options.tenant);
  const profile = await createTestProfile(tenant, user, options.profile);

  return { user, tenant, profile };
}

/**
 * Clean up test data by deleting all records for a tenant
 * Useful for test cleanup
 */
export async function cleanupTestTenant(tenantId: string) {
  await getTestDb().delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
}

/**
 * Clean up test data by deleting all records for a user
 * Useful for test cleanup
 */
export async function cleanupTestUser(userId: string) {
  await getTestDb().delete(schema.users).where(eq(schema.users.id, userId));
}

/**
 * Generate a random test string
 */
export function randomTestString(prefix = "test", length = 8) {
  return `${prefix}-${randomUUID().slice(0, length)}`;
}
