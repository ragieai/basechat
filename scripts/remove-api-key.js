import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text } from "drizzle-orm/pg-core";
import "dotenv/config";

// run with: npm run remove-api-key tenantId
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");
if (process.argv.length < 3) {
  console.log("tenantId is required");
  process.exit(1);
}

const db = drizzle(databaseUrl);
const tenantId = process.argv[2];

const tenantsSchema = pgTable("tenants", {
  id: text("id").primaryKey(),
  ragieApiKey: text("ragie_api_key"),
  ragiePartition: text("ragie_partition"),
});

console.log(`Removing API key and partition for tenant ${tenantId}`);

async function removeApiKey(tenantId) {
  try {
    // Update the tenant record to set both fields to null
    await db
      .update(tenantsSchema)
      .set({
        ragieApiKey: null,
        ragiePartition: null,
      })
      .where(eq(tenantsSchema.id, tenantId));

    console.log(`Successfully removed Ragie API key and partition for tenant ${tenantId}`);
  } catch (error) {
    console.error("Failed to remove Ragie API key:", error);
    process.exit(1);
  }
}

removeApiKey(tenantId);
process.exit(0);
