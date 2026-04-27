import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkCompletion } from "@/lib/engines/completion-check";
import { getLowestVerifiedWeight } from "@/lib/engines/milestone-detection";
import { sendNotification } from "@/lib/notifications";
import type { Contract } from "@/types/database";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("status", "active");

  if (!contracts) {
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }

  const results = [];

  for (const rawContract of contracts) {
    const contract = rawContract as Contract;

    const { data: weighIns } = await supabase
      .from("weigh_ins")
      .select("weight_lbs, verification_status")
      .eq("contract_id", contract.id);

    const lowestWeight = getLowestVerifiedWeight(weighIns || []);
    if (lowestWeight === null) continue;

    const result = checkCompletion({
      contract,
      lowestVerifiedWeight: lowestWeight,
    });

    if (!result.isComplete) continue;

    // Check if completion already processed
    const { data: existingCompletion } = await supabase
      .from("ledger_entries")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("entry_type", "completion_payout")
      .single();

    if (existingCompletion) continue; // Already processed

    // Mark contract complete
    await supabase
      .from("contracts")
      .update({
        status: "completed",
        current_verified_weight: lowestWeight,
        end_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", contract.id);

    // Create completion ledger entry
    await supabase.from("ledger_entries").insert({
      contract_id: contract.id,
      user_id: contract.referee_id,
      entry_type: "completion_payout",
      pool_type: "completion_pool",
      amount_cents: result.completionPayoutCents,
      direction: "debit",
      status: "earned",
      metadata: {
        actual_weight_loss: result.actualWeightLoss,
        target_weight_loss: result.targetWeightLoss,
        lowest_verified_weight: lowestWeight,
      },
    });

    // Notify both parties
    const { data: participantProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", contract.participant_id)
      .single();

    if (participantProfile) {
      await sendNotification(participantProfile.email, "completion_reached", {
        contractId: contract.id,
        amountCents: result.completionPayoutCents,
      }).catch(console.error);
    }

    if (contract.referee_id) {
      const { data: refereeProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", contract.referee_id)
        .single();

      if (refereeProfile) {
        await sendNotification(refereeProfile.email, "completion_reached", {
          contractId: contract.id,
          amountCents: result.completionPayoutCents,
        }).catch(console.error);
      }
    }

    results.push({
      contractId: contract.id,
      weightLoss: result.actualWeightLoss,
      payout: result.completionPayoutCents,
    });
  }

  return NextResponse.json({ processed: results.length, results });
}
