import assert from "assert";

import { isAfter, compareAsc } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import Orb from "orb-billing";

import { getCurrentPlan } from "@/lib/billing/tenant";
import { getSubscriptions } from "@/lib/orb";
import { provisionBillingCustomer } from "@/lib/server/billing";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { getMembersByTenantId } from "@/lib/server/service";
import { ORB_API_KEY } from "@/lib/server/settings";
import { requireAdminContextFromRequest } from "@/lib/server/utils";
import { getStripeCustomerDefaultPaymentMethod } from "@/lib/stripe";

// Helper functions
function getOverdueInvoice(invoices: Orb.Invoice[]): Orb.Invoice | null {
  const now = new Date();
  const issuedInvoices = invoices.filter((i) => i.status === "issued");
  for (const invoice of issuedInvoices) {
    if (invoice.issued_at && isAfter(now, invoice.issued_at)) {
      return invoice;
    }
  }
  return null;
}

function getNextPaymentDate(invoices: Orb.Invoice[]): string | null {
  const draftInvoices = invoices.filter((i) => i.status === "draft" && !!i.scheduled_issue_at);
  const sortedInvoices = draftInvoices.sort((a, b) => compareAsc(a.scheduled_issue_at!, b.scheduled_issue_at!));
  if (sortedInvoices.length === 0) {
    return null;
  }
  return sortedInvoices[0].scheduled_issue_at;
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, session } = await requireAdminContextFromRequest(req);
    const metadata = tenant.metadata;
    let stripeCustomerId;
    let orbCustomerId;
    let orbSubscriptionId;

    let mustProvisionBillingCustomer = true;

    if (!metadata || !metadata.stripeCustomerId || !metadata.orbCustomerId || !metadata.orbSubscriptionId) {
      const { newStripeCustomerId, newOrbCustomerId, newOrbSubscriptionId } = await provisionBillingCustomer(
        tenant.id,
        session.user.name,
        session.user.email,
      );
      stripeCustomerId = newStripeCustomerId;
      orbCustomerId = newOrbCustomerId;
      orbSubscriptionId = newOrbSubscriptionId;
    } else {
      mustProvisionBillingCustomer = false;
      stripeCustomerId = metadata.stripeCustomerId;
      orbCustomerId = metadata.orbCustomerId;
      orbSubscriptionId = metadata.orbSubscriptionId;
    }

    if (!metadata) {
      throw new Error("Tenant metadata not found");
    }
    assert(typeof stripeCustomerId === "string", "Stripe customer ID not found");
    assert(typeof orbCustomerId === "string", "Orb customer ID not found");

    // Get partition info from ragie
    const { client, partition } = await getRagieClientAndPartition(tenant.id);
    const partitionInfo = await client.partitions.get({ partitionId: partition });

    // Get user count
    const { totalUsers, totalInvites } = await getMembersByTenantId(tenant.id, 1, 10);
    const userCount = Number(totalUsers) + Number(totalInvites);

    // Orb data
    const orb = new Orb({ apiKey: ORB_API_KEY });
    const invoiceRes = await orb.invoices.list({
      external_customer_id: tenant.id,
      status: ["issued", "paid", "synced"],
      limit: 100,
    });
    const invoices = invoiceRes.data;
    const subscriptions = await getSubscriptions(orbCustomerId);
    const hasBillingHistory = subscriptions.length > 0;

    // Get current plan data
    const currentPlan = getCurrentPlan(metadata);

    // Calculate billing status
    const overdueInvoice = getOverdueInvoice(invoices);
    const nextPaymentDate = getNextPaymentDate(invoices);

    // Stripe info
    const defaultPaymentMethod = await getStripeCustomerDefaultPaymentMethod(stripeCustomerId);
    const serializedDefaultPaymentMethod = defaultPaymentMethod
      ? {
          id: defaultPaymentMethod.id,
          card: defaultPaymentMethod.card
            ? {
                brand: defaultPaymentMethod.card.brand,
                last4: defaultPaymentMethod.card.last4,
                exp_month: defaultPaymentMethod.card.exp_month,
                exp_year: defaultPaymentMethod.card.exp_year,
              }
            : null,
          billing_details: defaultPaymentMethod.billing_details,
          created: defaultPaymentMethod.created,
          type: defaultPaymentMethod.type,
        }
      : null;

    return NextResponse.json({
      mustProvisionBillingCustomer,
      billingData: {
        hasBillingHistory,
        overdueInvoice,
        nextPaymentDate,
        defaultPaymentMethod: serializedDefaultPaymentMethod,
        currentPlan,
        invoices,
        subscriptions,
        userCount,
      },
      partitionInfo,
    });
  } catch (error) {
    console.error("Error getting or provisioning billing information:", error);
    return NextResponse.json({ error: "Failed to get or provision billing information" }, { status: 500 });
  }
}
