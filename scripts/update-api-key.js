import crypto from "crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// run with: npm run update-api-key <slug> <apiKey> [partition]
// <slug> is the tenant identifier
// <apiKey> will be encrypted
// [partition] is optional, if not provided, it will be set to null
const ENCRYPTION_IV_LENGTH = 16; // 16 bytes for AES
const databaseUrl = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits)

if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");
if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY environment variable is required");

function showUsage() {
  console.log("Usage: npm run update-api-key <slug> <apiKey> [partition]");
  console.log("  slug      - The tenant slug to update");
  console.log("  apiKey    - The API key to set (will be encrypted)");
  console.log("  partition - (Optional) The partition to set");
  process.exit(1);
}

if (process.argv.length < 4) {
  console.log("Error: Not enough arguments provided");
  showUsage();
}

const db = drizzle(databaseUrl);

const slug = process.argv[2];
const apiKey = process.argv[3];
const partition = process.argv[4];

const tenantsSchema = pgTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  ragieApiKey: text("ragie_api_key"),
  ragiePartition: text("ragie_partition"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

console.log(`Updating tenant ${slug} with API key ${apiKey} and partition ${partition}`);

async function updateRagieApiKey(slug, apiKey, partition) {
  try {
    // Encrypt the API key
    const encryptedApiKey = encryptApiKey(apiKey);

    // Update the tenant record and get the result
    const result = await db
      .update(tenantsSchema)
      .set({
        ragieApiKey: encryptedApiKey,
        ragiePartition: partition || null,
      })
      .where(eq(tenantsSchema.slug, slug));

    // Check if any rows were affected
    if (result.rowCount === 0) {
      throw new Error(`No tenant found with slug: ${slug}`);
    }

    console.log(`Successfully updated Ragie API key for tenant ${slug}`);
  } catch (error) {
    console.error("Failed to update Ragie API key:", error);
    process.exit(1);
  }
}

export function encryptApiKey(apiKey) {
  if (!apiKey) {
    console.error("API key cannot be empty");
    process.exit(1);
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);

    // Encrypt the API key
    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const authTag = cipher.getAuthTag().toString("hex");

    // Return iv:authTag:encryptedData format
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Failed to update Ragie API key:", error);
    process.exit(1);
  }
}

updateRagieApiKey(slug, apiKey, partition)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update Ragie API key:", error);
    process.exit(1);
  });
