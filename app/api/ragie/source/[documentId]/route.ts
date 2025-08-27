import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { documentId: string } }) {
  const { documentId } = params;
  if (!documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 });

  const apiKey = process.env.RAGIE_API_KEY || process.env.RAGIE_TOKEN || process.env.RAGIE_API_TOKEN;
  if (!apiKey) return NextResponse.json({ error: "Missing RAGIE_API_KEY" }, { status: 500 });

  const upstream = await fetch(`https://api.ragie.ai/documents/${documentId}/source`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Upstream error", { status: upstream.status });
  }

  const headers = new Headers(upstream.headers);
  // Ensure correct headers for file stream
  headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  return new NextResponse(upstream.body, { status: 200, headers });
}
