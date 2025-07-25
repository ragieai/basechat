import { BILLING_ENABLED, DEFAULT_PARTITION_LIMIT } from "@/lib/server/settings";
import { adminOrRedirect } from "@/lib/server/utils";

import SettingsNav from "../settings-nav";

import BillingSettingsClient from "./billing-settings-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BillingSettingsPage({ params }: Props) {
  const p = await params;
  const { tenant } = await adminOrRedirect(p.slug);

  return (
    <div className="flex justify-center overflow-auto w-full h-full">
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav tenant={tenant} billingEnabled={BILLING_ENABLED} />
        <BillingSettingsClient
          tenant={{
            id: tenant.id,
            slug: tenant.slug,
            partitionLimitExceededAt: tenant.partitionLimitExceededAt,
            paidStatus: tenant.paidStatus,
            metadata: tenant.metadata ?? {},
          }}
          defaultPartitionLimit={DEFAULT_PARTITION_LIMIT}
        />
      </div>
    </div>
  );
}
