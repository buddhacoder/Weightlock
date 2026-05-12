import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createConnectAccount, createConnectOnboardingLink } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Check if user already has a Stripe Connect account
    const { data: existingAccount } = await supabase
      .from("stripe_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let connectAccountId: string;

    if (existingAccount?.stripe_connect_account_id) {
      connectAccountId = existingAccount.stripe_connect_account_id;
    } else {
      // Create a new Stripe Connect Express account
      const account = await createConnectAccount(user.email!);
      connectAccountId = account.id;

      if (existingAccount) {
        // Update existing record with Connect account ID
        await supabase
          .from("stripe_accounts")
          .update({
            stripe_connect_account_id: connectAccountId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        // Insert new stripe_accounts record
        await supabase.from("stripe_accounts").insert({
          user_id: user.id,
          stripe_connect_account_id: connectAccountId,
          onboarding_complete: false,
        });
      }
    }

    // If already onboarded, redirect to settings
    if (existingAccount?.onboarding_complete) {
      return NextResponse.redirect(
        new URL("/settings?stripe=complete", request.url)
      );
    }

    // Create onboarding link and redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const link = await createConnectOnboardingLink(
      connectAccountId,
      `${baseUrl}/settings?stripe=complete`,
      `${baseUrl}/api/stripe/connect-onboarding`
    );

    return NextResponse.redirect(link.url);
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to start Stripe Connect onboarding" },
      { status: 500 }
    );
  }
}
