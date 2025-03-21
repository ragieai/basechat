import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function publicRouteMiddleware(request: NextRequest) {
  // Only handle /o/[slug] routes
  if (!request.nextUrl.pathname.startsWith("/o/")) {
    return NextResponse.next();
  }

  const slug = request.nextUrl.pathname.split("/")[2];
  if (!slug) {
    return NextResponse.next();
  }

  try {
    // Create response
    const nextResponse = NextResponse.next();

    // Validate public route and get user info
    const response = await fetch(new URL("/api/public/validate", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug }),
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/404", request.url));
    }

    const { cookie } = await response.json();

    // Set cookie with 30 day expiry
    nextResponse.cookies.set("public_user", encodeURIComponent(JSON.stringify(cookie)), {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return nextResponse;
  } catch (error) {
    console.error("Error in public route middleware:", error);
    return NextResponse.redirect(new URL("/404", request.url));
  }
}
