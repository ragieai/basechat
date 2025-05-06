import { eq } from "drizzle-orm";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { adminOrRedirect } from "@/lib/server/utils";

import DataPageContent from "./data-page-content";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DataIndexPage({ params }: Props) {
  const p = await params;
  const { tenant, session } = await adminOrRedirect(p.slug);
  const connections = await db.select().from(schema.connections).where(eq(schema.connections.tenantId, tenant.id));

  // Create a map of source types to connections for quick lookup
  const connectionMap = connections.reduce(
    (acc, connection) => {
      acc[connection.sourceType] = connection;
      return acc;
    },
    {} as Record<string, (typeof connections)[0]>,
  );

  let files: any[] = [];
  let nextCursor: string | null = null;
  try {
    const { client, partition } = await getRagieClientAndPartition(tenant.id);
    const res = await client.documents.list({
      partition: partition || "",
      pageSize: 12,
    });
    files = res.result.documents;
    nextCursor = res.result.pagination.nextCursor || null;
  } catch (error) {
    console.error("Error fetching documents:", error);
  }

  return (
    <DataPageContent
      tenant={tenant}
      session={session}
      files={files}
      nextCursor={nextCursor}
      connections={connections}
      connectionMap={connectionMap}
    />
  );
}
