import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get("contractId");
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!contractId || !sessionId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  try {
    // Verify the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL(`/contracts/${contractId}`, request.url));
    }

    // Activate the contract
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

    if (!contract || contract.status !== "pending_funding") {
      return NextResponse.redirect(new URL(`/contracts/${contractId}`, request.url));
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + contract.target_duration_weeks * 7);

    await supabase
      .from("contracts")
      .update({
        status: "active",
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      })
      .eq("id", contractId);

    // Create deposit ledger entry
    await supabase.from("ledger_entries").insert({
      contract_id: contractId,
      user_id: user.id,
      entry_type: "deposit",
      amount_cents: contract.total_deposit_cents,
      direction: "credit",
      status: "released",
      metadata: {
        stripe_session_id: sessionId,
        stripe_payment_intent: session.payment_intent,
      },
    });

    return NextResponse.redirect(new URL(`/contracts/${contractId}`, request.url));
  } catch (error) {
    console.error("Stripe success handler error:", error);
    return NextResponse.redirect(new URL(`/contracts/${contractId}`, request.url));
  }
}
