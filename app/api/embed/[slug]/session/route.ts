import { randomUUID } from "crypto";

import { NextRequest } from "next/server";

import auth from "@/auth";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { createProfile, findProfileByTenantIdAndUserId, findTenantBySlug } from "@/lib/server/service";

type Params = { slug: string };

/**
 * Create an anonymous user directly in the database (bypasses cookie-setting auth flow)
 */
async function createAnonymousUser() {
  const id = randomUUID();
  const email = `${id}@anonymous.embed`;

  const [user] = await db
    .insert(schema.users)
    .values({
      id,
      email,
      name: "Anonymous",
      isAnonymous: true,
      emailVerified: false,
    })
    .returning();

  return user;
}

/**
 * Initialize an embed session - creates anonymous user if needed and returns JWT token
 */
export async function POST(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { slug } = await params;

  try {
    // Validate tenant exists and is public
    const tenant = await findTenantBySlug(slug);
    if (!tenant?.isPublic) {
      console.error(`[Embed Session] Tenant not found or not public: ${slug}`);
      return Response.json({ error: "Tenant not found or not public" }, { status: 404 });
    }

    // Create anonymous user directly in DB (no cookies)
    const user = await createAnonymousUser();
    if (!user) {
      console.error(`[Embed Session] Failed to create anonymous user for tenant: ${slug}`);
      return Response.json({ error: "Could not create anonymous user" }, { status: 500 });
    }

    const userId = user.id;

    // Create or get guest profile for this tenant
    let profile = await findProfileByTenantIdAndUserId(tenant.id, userId);
    if (!profile) {
      profile = await createProfile(tenant.id, userId, "guest");
    }

    // Generate JWT token directly using the auth API
    // The signJWT endpoint is server-only, so we call it via the internal API
    const jwtResponse = await auth.api.signJWT({
      body: {
        payload: {
          sub: userId,
          tenantId: tenant.id,
          profileId: profile.id,
        },
      },
    });

    if (!jwtResponse?.token) {
      console.error(`[Embed Session] Failed to generate JWT token for user: ${userId}, tenant: ${slug}`);
      return Response.json({ error: "Could not generate token" }, { status: 500 });
    }

    const token = jwtResponse.token;

    return Response.json({
      token,
      userId,
      profileId: profile.id,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        welcomeMessage: tenant.welcomeMessage,
        question1: tenant.question1,
        question2: tenant.question2,
        question3: tenant.question3,
        isBreadth: tenant.isBreadth,
        paidStatus: tenant.paidStatus,
        disabledModels: tenant.disabledModels,
        defaultModel: tenant.defaultModel,
      },
    });
  } catch (error) {
    console.error(`[Embed Session] Initialization error for tenant ${slug}:`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to initialize session" },
      { status: 500 },
    );
  }
}

/**
 * Validate an existing JWT token and return tenant info
 */
export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { slug } = await params;

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error(`[Embed Session Validate] No authorization token provided for tenant: ${slug}`);
      return Response.json({ error: "No authorization token provided" }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Validate tenant exists and is public
    const tenant = await findTenantBySlug(slug);
    if (!tenant?.isPublic) {
      console.error(`[Embed Session Validate] Tenant not found or not public: ${slug}`);
      return Response.json({ error: "Tenant not found or not public" }, { status: 404 });
    }

    // Verify the JWT token by calling our embed-auth utility
    const { verifyJwtToken } = await import("@/lib/server/embed-auth");
    const payload = await verifyJwtToken(token);

    if (!payload || !payload.sub) {
      console.error(`[Embed Session Validate] Invalid or expired token for tenant: ${slug}`);
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userId = payload.sub;

    // Get or create profile
    let profile = await findProfileByTenantIdAndUserId(tenant.id, userId);
    if (!profile) {
      profile = await createProfile(tenant.id, userId, "guest");
    }

    return Response.json({
      valid: true,
      userId,
      profileId: profile.id,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        welcomeMessage: tenant.welcomeMessage,
        question1: tenant.question1,
        question2: tenant.question2,
        question3: tenant.question3,
        isBreadth: tenant.isBreadth,
        paidStatus: tenant.paidStatus,
        disabledModels: tenant.disabledModels,
        defaultModel: tenant.defaultModel,
      },
    });
  } catch (error) {
    console.error(`[Embed Session Validate] Error for tenant ${slug}:`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to validate session" },
      { status: 500 },
    );
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
