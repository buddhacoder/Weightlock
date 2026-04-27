import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { detectMilestones, getLowestVerifiedWeight } from "@/lib/engines/milestone-detection";
import { computePoolBalances } from "@/lib/engines/pool-tracker";
import { sendNotification } from "@/lib/notifications";
import type { Contract, Milestone, LedgerEntry } from "@/types/database";

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

    // Get verified weigh-ins
    const { data: weighIns } = await supabase
      .from("weigh_ins")
      .select("weight_lbs, verification_status")
      .eq("contract_id", contract.id);

    const lowestWeight = getLowestVerifiedWeight(weighIns || []);
    if (lowestWeight === null) continue;

    // Update current verified weight
    if (contract.current_verified_weight === null || lowestWeight < contract.current_verified_weight) {
      await supabase
        .from("contracts")
        .update({ current_verified_weight: lowestWeight })
        .eq("id", contract.id);
    }

    // Get milestones
    const { data: milestones } = await supabase
      .from("milestones")
      .select("*")
      .eq("contract_id", contract.id);

    const triggered = detectMilestones({
      contract,
      milestones: (milestones || []) as Milestone[],
      lowestVerifiedWeight: lowestWeight,
    });

    if (triggered.length === 0) continue;

    // Get pool balances
    const { data: ledger } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("contract_id", contract.id);

    const pools = computePoolBalances(contract, (ledger || []) as LedgerEntry[]);
    let remainingMilestonePool = pools.milestone_pool.remaining;

    for (const ms of triggered) {
      const totalPayout = ms.payoutCents + ms.bonusPayoutCents;
      const actualPayout = Math.min(totalPayout, remainingMilestonePool);
      if (actualPayout <= 0) break;

      remainingMilestonePool -= actualPayout;

      // Update or insert milestone
      const existing = (milestones || []).find(
        (m) => (m as Milestone).threshold_lbs === ms.thresholdLbs
      );

      if (existing) {
        await supabase
          .from("milestones")
          .update({
            status: "triggered",
            triggered_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("milestones").insert({
          contract_id: contract.id,
          threshold_lbs: ms.thresholdLbs,
          payout_cents: ms.payoutCents,
          bonus_payout_cents: ms.bonusPayoutCents,
          status: "triggered",
          triggered_at: new Date().toISOString(),
        });
      }

      // Create ledger entry
      await supabase.from("ledger_entries").insert({
        contract_id: contract.id,
        user_id: contract.referee_id,
        entry_type: "milestone_payout",
        pool_type: "milestone_pool",
        amount_cents: ms.payoutCents,
        direction: "debit",
        status: "earned",
        reference_type: "milestone",
        metadata: { threshold_lbs: ms.thresholdLbs },
      });

      // Bonus entry if applicable
      if (ms.bonusPayoutCents > 0) {
        await supabase.from("ledger_entries").insert({
          contract_id: contract.id,
          user_id: contract.referee_id,
          entry_type: "milestone_bonus",
          pool_type: "milestone_pool",
          amount_cents: ms.bonusPayoutCents,
          direction: "debit",
          status: "earned",
          reference_type: "milestone",
          metadata: { threshold_lbs: ms.thresholdLbs, is_bonus: true },
        });
      }

      // Notify
      if (contract.referee_id) {
        const { data: refereeProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", contract.referee_id)
          .single();

        if (refereeProfile) {
          await sendNotification(refereeProfile.email, "milestone_payout_triggered", {
            contractId: contract.id,
            milestone: ms.thresholdLbs,
            amountCents: actualPayout,
          }).catch(console.error);
        }
      }

      results.push({
        contractId: contract.id,
        milestone: ms.thresholdLbs,
        payout: actualPayout,
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
