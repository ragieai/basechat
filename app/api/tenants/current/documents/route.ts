import { NextRequest, NextResponse } from "next/server";

import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

export async function GET(request: NextRequest) {
  const { tenant } = await requireAdminContextFromRequest(request);
  const { client, partition } = await getRagieClientAndPartition(tenant.id);

  // Get cursor from query params
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get("cursor") || undefined;

  try {
    const res = await client.documents.list({
      partition,
      pageSize: 50,
      cursor,
    });

    return NextResponse.json({
      documents: res.result.documents,
      nextCursor: res.result.pagination.nextCursor,
      totalCount: res.result.pagination.totalCount,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
