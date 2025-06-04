import { jest } from "@jest/globals";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/lib/server/db/schema";
import {
  createTestUser,
  createTestTenant,
  initTestDb,
  closeTestDb,
  cleanupTestTenant,
  randomTestString,
  cleanupTestUser,
} from "@/lib/test";

import { slackSignIn, SlackSignInOptions } from "./utils";

let db: NodePgDatabase<typeof schema>;

beforeAll(async () => {
  const testDbSetup = await initTestDb();
  db = testDbSetup.db;
});

afterAll(async () => {
  await closeTestDb();
});

describe("slackSignIn", () => {
  let options: SlackSignInOptions;

  beforeEach(() => {
    options = {
      slackClientFactory: jest.fn(() => {
        return {
          users: {
            info: jest.fn<() => Promise<any>>().mockResolvedValue({
              user: {
                id: "mock-user-id",
                name: "mock-user",
                real_name: "Mock User",
              },
            }),
          },
        } as any;
      }),
    };
  });

  describe("when the team does NOT exist", () => {
    const slackTeamId = "does-not-exist";

    beforeEach(async () => {
      const tenant = await db.query.tenants.findFirst({
        where: eq(schema.tenants.slackTeamId, slackTeamId),
      });
      expect(tenant).toBeUndefined();
    });

    it("should throw an error", async () => {
      await expect(slackSignIn(slackTeamId, "slack-user-123")).rejects.toThrow("expected single record");
    });
  });

  describe("when the team exists", () => {
    const slackTeamId = randomTestString();
    let tenant: typeof schema.tenants.$inferSelect;

    beforeEach(async () => {
      tenant = await createTestTenant({ slackTeamId });
    });

    afterEach(async () => {
      await cleanupTestTenant(tenant.id);
    });

    describe("when the user does NOT exist", () => {
      const slackUserId = randomTestString();

      beforeEach(async () => {
        await expect(
          db.query.users.findFirst({ where: eq(schema.users.slackUserId, slackUserId) }),
        ).resolves.toBeUndefined();
      });

      it("should create a new user", async () => {
        const result = await slackSignIn(slackTeamId, slackUserId, options);

        await expect(db.query.users.findFirst({ where: eq(schema.users.slackUserId, slackUserId) })).resolves.toEqual(
          expect.objectContaining({
            slackUserId,
          }),
        );

        expect(result).toEqual({
          tenant,
          profile: expect.objectContaining({
            userId: expect.any(String),
            tenantId: tenant.id,
            role: "guest",
          }),
        });
      });
    });

    describe("when the user exists", () => {
      let slackUserId = randomTestString();
      let user: typeof schema.users.$inferSelect;

      beforeEach(async () => {
        user = await createTestUser({ slackUserId: slackUserId });
      });

      afterEach(async () => {
        await cleanupTestUser(user.id);
      });

      it("should return the user", async () => {
        const result = await slackSignIn(slackTeamId, slackUserId, options);

        expect(result).toEqual({
          tenant,
          profile: expect.objectContaining({
            userId: user.id,
            tenantId: tenant.id,
            role: "guest",
          }),
        });
      });
    });
  });
});
