"use client";

import { Button } from "@/components/ui/button";

interface PricingPageClientProps {
  tenant: {
    slug: string;
    paidStatus: string;
  };
}

export default function PricingPageClient({ tenant }: PricingPageClientProps) {
  return (
    <div className="w-full max-w-[800px]">
      <h1 className="text-3xl font-bold mb-8">Choose Your Plan</h1>

      {/* Current Plan Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
        <p className="text-gray-600">
          {tenant.paidStatus === "expired"
            ? "Your trial has expired"
            : tenant.paidStatus === "trial"
              ? "You are currently on a trial"
              : "You are on a paid plan"}
        </p>
      </div>

      {/* Plans Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Basic Plan */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">Basic</h3>
          <p className="text-3xl font-bold mb-4">
            $18<span className="text-lg text-gray-600">/user/month</span>
          </p>
          <ul className="space-y-2 mb-6">
            <li>• Up to 5 users</li>
            <li>• Basic support</li>
            <li>• Standard features</li>
          </ul>
          <Button
            className="w-full bg-[#D946EF] text-white hover:bg-[#D946EF]/90"
            onClick={() => {
              /* TODO: Implement Stripe checkout */
            }}
          >
            Get Started
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">Pro</h3>
          <p className="text-3xl font-bold mb-4">
            $36<span className="text-lg text-gray-600">/user/month</span>
          </p>
          <ul className="space-y-2 mb-6">
            <li>• Unlimited users</li>
            <li>• Priority support</li>
            <li>• Advanced features</li>
          </ul>
          <Button
            className="w-full bg-[#D946EF] text-white hover:bg-[#D946EF]/90"
            onClick={() => {
              /* TODO: Implement Stripe checkout */
            }}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
