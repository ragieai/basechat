import { requireAdminContext } from "@/lib/server/utils";

import PricingPageClient from "./pricing-page-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PricingPage({ params }: Props) {
  const { slug } = await params;
  const { tenant } = await requireAdminContext(slug);

  return (
    <PricingPageClient
      tenant={{
        slug: tenant.slug,
        paidStatus: tenant.paidStatus,
        metadata: tenant.metadata ?? {},
      }}
    />
  );
}
