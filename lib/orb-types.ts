import Orb from "orb-billing";
import { z } from "zod";

export const tierSchema = z.union([
  z.literal("developer"),
  z.literal("starter"),
  z.literal("pro"),
  z.literal("enterprise"),
]);

export type Tier = z.infer<typeof tierSchema>;

export const planTypeSchema = z.union([z.literal("developer"), z.literal("starter"), z.literal("pro")]);

export type PlanType = z.infer<typeof planTypeSchema>;

export const billingCycleSchema = z.union([z.literal("monthly"), z.literal("annual")]);

export type BillingCycle = z.infer<typeof billingCycleSchema>;

export type PlanDef = {
  planType: PlanType;
  billingCycle: BillingCycle;
  tier: Tier;
  price: number;
  displayName: string;
  alternateCycleType?: PlanType;
  description: string;
  color: string;
  partitionLimit: number;
  mostPopular: boolean;
  buttonText: string;
  buttonLink: string | null;
  buttonHidden: boolean;
  hasCustomPricing?: boolean;
};

export const TIER_COLORS = {
  developer: "#D946EF",
  starter: "#38BDF8",
  pro: "#84CC16",
  enterprise: "#A1A1AA",
} as const;

export const PLANS: Record<PlanType, PlanDef> = {
  developer: {
    planType: "developer",
    billingCycle: "monthly",
    tier: "developer",
    price: 0,
    displayName: "Developer",
    description: "For personal projects or exploring Base Chat",
    color: TIER_COLORS.developer,
    partitionLimit: 10000,
    mostPopular: false,
    buttonText: "Get Started",
    buttonLink: null,
    buttonHidden: false,
  },
  starter: {
    planType: "starter",
    billingCycle: "monthly",
    tier: "starter",
    price: 100,
    displayName: "Starter",
    description: "Perfect for smaller teams and projects",
    color: TIER_COLORS.starter,
    partitionLimit: 10000,
    mostPopular: false,
    buttonText: "Upgrade",
    buttonLink: null,
    buttonHidden: false,
  },
  pro: {
    planType: "pro",
    billingCycle: "monthly",
    tier: "pro",
    price: 500,
    displayName: "Pro",
    description: "Production ready for growing businesses",
    color: TIER_COLORS.pro,
    partitionLimit: 60000,
    mostPopular: true,
    buttonText: "Upgrade",
    buttonLink: null,
    buttonHidden: false,
  },
};

export const TIER_UPGRADE_PATH = ["developer", "starter", "pro", "enterprise"] as const;

export const SEAT_ADD_ON_NAME = "Seat license";
export const SEAT_COST = 18;

export type SeatChangePreview = {
  immediateInvoice: Orb.Invoices.Invoice | null;
  upcomingInvoice: Orb.Invoices.Invoice | null;
  currentSeatCharge: number;
  immediateSeatCharge: number;
  upcomingSeatCharge: number;
  daysLeftInCurrentBillingCycle: number;
  allowedSeatCount: number;
  availableSeatCount: number;
};
