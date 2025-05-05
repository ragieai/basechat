import { NextRequest } from "next/server";

import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { requireAdminContextFromRequest } from "@/lib/server/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireAdminContextFromRequest(request);
    const { client, partition } = await getRagieClientAndPartition(tenant.id);

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = JSON.parse(formData.get("metadata") as string);
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const res = await client.documents.create({
      file: file,
      partition: partition || "",
      mode: "hi_res",
      metadata,
    });
    return Response.json(res);
  } catch (error) {
    console.error("Error uploading file:", error);
    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
