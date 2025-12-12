import assert from "assert";

import argon2 from "argon2";
import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";
import { z } from "zod";

import auth from "@/auth";

import { getCheckPath, getSignInPath, getTenantPath } from "../paths";

import { verifyJwtToken } from "./embed-auth";
import {
  createProfile,
  findProfileByTenantIdAndUserId,
  findTenantBySlug,
  getCachedAuthContext,
  invalidateTenantCache,
  updateTenantPaidStatus,
} from "./service";
import { BILLING_ENABLED } from "./settings";

const tenantSchema = z.string();

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  assert(session, "not logged in");
  return session;
}

export async function requireAuthContext(slug: string) {
  const session = await requireSession();
  const { profile, tenant } = await getCachedAuthContext(session.user.id, slug);

  if (
    BILLING_ENABLED &&
    (tenant.paidStatus === "trial" || tenant.paidStatus === "legacy") &&
    tenant.trialExpiresAt < new Date()
  ) {
    await updateTenantPaidStatus(tenant.id, "expired");
    invalidateTenantCache(tenant.slug);
  }

  return { profile, tenant, session };
}

/**
 * Extract JWT token from Authorization header
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Try to get auth context from JWT token
 * Returns null if no valid JWT token is present
 */
async function tryJwtAuthContext(request: Request, slug: string) {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  const payload = await verifyJwtToken(token);
  if (!payload || !payload.sub) {
    return null;
  }

  const userId = payload.sub;
  const tenant = await findTenantBySlug(slug);

  if (!tenant) {
    return null;
  }

  // Get or create profile for this user in this tenant
  let profile = await findProfileByTenantIdAndUserId(tenant.id, userId);
  if (!profile) {
    // Only create profile if tenant is public (for embed users)
    if (!tenant.isPublic) {
      return null;
    }
    profile = await createProfile(tenant.id, userId, "guest");
  }

  return { profile, tenant };
}

/**
 * Require auth context from request - supports both cookie-based and JWT auth
 * First tries cookie auth, then falls back to JWT auth from Authorization header
 */
export async function requireAuthContextFromRequest(request: Request) {
  const slug = tenantSchema.parse(request.headers.get("tenant"));

  // First, try cookie-based auth
  try {
    return await requireAuthContext(slug);
  } catch {
    // Cookie auth failed, try JWT auth
  }

  // Try JWT auth
  const jwtContext = await tryJwtAuthContext(request, slug);
  if (jwtContext) {
    return { ...jwtContext, session: null };
  }

  // Both auth methods failed
  throw new Error("Authentication required");
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
      console.log("===>>redirecting to check", slug);
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
