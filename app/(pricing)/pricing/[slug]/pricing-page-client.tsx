"use client";

import { Button } from "@/components/ui/button";

import { PRICING_TIER_CONFIG } from "./pricing-config";

interface PricingPageClientProps {
  tenant: {
    slug: string;
    paidStatus: string;
  };
}

export default function PricingPageClient({ tenant }: PricingPageClientProps) {
  return (
    <div className="w-full max-w-[1200px]">
      <h1 className="text-3xl font-bold mb-8 text-center">Choose Your Plan</h1>

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
      <div className="grid grid-cols-4 gap-6">
        {PRICING_TIER_CONFIG.map((tier) => (
          <div key={tier.id} className="border rounded-lg p-6 flex flex-col">
            {/* Tier Header */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: tier.color }}>
                {tier.name}
              </h3>
              <div className="h-0.5 w-full mb-4" style={{ background: tier.color }} />
            </div>

            {/* Price */}
            <div className="mb-6">
              {tier.hasCustomPricing ? (
                <p className="text-2xl font-bold">Custom Pricing</p>
              ) : (
                <p className="text-2xl font-bold">
                  ${tier.priceMonthly}
                  <span className="text-lg text-gray-600">/user/month</span>
                </p>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-6 flex-grow">{tier.description}</p>

            {/* Button */}
            {!tier.buttonHidden && (
              <Button
                className="w-full"
                style={{
                  backgroundColor: tier.color,
                  color: "white",
                }}
                onClick={() => {
                  if (tier.buttonLink) {
                    window.location.href = tier.buttonLink;
                  } else {
                    // TODO: Implement Stripe checkout
                  }
                }}
              >
                {tier.buttonText}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
