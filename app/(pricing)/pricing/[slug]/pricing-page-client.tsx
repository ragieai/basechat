"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PRICING_TIER_CONFIG } from "@/lib/billing";
import { getDataPath } from "@/lib/paths";

interface PricingPageClientProps {
  tenant: {
    slug: string;
    paidStatus: string;
    metadata: {
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

export default function PricingPageClient({ tenant }: PricingPageClientProps) {
  // Get the current active plan
  const currentPlan = tenant.metadata.plans?.find((plan) => !plan.endedAt);
  const currentTier = currentPlan?.tier;

  // Determine if tenant is in trial
  const isInTrial = tenant.paidStatus === "trial";

  return (
    <div className="w-full max-w-[1200px] relative">
      <Link href={getDataPath(tenant.slug)} className="absolute top-0 left-0 text-sm text-gray-500 hover:text-gray-700">
        Cancel
      </Link>

      <h1 className="text-3xl font-bold mb-8 text-center">Choose Your Plan</h1>

      {/* Current Plan Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
        {currentPlan ? (
          <div className="space-y-2">
            <p className="text-gray-600">
              You are currently on the {currentTier} plan with {currentPlan.seats} seats
            </p>
            <p className="text-sm text-gray-500">Started on {new Date(currentPlan.startedAt).toLocaleDateString()}</p>
          </div>
        ) : isInTrial ? (
          <div className="space-y-2">
            <p className="text-gray-600">You are currently on the Developer plan (Trial)</p>
          </div>
        ) : (
          <p className="text-gray-600">
            {tenant.paidStatus === "expired" ? "Your trial has expired" : "You are on a paid plan"}
          </p>
        )}
      </div>

      {/* Plans Section */}
      <div className="grid grid-cols-4 gap-6">
        {PRICING_TIER_CONFIG.map((tier) => {
          const isCurrentPlan = currentTier === tier.id || (isInTrial && tier.id === "developer");
          return (
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
                    backgroundColor: isCurrentPlan ? "#9CA3AF" : tier.color,
                    color: "white",
                  }}
                  disabled={isCurrentPlan}
                  onClick={() => {
                    if (tier.buttonLink) {
                      window.location.href = tier.buttonLink;
                    } else {
                      // TODO: Implement Stripe checkout
                    }
                  }}
                >
                  {isCurrentPlan ? "Current Plan" : tier.buttonText}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact Us Section */}
      <div className="mt-8 text-left">
        <p className="text-sm text-gray-600">
          Have questions?{" "}
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Contact us
          </Link>
          {/* TODO: add calendly link */}
        </p>
      </div>
    </div>
  );
}
