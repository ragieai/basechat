import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { Ragie } from "ragie";

// run with: npm run update-all-partition-limits <newLimit> [excludeTenantId1] [excludeTenantId2] ...
// <newLimit> is the new pages processed limit (e.g. 20000)

const databaseUrl = process.env.DATABASE_URL;
const RAGIE_API_BASE_URL = process.env.RAGIE_API_BASE_URL;
const RAGIE_API_KEY = process.env.RAGIE_API_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY environment variable is required");
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");
if (!RAGIE_API_BASE_URL) throw new Error("RAGIE_API_BASE_URL environment variable is required");
if (!RAGIE_API_KEY) throw new Error("RAGIE_API_KEY environment variable is required");

function showUsage() {
  console.log("Usage: npm run update-all-partition-limits <newLimit> [excludeTenantId1] [excludeTenantId2] ...");
  console.log("  newLimit - The new pages processed limit (e.g. 20000)");
  console.log("  excludeTenantId - Optional: One or more tenant IDs to exclude from the update");
  process.exit(1);
}

if (process.argv.length < 3) {
  console.log("Error: Not enough arguments provided");
  showUsage();
}

const db = drizzle(databaseUrl);
const newLimit = parseInt(process.argv[2], 10);
const excludedTenantIds = process.argv.slice(3);

if (isNaN(newLimit)) {
  console.log("Error: newLimit must be a number");
  showUsage();
}

const tenantsSchema = pgTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  ragieApiKey: text("ragie_api_key"),
  ragiePartition: text("ragie_partition"),
  partitionLimitExceededAt: timestamp("partition_limit_exceeded_at", { withTimezone: true, mode: "date" }),
});

console.log(`Updating partition limits for all tenants to ${newLimit}`);

async function updateAllPartitionLimits(newLimit, excludedTenantIds) {
  let successfulUpdates = 0;
  try {
    // Get all tenants
    const allTenants = await db
      .select({
        id: tenantsSchema.id,
        slug: tenantsSchema.slug,
        ragieApiKey: tenantsSchema.ragieApiKey,
        ragiePartition: tenantsSchema.ragiePartition,
      })
      .from(tenantsSchema);

    console.log(`Found ${allTenants.length} tenants to update`);
    if (excludedTenantIds.length > 0) {
      console.log(`Excluding ${excludedTenantIds.length} tenants: ${excludedTenantIds.join(", ")}`);
    }

    // Process each tenant
    for (const tenant of allTenants) {
      try {
        // Skip excluded tenants
        if (excludedTenantIds.includes(tenant.id)) {
          console.log(`Skipping excluded tenant: ${tenant.slug}`);
          continue;
        }

        console.log(`Processing tenant: ${tenant.slug}`);

        // tenant custom api key
        if (tenant.ragieApiKey) {
          console.log(`Tenant ${tenant.slug} has custom api key, skipping`);
          continue;
        } else {
          const client = new Ragie({
            auth: RAGIE_API_KEY,
            serverURL: RAGIE_API_BASE_URL,
          });

          try {
            await client.partitions.setLimits({
              partitionId: tenant.id,
              partitionLimitParams: {
                pagesProcessedLimitMax: newLimit,
              },
            });
          } catch (error) {
            // Only handle 404 partition not found errors
            if (error.statusCode === 404 && error.body?.includes("Partition not found")) {
              // Partition not found, must create it
              console.log("Creating partition for tenant: ", tenant.slug);
              await client.partitions.create({
                name: tenant.id,
                pagesProcessedLimitMax: newLimit,
              });
            } else {
              // Re-throw other errors
              throw error;
            }
          }
          successfulUpdates++;
          console.log(`Successfully updated partition limit for tenant ${tenant.slug}`);
        }
      } catch (error) {
        console.error(`Failed to update tenant ${tenant.slug}:`, error);
        // Continue with next tenant
        continue;
      }
    }

    console.log("Finished processing all tenants");
    console.log(`Successfull updates: ${successfulUpdates} / ${allTenants.length}`);
  } catch (error) {
    console.error("Failed to update partition limits:", error);
    process.exit(1);
  }
}

updateAllPartitionLimits(newLimit, excludedTenantIds)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update partition limits:", error);
    process.exit(1);
  });
