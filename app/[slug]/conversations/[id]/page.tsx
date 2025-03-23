import { redirect } from "next/navigation";

import Conversation from "@/app/(main)/conversations/[id]/conversation";
import { authOrRedirect } from "@/lib/server/utils";


interface Props {
  params: { slug: string; id: string };
}

export default async function ConversationPage({ params }: Props) {
  const { tenant } = await authOrRedirect();

  // Verify that the tenant slug matches the URL slug
  if (tenant.slug !== params.slug) {
    redirect("/sign-in");
  }

  return <Conversation tenantName={tenant.name} tenantLogoUrl={tenant.logoUrl} id={params.id} />;
}
