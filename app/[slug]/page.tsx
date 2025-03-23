import { redirect } from "next/navigation";

import Welcome from "@/app/(main)/welcome";
import { authOrRedirect } from "@/lib/server/utils";


interface Props {
  params: { slug: string };
}

export default async function TenantPage({ params }: Props) {
  const context = await authOrRedirect();
  const slug = await params.slug;

  // Verify that the tenant slug matches the URL slug
  if (context.tenant.slug !== slug) {
    redirect("/sign-in");
  }

  return <Welcome tenant={context.tenant} className="flex-1 flex flex-col w-full bg-white p-4 max-w-[717px]" />;
}
