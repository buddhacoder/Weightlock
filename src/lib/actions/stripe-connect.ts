"use server";

import { createClient } from "@/lib/supabase/server";

export async function getStripeConnectStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hasAccount: false, onboardingComplete: false };
  }

  const { data: stripeAccount } = await supabase
    .from("stripe_accounts")
    .select("stripe_connect_account_id, onboarding_complete")
    .eq("user_id", user.id)
    .single();

  return {
    hasAccount: !!stripeAccount?.stripe_connect_account_id,
    onboardingComplete: stripeAccount?.onboarding_complete ?? false,
  };
}
