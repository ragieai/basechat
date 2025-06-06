"use server";

import { Stripe } from "stripe";

import { STRIPE_SECRET_KEY } from "./server/settings";

const stripe = new Stripe(STRIPE_SECRET_KEY);

export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return await stripe.customers.retrieve(customerId);
}

export async function getStripeCustomerDefaultPaymentMethod(customerId: string): Promise<Stripe.PaymentMethod | null> {
  const customer = await getStripeCustomer(customerId);
  if (customer.deleted) {
    throw new Error("Stripe customer has been deleted");
  }

  if (!customer.invoice_settings.default_payment_method) {
    return null;
  }

  return await stripe.paymentMethods.retrieve(customer.invoice_settings.default_payment_method as string);
}

export async function setStripeDefaultInvoicePaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

export async function createStripeSetupIntent(customerId: string) {
  const intent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
  if (!intent.client_secret) {
    throw new Error("Unable to create setupIntent");
  }
  return intent;
}

export async function listStripeCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  return paymentMethods.data;
}

export async function getStripeCustomerDefaultPaymentMethodId(stripeCustomerId: string) {
  const customer = await getStripeCustomer(stripeCustomerId);
  if (customer.deleted) {
    throw new Error("Stripe customer is deleted");
  }

  return await getDefaultPaymentMethodId(customer.invoice_settings.default_payment_method as string);
}

export async function getDefaultPaymentMethodId(
  paymentMethod: Stripe.PaymentMethod | string | null,
): Promise<string | null> {
  if (paymentMethod === null) {
    return null;
  }

  if (typeof paymentMethod === "string") {
    return paymentMethod;
  }

  return paymentMethod.id;
}
