import crypto from "crypto";

import { WebClient, Block, KnownBlock } from "@slack/web-api";

/**
 * Verify that the request came from Slack using signature verification
 */
export function verifySlackSignature(
  signingSecret: string,
  body: string,
  timestamp: string,
  signature: string,
): boolean {
  if (!signingSecret) {
    console.error("Slack signing secret not configured");
    return false;
  }

  // Check if timestamp is not older than 5 minutes
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - parseInt(timestamp)) > 300) {
    console.error("Request timestamp too old");
    return false;
  }

  // Create signature
  const hmac = crypto.createHmac("sha256", signingSecret);
  const [version, hash] = signature.split("=");
  hmac.update(`${version}:${timestamp}:${body}`);
  const expectedHash = hmac.digest("hex");

  // Compare signatures
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}
