import { auth } from "@/auth";
import { createProfile, findProfileByTenantIdAndUserId, findTenantBySlug } from "@/lib/server/service";
import { authOrRedirect } from "@/lib/server/utils";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const tenant = await findTenantBySlug(slug);

  if (!tenant || !tenant.isPublic) {
    return Response.redirect(new URL("/sign-in", request.url));
  }

  const session = await auth();

  if (session) {
    const profile = await findProfileByTenantIdAndUserId(tenant.id, session.user.id);
    if (!profile) {
      await createProfile(tenant.id, session.user.id, "guest");
    }
    return Response.redirect(new URL(`/o/${slug}`, request.url));
  } else {
    // sign-in anonymously (creates an anon yser and profile for the tenant)
    // redirect to tenant home or redirectTo URL if it exists
  }
  return Response.json(`Hello: ${slug}`);
}
