import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/lib/server/db/schema";
import {
  initTestDb,
  closeTestDb,
  getTestDb,
  createTestTenant,
  createTestUser,
  createTestProfile,
  cleanupTestTenant,
} from "@/lib/test";

import { changeRole, deleteProfile } from "./service";

let db: NodePgDatabase<typeof schema>;

beforeAll(async () => {
  const { db: testDb } = await initTestDb();
  db = testDb;
});

afterAll(async () => {
  await closeTestDb();
});

let tenant: typeof schema.tenants.$inferSelect;

beforeEach(async () => {
  tenant = await createTestTenant();
});

afterEach(async () => {
  await cleanupTestTenant(tenant.id);
});

describe("changeRole", () => {
  describe("when the last admin changes their role to user", () => {
    it("throws an error", async () => {
      const user = await createTestUser();
      const admin = await createTestProfile(tenant, user, { role: "admin" });

      await expect(changeRole(tenant.id, admin.id, "user")).rejects.toThrow("Cannot change role of the last admin");
    });
  });
});

describe("when the 2nd to last admin changes their role to user", () => {
  it("allows the change", async () => {
    const user1 = await createTestUser();
    const admin1 = await createTestProfile(tenant, user1, { role: "admin" });

    const user2 = await createTestUser();
    const admin2 = await createTestProfile(tenant, user2, { role: "admin" });

    await changeRole(tenant.id, admin1.id, "user");

    const reloaded = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, admin1.id)))[0];
    expect(reloaded.role).toBe("user");
  });
});

describe("deleteProfile", () => {
  describe("when the last admin is deleted", () => {
    it("throws an error", async () => {
      const user = await createTestUser();
      const admin = await createTestProfile(tenant, user, { role: "admin" });

      await expect(deleteProfile({ id: admin.id, role: "admin" }, tenant.id, admin.id)).rejects.toThrow(
        "Cannot delete the last admin",
      );
    });
  });

  describe("when the 2nd to last admin is deleted", () => {
    it("deletes the admin", async () => {
      const user1 = await createTestUser();
      const admin1 = await createTestProfile(tenant, user1, { role: "admin" });

      const user2 = await createTestUser();
      const admin2 = await createTestProfile(tenant, user2, { role: "admin" });

      await deleteProfile({ id: admin1.id, role: "admin" }, tenant.id, admin1.id);

      const rs = await db.select().from(schema.profiles).where(eq(schema.profiles.id, admin1.id));
      expect(rs.length).toBe(0);
    });
  });
});
