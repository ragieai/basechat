"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getPricingPlansPath } from "@/lib/paths";

import BillingSettings from "./billing-settings";
import { EmptyBilling } from "./empty-billing";

interface Props {
  tenant: {
    id: string;
    slug: string;
    partitionLimitExceededAt: Date | null | undefined;
    paidStatus: string;
    metadata: any;
  };
  defaultPartitionLimit: number;
}

export default function BillingSettingsClient({ tenant, defaultPartitionLimit }: Props) {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [mustProvisionBillingCustomer, setMustProvisionBillingCustomer] = useState<boolean>(false);
  const [partitionInfo, setPartitionInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetch("/api/billing/get-info", {
      method: "POST",
      headers: { tenant: tenant.slug },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch billing information");
        const data = await res.json();
        if (isMounted) {
          setBillingData(data.billingData);
          setMustProvisionBillingCustomer(data.mustProvisionBillingCustomer);
          setPartitionInfo(data.partitionInfo);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [tenant.id, tenant.slug]);

  if (loading) {
    return (
      <div className="w-full p-4 flex-grow flex flex-col relative">
        <div className="flex w-full justify-between items-center mb-8">
          <h1 className="font-bold text-[32px] text-[#343A40]">Billing</h1>
        </div>
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 flex-grow flex flex-col relative">
        <div className="flex w-full justify-between items-center mb-12">
          <h1 className="font-bold text-[32px] text-[#343A40]">Billing</h1>
        </div>
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    );
  }

  if (mustProvisionBillingCustomer || billingData?.currentPlan?.name === "developer") {
    return <EmptyBilling pricingPlansPath={getPricingPlansPath(tenant.slug)} />;
  }

  return (
    <BillingSettings
      tenant={tenant}
      partitionInfo={partitionInfo}
      defaultPartitionLimit={defaultPartitionLimit}
      billingData={billingData}
    />
  );
}
