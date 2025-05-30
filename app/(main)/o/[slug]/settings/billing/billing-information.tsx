"use client";

import { CreditCard, History, Users, Settings, CreditCard as CreditCardIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPricingPath } from "@/lib/paths";

interface BillingInformationProps {
  tenant: {
    slug: string;
    paidStatus: string;
    metadata: {
      stripeCustomerId?: string;
      orbCustomerId?: string;
      plans?: Array<{
        id: string;
        endedAt: Date | null;
        startedAt: Date;
        tier: string;
        seats: number;
      }>;
    };
  };
}

export default function BillingInformation({ tenant }: BillingInformationProps) {
  const currentPlan = tenant.metadata.plans?.find((plan) => !plan.endedAt);
  const totalSeats = currentPlan?.seats ?? 0;
  const usedSeats = 0; // TODO: Get this from the number of active users

  return (
    <div className="flex flex-col gap-6">
      {/* Data Plan Card */}
      <Card className="p-6">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-[#74747A]" />
            <h3 className="font-medium text-base text-[#343A40]">Data Plan</h3>
          </div>
          <div className="flex-grow">
            <p className="text-sm text-[#74747A] mb-2">Current Plan</p>
            <p className="text-base font-medium text-[#343A40] mb-4">Pro Plan</p>
          </div>
          <Button variant="outline" className="w-full flex items-center justify-center gap-2">
            <History className="h-4 w-4" />
            View payment history
          </Button>
        </div>
      </Card>

      {/* Seats Card */}
      <Card className="p-6">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-[#74747A]" />
            <h3 className="font-medium text-base text-[#343A40]">Seats</h3>
          </div>
          <div className="flex-grow">
            <p className="text-sm text-[#74747A] mb-2">Total Seats</p>
            <p className="text-base font-medium text-[#343A40] mb-2">{totalSeats}</p>
            <p className="text-sm text-[#74747A] mb-2">Open Seats</p>
            <p className="text-base font-medium text-[#343A40] mb-2">{totalSeats - usedSeats}</p>
          </div>
          <Button variant="outline" className="w-full flex items-center justify-center gap-2">
            {/** TODO: button opens seat config dialog */}
            <Settings className="h-4 w-4" />
            Manage seats
          </Button>
        </div>
      </Card>

      {/* Account Card */}
      <Card className="p-6">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <CreditCardIcon className="h-5 w-5 text-[#74747A]" />
            <h3 className="font-medium text-base text-[#343A40]">Account</h3>
          </div>
          <div className="flex-grow space-y-4">
            <Link href={getPricingPath(tenant.slug)}>
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <Settings className="h-4 w-4" />
                Manage plan
              </Button>
            </Link>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" />
              Manage payment method
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
