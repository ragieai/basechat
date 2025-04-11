import crypto from "crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text } from "drizzle-orm/pg-core";
import "dotenv/config";

// run with: npm run update-api-key myApiKey123 myPartition
// API key will be encrypted
// Partition is optional
// If partition is not provided, it will be set to null
const ENCRYPTION_IV_LENGTH = 16; // 16 bytes for AES
const databaseUrl = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits)

if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");
if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY environment variable is required");
if (process.argv.length < 3) {
  console.log("tenantId is required");
  process.exit(1);
}

const db = drizzle(databaseUrl);
const tenantId = process.argv[2];
const apiKey = process.argv[3];
const partition = process.argv[4];

const tenantsSchema = pgTable("tenants", {
  id: text("id").primaryKey(),
  ragieApiKey: text("ragie_api_key"),
  ragiePartition: text("ragie_partition"),
});

console.log(`Updating tenant ${tenantId} with API key ${apiKey} and partition ${partition}`);

async function updateRagieApiKey(tenantId, apiKey, partition) {
  try {
    // Encrypt the API key
    const encryptedApiKey = encryptApiKey(apiKey);

    // Update the tenant record
    await db
      .update(tenantsSchema)
      .set({
        ragieApiKey: encryptedApiKey,
        ragiePartition: partition || null,
      })
      .where(eq(tenantsSchema.id, tenantId));

    console.log(`Successfully updated Ragie API key for tenant ${tenantId}`);
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

updateRagieApiKey(tenantId, apiKey, partition);
process.exit(0);
