import * as jose from "jose";

import { BASE_URL } from "./settings";

/**
 * Verify a JWT token and return the payload
 */
export async function verifyJwtToken(token: string): Promise<jose.JWTPayload | null> {
  try {
    // Get the JWKS from the auth server
    const jwksResponse = await fetch(`${BASE_URL}/api/auth/jwks`);
    if (!jwksResponse.ok) {
      console.error("Failed to fetch JWKS");
      return null;
    }
    const jwks = await jwksResponse.json();
    const JWKS = jose.createLocalJWKSet(jwks);

    // Verify the token
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: BASE_URL,
    });

    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
