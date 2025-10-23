import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Orb from "orb-billing";

import { TenantPlan, TenantMetadata } from "@/lib/billing/tenant";
import { getPlanIdFromType, getPlanTypeFromId } from "@/lib/orb";
import { PLANS, PlanType, SEAT_ADD_ON_NAME } from "@/lib/orb-types";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { getTenantByTenantId, invalidateTenantCache } from "@/lib/server/service";
import { ORB_WEBHOOK_SECRET, ORB_API_KEY } from "@/lib/server/settings";

class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant ${tenantId} not found`);
    this.name = "TenantNotFoundError";
  }
}

interface Price {
  id: string;
  name: string;
}

interface FixedFeeQuantityTransition {
  price_id: string;
  quantity: number;
  effective_date: string;
}

interface PriceInterval {
  fixed_fee_quantity_transitions?: FixedFeeQuantityTransition[];
}

interface OrbWebhookPayload {
  type: string;
  customer: {
    id: string;
    external_customer_id: string;
    payment_provider_id: string;
  };
  subscription: {
    id: string;
    start_date: string;
    customer: {
      id: string;
      external_customer_id: string;
    };
    plan: {
      id: string;
      prices: Price[];
    };
    quantity: number;
    price_intervals: PriceInterval[];
  };
}

export async function POST(req: NextRequest) {
  const orb = new Orb({ apiKey: ORB_API_KEY });
  try {
    const body = await req.text();
    const headersObj: Record<string, string> = {};

    // Convert headers to plain object
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    // Verify webhook signature using Orb SDK
    const payload = orb.webhooks.unwrap(body, headersObj, ORB_WEBHOOK_SECRET) as OrbWebhookPayload;
    const webhookType = payload.type;
    console.log(`Received orb webhook: ${webhookType}`);

    switch (webhookType) {
      case "customer.created": {
        const tenantId = payload.customer.external_customer_id;
        await assertTenantExists(tenantId);
        await handleCustomerCreated(tenantId, payload);
        break;
      }
      case "customer.edited": {
        const tenantId = payload.customer.external_customer_id;
        await assertTenantExists(tenantId);
        await handleCustomerEdited(tenantId, payload);
        break;
      }
      case "subscription.started": {
        const tenantId = payload.subscription.customer.external_customer_id;
        await assertTenantExists(tenantId);
        await handleSubscriptionStarted(tenantId, payload);
        break;
      }
      case "subscription.plan_changed": {
        const tenantId = payload.subscription.customer.external_customer_id;
        await assertTenantExists(tenantId);
        await handlePlanChanged(tenantId, payload);
        break;
      }
      case "subscription.fixed_fee_quantity_updated": {
        const tenantId = payload.subscription.customer.external_customer_id;
        await assertTenantExists(tenantId);
        await handleFixedFeeQuantityUpdated(tenantId, payload);
        break;
      }
      default: {
        console.log("Unhandled orb webhook type:", webhookType);
        break;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      console.log(`Ignoring webhook likely intended for ragie api: ${error.message}`);
      return NextResponse.json({ ok: true });
    }
    console.error("Error processing orb webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function assertTenantExists(tenantId: string) {
  try {
    await getTenantByTenantId(tenantId);
  } catch (error) {
    throw new TenantNotFoundError(tenantId);
  }
}

async function handleSubscriptionStarted(tenantId: string, payload: OrbWebhookPayload) {
  const tenant = await getTenantByTenantId(tenantId);
  const existingMetadata = (tenant.metadata || {}) as TenantMetadata;
  const existingPlans = existingMetadata.plans || [];
  const existingPaidStatus = tenant.paidStatus;

  const planSeatPrice = payload.subscription.plan.prices.find((p: any) => p.name === SEAT_ADD_ON_NAME);

  const quantity = payload.subscription.price_intervals
    .flatMap((interval: any) => interval.fixed_fee_quantity_transitions || [])
    .filter((t: any) => t.price_id === planSeatPrice?.id)
    .sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0]?.quantity;

  await db
    .update(schema.tenants)
    .set({
      metadata: {
        stripeCustomerId: existingMetadata.stripeCustomerId,
        orbSubscriptionId: payload.subscription.id,
        orbCustomerId: payload.subscription.customer.id,
        plans: [
          ...existingPlans.map((plan: TenantPlan) => ({
            ...plan,
            endedAt: plan.endedAt ? plan.endedAt : new Date(), // End all previous plans
          })),
          {
            id: payload.subscription.id,
            name: (await getPlanTypeFromId(payload.subscription.plan.id)) || "developer",
            startedAt: new Date(payload.subscription.start_date),
            endedAt: null,
            tier: payload.subscription.plan.id,
            seats: quantity,
          },
        ],
      },
      paidStatus:
        payload.subscription.plan.id === (await getPlanIdFromType("developer")) ? existingPaidStatus : "active",
    })
    .where(eq(schema.tenants.id, tenantId));

  // Invalidate auth context cache for all users in this tenant
  await invalidateTenantCache(tenant.slug);
}

async function handlePlanChanged(tenantId: string, payload: OrbWebhookPayload) {
  const tenant = await getTenantByTenantId(tenantId);
  const existingMetadata = (tenant.metadata || {}) as TenantMetadata;
  const existingPlans = existingMetadata.plans || [];
  const existingPaidStatus = tenant.paidStatus;
  const planSeatPrice = payload.subscription.plan.prices.find((p: any) => p.name === SEAT_ADD_ON_NAME);

  const newPlanType = await getPlanTypeFromId(payload.subscription.plan.id);

  const quantity = payload.subscription.price_intervals
    .flatMap((interval: any) => interval.fixed_fee_quantity_transitions || [])
    .filter((t: any) => t.price_id === planSeatPrice?.id)
    .sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0]?.quantity;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.tenants)
      .set({
        metadata: {
          stripeCustomerId: existingMetadata.stripeCustomerId,
          orbSubscriptionId: existingMetadata.orbSubscriptionId,
          orbCustomerId: existingMetadata.orbCustomerId,
          plans: [
            ...existingPlans.map((plan: TenantPlan) => ({
              ...plan,
              endedAt: plan.endedAt ? plan.endedAt : new Date(), // End all previous plans
            })),
            {
              id: payload.subscription.id,
              name: newPlanType || "developer",
              startedAt: new Date(payload.subscription.start_date),
              endedAt: null,
              tier: payload.subscription.plan.id,
              seats: quantity,
            },
          ],
        },
        paidStatus:
          payload.subscription.plan.id === (await getPlanIdFromType("developer")) ? existingPaidStatus : "active",
      })
      .where(eq(schema.tenants.id, tenantId));

    // If there's a new plan type, also update the partition limit exceeded flag
    if (newPlanType) {
      await tx
        .update(schema.tenants)
        .set({
          partitionLimitExceededAt: null,
        })
        .where(eq(schema.tenants.id, tenantId));
    }
  });

  // Handle external API call after the transaction to avoid potential issues
  if (newPlanType) {
    const newPartitionLimit = PLANS[newPlanType as PlanType].partitionLimit;
    const { client, partition } = await getRagieClientAndPartition(tenantId);
    await client.partitions.setLimits({
      partitionId: partition,
      partitionLimitParams: {
        pagesProcessedLimitMax: newPartitionLimit,
      },
    });
  }

  // Invalidate auth context cache for all users in this tenant
  await invalidateTenantCache(tenant.slug);
}

async function handleFixedFeeQuantityUpdated(tenantId: string, payload: OrbWebhookPayload) {
  const tenant = await getTenantByTenantId(tenantId);

  const existingMetadata = (tenant.metadata || {}) as TenantMetadata;
  const existingPlans = existingMetadata.plans || [];

  const planSeatPrice = payload.subscription.plan.prices.find((p: any) => p.name === SEAT_ADD_ON_NAME);

  const quantity = payload.subscription.price_intervals
    .flatMap((interval: any) => interval.fixed_fee_quantity_transitions || [])
    .filter((t: any) => t.price_id === planSeatPrice?.id)
    .sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0]?.quantity;

  await db
    .update(schema.tenants)
    .set({
      metadata: {
        stripeCustomerId: existingMetadata.stripeCustomerId,
        orbSubscriptionId: existingMetadata.orbSubscriptionId,
        orbCustomerId: existingMetadata.orbCustomerId,
        plans: [
          ...existingPlans.map((plan: TenantPlan) => ({
            ...plan,
            endedAt: plan.endedAt ? plan.endedAt : new Date(),
          })),
          {
            id: payload.subscription.id,
            name: (await getPlanTypeFromId(payload.subscription.plan.id)) || "developer",
            startedAt: new Date(payload.subscription.start_date),
            endedAt: null,
            tier: payload.subscription.plan.id,
            seats: quantity,
          },
        ],
      },
    })
    .where(eq(schema.tenants.id, tenantId));

  // Invalidate auth context cache for all users in this tenant
  await invalidateTenantCache(tenant.slug);
}

async function handleCustomerCreated(tenantId: string, payload: OrbWebhookPayload) {
  const tenant = await getTenantByTenantId(tenantId);
  const existingMetadata = (tenant.metadata || {}) as TenantMetadata;
  await db
    .update(schema.tenants)
    .set({
      metadata: {
        ...existingMetadata,
        orbCustomerId: payload.customer.id,
      },
    })
    .where(eq(schema.tenants.id, tenantId));

  // Invalidate auth context cache for all users in this tenant
  await invalidateTenantCache(tenant.slug);
}

async function handleCustomerEdited(tenantId: string, payload: OrbWebhookPayload) {
  const tenant = await getTenantByTenantId(tenantId);
  const existingMetadata = (tenant.metadata || {}) as TenantMetadata;
  await db
    .update(schema.tenants)
    .set({
      metadata: {
        ...existingMetadata,
        stripeCustomerId: payload.customer.payment_provider_id,
      },
    })
    .where(eq(schema.tenants.id, tenantId));

  // Invalidate auth context cache for all users in this tenant
  await invalidateTenantCache(tenant.slug);
}
