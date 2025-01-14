import assert from "assert";

import { auth } from "@/auth";

import { getProfileByTenantIdAndUserId, getTenantByUserId } from "./service";

export async function requireSession() {
  const session = await auth();
  assert(session, "not logged in");
  return session;
}

export async function requireAuthContext() {
  const session = await requireSession();

  // FIXME: This could return multiple tenants
  const tenant = await getTenantByUserId(session.user.id);
  const profile = await getProfileByTenantIdAndUserId(tenant.id, session.user.id);

  return { profile, tenant, session };
}

/**
 * Validate the HMAC SHA-256 signature of the payload using WebCrypto APIs.
 *
 * @param secretKey - The shared secret key used for HMAC generation.
 * @param payloadBody - The raw request body as a Buffer.
 * @param receivedSignature - The signature received in the 'X-Signature' header.
 * @returns True if the signature is valid, False otherwise.
 */

export async function validateSignature(
  secretKey: string,
  payloadBody: ArrayBuffer,
  receivedSignature: string,
): Promise<boolean> {
  // Convert the secret key to a CryptoKey object
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"],
  );

  // Generate the expected signature
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, payloadBody);

  const expectedSignature = Buffer.from(signatureBuffer).toString("hex");

  // Use a constant-time comparison to prevent timing attacks
  return Buffer.from(expectedSignature, "utf-8").equals(Buffer.from(receivedSignature, "utf-8"));
}
