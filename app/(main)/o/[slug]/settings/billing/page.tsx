import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { BILLING_ENABLED, DEFAULT_PARTITION_LIMIT } from "@/lib/server/settings";
import { adminOrRedirect } from "@/lib/server/utils";

import SettingsNav from "../settings-nav";

import BillingSettings from "./billing-settings";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BillingSettingsPage({ params }: Props) {
  const p = await params;
  const { tenant } = await adminOrRedirect(p.slug);
  const { client, partition } = await getRagieClientAndPartition(tenant.id);

  const partitionInfo = await client.partitions.get({ partitionId: partition });

  return (
    <div className="flex justify-center overflow-auto w-full">
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav tenant={tenant} billingEnabled={BILLING_ENABLED} />
        <BillingSettings
          tenant={{
            slug: tenant.slug,
            partitionLimitExceededAt: tenant.partitionLimitExceededAt,
            paidStatus: tenant.paidStatus,
            metadata: tenant.metadata ?? {},
          }}
          partitionInfo={partitionInfo}
          defaultPartitionLimit={DEFAULT_PARTITION_LIMIT}
        />
      </div>
    </div>
  );
}
