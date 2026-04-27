import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get("contractId");
  if (!contractId) {
    return NextResponse.json({ error: "Missing contractId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .eq("participant_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.status !== "pending_funding") {
    return NextResponse.redirect(new URL(`/contracts/${contractId}`, request.url));
  }

  try {
    const session = await createCheckoutSession({
      contractId,
      amountCents: contract.total_deposit_cents,
      customerEmail: user.email!,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success?contractId=${contractId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/contracts/${contractId}`,
    });

    return NextResponse.redirect(session.url!);
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
