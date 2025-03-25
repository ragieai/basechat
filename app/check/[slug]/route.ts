import { auth, signIn } from "@/auth";
import { createGuestUser, createProfile, findProfileByTenantIdAndUserId, findTenantBySlug } from "@/lib/server/service";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const tenant = await findTenantBySlug(slug);

  if (!tenant?.isPublic) {
    return Response.redirect(getSignInUrl(request.url));
  }

  const session = await auth();

  if (session) {
    const profile = await findProfileByTenantIdAndUserId(tenant.id, session.user.id);
    if (!profile) {
      await createProfile(tenant.id, session.user.id, "guest");
    }
  } else {
    const user = await createGuestUser();
    await createProfile(tenant.id, user.id, "guest");
    await signIn("anonymous", { id: user.id, redirect: false });
  }
  return Response.redirect(new URL(`/o/${slug}`, request.url));
}

function getSignInUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const redirectToParam = url.searchParams.get("redirectTo");

  const signInUrl = new URL("/sign-in", url);
  if (redirectToParam) {
    signInUrl.searchParams.set("redirectTo", redirectToParam);
  }
  return signInUrl;
}
