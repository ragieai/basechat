import { redirect } from "next/navigation";
import { ReactNode } from "react";

import Footer from "@/app/(main)/footer";
import Header from "@/app/(main)/header";
import { authOrRedirect } from "@/lib/server/utils";

interface Props {
  children?: ReactNode;
  params: { slug: string };
}

export default async function TenantLayout({ children, params }: Props) {
  const { tenant, profile } = await authOrRedirect();
  const slug = await params.slug;

  // Verify that the tenant slug matches the URL slug
  if (tenant.slug !== slug) {
    // Redirect to the user's tenant welcome page instead of sign-in
    redirect(`/${tenant.slug}`);
  }

  return (
    <div className="h-full w-full flex flex-col items-center bg-white">
      <Header currentProfileId={profile.id} name={tenant.name} logoUrl={tenant.logoUrl} tenantSlug={tenant.slug} />
      <div className="h-full w-full flex-1 flex justify-center overflow-auto">
        <div className="h-full w-full flex flex-col items-center justify-center min-w-[500px]">{children}</div>
      </div>
      {profile.role != "user" && (
        <Footer className="h-[80px] shrink-0 w-full bg-[#27272A] flex items-center justify-center" />
      )}
    </div>
  );
}
