import { eq } from "drizzle-orm";
import { Ragie } from "ragie";

import db from "./db";
import { tenants } from "./db/schema";
import { decryptApiKey } from "./encryption";
import * as settings from "./settings";

export function getRagieClient() {
  return new Ragie({ auth: settings.RAGIE_API_KEY, serverURL: settings.RAGIE_API_BASE_URL });
}

export async function getTenantRagieClient(apiKey: string) {
  try {
    const decryptedApiKey = decryptApiKey(apiKey);
    return new Ragie({
      auth: decryptedApiKey,
      serverURL: settings.RAGIE_API_BASE_URL,
    });
  } catch (error) {
    console.error(`Failed to decrypt API key`, error);
  }
  return null;
}

export async function getTenantRagieSettings(tenantId: string) {
  const [tenant] = await db
    .select({
      ragieApiKey: tenants.ragieApiKey,
      ragiePartition: tenants.ragiePartition,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  return tenant;
}
