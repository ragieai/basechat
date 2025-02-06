import { NextRequest } from "next/server";

import { getRagieClient } from "@/lib/server/ragie";
import { requireAuthContext } from "@/lib/server/utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant } = await requireAuthContext();
  const { id } = await params;

  const client = await getRagieClient();
  const document = await client.documents.get({ partition: tenant.id, documentId: id });
  const summary = await client.documents.getSummary({ partition: tenant.id, documentId: id });

  return Response.json({ ...document, summary: summary.summary });
}
