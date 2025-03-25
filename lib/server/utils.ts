import assert from "assert";

import argon2 from "argon2";
import { redirect, unauthorized } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";

import { getCheckPath, getSignInPath, getTenantPath } from "../paths";

import { findTenantBySlug, getAuthContextByUserId } from "./service";

const tenantSchema = z.string();

export async function requireSession() {
  const session = await auth();
  assert(session, "not logged in");
  return session;
}

export async function requireAuthContext(slug: string) {
  const session = await requireSession();
  const { profile, tenant } = await getAuthContextByUserId(session.user.id, slug);
  return { profile, tenant, session };
}

export async function requireAuthContextFromRequest(request: Request) {
  const slug = tenantSchema.parse(request.headers.get("tenant"));
  return requireAuthContext(slug);
}

export async function requireAdminContextFromRequest(request: Request) {
  const slug = tenantSchema.parse(request.headers.get("tenant"));
  return requireAdminContext(slug);
}

export async function requireAdminContext(slug: string) {
  const context = await requireAuthContext(slug);
  if (context.profile.role !== "admin") unauthorized();
  return context;
}

export async function authOrRedirect(slug: string) {
  try {
    return await requireAuthContext(slug);
  } catch (e) {
    const tenant = await findTenantBySlug(slug);
    if (tenant?.isPublic) {
      return redirect(getCheckPath(slug));
    } else {
      return redirect(getSignInPath());
    }
  }
}

export async function adminOrRedirect(slug: string) {
  try {
    return await requireAdminContext(slug);
  } catch (e) {
    return redirect(getTenantPath(slug));
  }
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

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, plainPassword);
  } catch (error) {
    // Handle errors (e.g., invalid hash format)
    return false;
  }
}
