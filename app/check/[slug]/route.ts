import auth from "@/auth";
import { createProfile, findProfileByTenantIdAndUserId, findTenantBySlug } from "@/lib/server/service";
import getSession from "@/lib/server/session";
import { BASE_URL } from "@/lib/server/settings";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const tenant = await findTenantBySlug(slug);

  if (!tenant?.isPublic) {
    return Response.redirect(getSignInUrl(request.url));
  }

  const session = await getSession();

  console.log("===>>session", session);

  if (session) {
    const profile = await findProfileByTenantIdAndUserId(tenant.id, session.user.id);
    if (!profile) {
      await createProfile(tenant.id, session.user.id, "guest");
    }
  } else {
    const data = await auth.api.signInAnonymous();
    if (!data) {
      throw new Error("Could not sign in");
    }
    const userId = data.user.id;
    await createProfile(tenant.id, userId, "guest");
  }
  return Response.redirect(new URL(`/o/${slug}`, BASE_URL));
}

function getSignInUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const redirectToParam = url.searchParams.get("redirectTo");

  const signInUrl = new URL("/sign-in", BASE_URL);
  if (redirectToParam) {
    signInUrl.searchParams.set("redirectTo", redirectToParam);
  }
  return signInUrl;
}
