"use client";

import WarningMessage from "@/components/warning-message";

import BillingInformation from "./billing-information";
import ProcessingInformation from "./processing-information";

type PartitionInfo = {
  name: string;
  isDefault: boolean;
  limitExceededAt: Date | null;
  limits: {
    pagesProcessedLimitMonthly: number | null;
    pagesHostedLimitMonthly: number | null;
    pagesProcessedLimitMax: number | null;
    pagesHostedLimitMax: number | null;
  };
  stats: {
    pagesProcessedMonthly: number;
    pagesHostedMonthly: number;
    pagesProcessedTotal: number;
    pagesHostedTotal: number;
    documentCount: number;
  };
};

type Props = {
  tenant: {
    slug: string;
    partitionLimitExceededAt: Date | null;
    paidStatus: string;
    metadata: {
      stripeCustomerId?: string;
      orbCustomerId?: string;
    };
  };
  partitionInfo: PartitionInfo;
  defaultPartitionLimit: number;
  seats?: {
    total: number;
    used: number;
  };
};

export default function BillingSettings({ tenant, partitionInfo, defaultPartitionLimit, seats }: Props) {
  return (
    <div className="w-full p-4 flex-grow flex flex-col relative">
      <div className="flex w-full justify-between items-center mb-8">
        <h1 className="font-bold text-[32px] text-[#343A40]">Billing</h1>
      </div>

      {!isNaN(defaultPartitionLimit) && tenant.partitionLimitExceededAt && (
        <WarningMessage className="mb-4">
          You have reached the page processing limit for this chatbot. Please contact support@ragie.ai if you need
          assistance.
        </WarningMessage>
      )}

      <div className="space-y-8">
        <BillingInformation tenant={tenant} seats={seats} />
        <ProcessingInformation partitionInfo={partitionInfo} />
      </div>
      <div className="h-16" />
    </div>
  );
}
