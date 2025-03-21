import { createHmac } from "crypto";

import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { secretKey, payloadBody, receivedSignature } = await request.json();

  const hmac = createHmac("sha256", secretKey);
  hmac.update(Buffer.from(payloadBody));
  const expectedSignature = hmac.digest("hex");

  // Use a constant-time comparison to prevent timing attacks
  const isValid = Buffer.from(expectedSignature, "utf-8").equals(Buffer.from(receivedSignature, "utf-8"));

  return Response.json({ isValid });
}
