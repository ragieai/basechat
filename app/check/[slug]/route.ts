import { auth, signIn } from "@/auth";
import { createGuestUser, createProfile, findProfileByTenantIdAndUserId, findTenantBySlug } from "@/lib/server/service";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const tenant = await findTenantBySlug(slug);

  if (!tenant?.isPublic) {
    return Response.redirect(new URL("/sign-in", request.url));
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
