"use client";

import { CreditCard, History, Users, Settings, CreditCard as CreditCardIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BillingInformationProps {
  tenant: {
    paidStatus: string;
    stripeCustomerId?: string;
  };
  seats?: {
    total: number;
    used: number;
  };
}

export default function BillingInformation({ tenant, seats }: BillingInformationProps) {
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
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => (window.location.href = "/billing/history")}
          >
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
            <p className="text-base font-medium text-[#343A40] mb-2">{seats?.total ?? 0}</p>
            <p className="text-sm text-[#74747A] mb-2">Open Seats</p>
            <p className="text-base font-medium text-[#343A40] mb-2">{seats ? seats.total - seats.used : 0}</p>
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => (window.location.href = "/billing/seats")}
          >
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
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => (window.location.href = "/billing/plans")}
            >
              <Settings className="h-4 w-4" />
              Manage plan
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => (window.location.href = "/billing/payment-method")}
            >
              <CreditCard className="h-4 w-4" />
              Manage payment method
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
