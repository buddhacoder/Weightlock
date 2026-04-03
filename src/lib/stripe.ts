import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
});

export async function createCheckoutSession({
  contractId,
  amountCents,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  contractId: string;
  amountCents: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "WeightLock Contract Deposit",
            description: `Contract funding for weight loss commitment`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      contract_id: contractId,
      type: "contract_deposit",
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

export async function createConnectAccount(email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
  });

  return account;
}

export async function createConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

  return link;
}

export async function createTransfer({
  amountCents,
  destinationAccountId,
  contractId,
  description,
}: {
  amountCents: number;
  destinationAccountId: string;
  contractId: string;
  description: string;
}) {
  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: destinationAccountId,
    metadata: {
      contract_id: contractId,
    },
    description,
  });

  return transfer;
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
