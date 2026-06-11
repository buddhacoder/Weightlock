import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const event = verifyWebhookSignature(body, signature);
    const supabase = await createServiceClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const contractId = session.metadata?.contract_id;

        if (contractId && session.payment_status === "paid") {
          // Activate contract
          const { data: contract } = await supabase
            .from("contracts")
            .select("*")
            .eq("id", contractId)
            .single();

          if (contract && contract.status === "pending_funding") {
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

            const { error: ledgerError } = await supabase.from("ledger_entries").insert({
              contract_id: contractId,
              user_id: contract.participant_id,
              entry_type: "deposit",
              amount_cents: contract.total_deposit_cents,
              direction: "credit",
              status: "released",
              metadata: {
                stripe_session_id: session.id,
                stripe_payment_intent: session.payment_intent,
              },
            });
            // Unique violation means already processed — not an error
            if (ledgerError && !ledgerError.code?.startsWith("23505")) {
              console.error("Deposit ledger insert failed:", ledgerError);
            }
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object;
        if (account.charges_enabled && account.payouts_enabled) {
          await supabase
            .from("stripe_accounts")
            .update({ onboarding_complete: true })
            .eq("stripe_connect_account_id", account.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }
}
