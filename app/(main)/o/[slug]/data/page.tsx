import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { DEFAULT_PARTITION_LIMIT } from "@/lib/server/settings";
import { adminOrRedirect } from "@/lib/server/utils";

import DataPageClient from "./data-page-client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export default async function DataIndexPage({ params, searchParams }: Props) {
  const p = await params;
  const sp = await searchParams;
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
  let totalDocuments: number = 0;
  try {
    const { client, partition } = await getRagieClientAndPartition(tenant.id);
    const res = await client.documents.list({
      partition,
      pageSize: 50,
      cursor: sp.cursor || undefined,
    });
    files = res.result.documents;
    nextCursor = res.result.pagination.nextCursor || null;
    totalDocuments = res.result.pagination.totalCount;
  } catch (error) {
    console.error("Error fetching documents:", error);
    // If there's an error and we have a cursor, redirect to the base data page
    if (sp.cursor) {
      redirect(`/o/${p.slug}/data`);
    }
  }

  return (
    <DataPageClient
      tenant={tenant}
      session={session}
      initialFiles={files}
      nextCursor={nextCursor}
      totalDocuments={totalDocuments}
      connections={connections}
      connectionMap={connectionMap}
      defaultPartitionLimit={DEFAULT_PARTITION_LIMIT}
    />
  );
}
