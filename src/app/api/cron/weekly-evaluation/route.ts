import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { evaluateWeek, getContractWeekBounds, getCurrentWeekNumber } from "@/lib/engines/weekly-evaluation";
import { computePoolBalances } from "@/lib/engines/pool-tracker";
import { sendNotification } from "@/lib/notifications";
import { sendPushNotification } from "@/lib/push";
import type { Contract, LedgerEntry } from "@/types/database";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Get all active contracts
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("status", "active");

  if (error || !contracts) {
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }

  const results = [];

  for (const rawContract of contracts) {
    const contract = rawContract as Contract;
    if (!contract.start_date) continue;

    const now = new Date();
    const startDate = new Date(contract.start_date);
    const currentWeek = getCurrentWeekNumber(startDate, now, contract.timezone);
    const maxWeek = currentWeek - 1;
    if (maxWeek < 1) continue;

    // Catch-up loop: evaluate all weeks from 1 through currentWeek-1,
    // skipping any already processed (idempotent via duplicate check + unique constraint)
    for (let weekNum = 1; weekNum <= maxWeek; weekNum++) {
      const { data: existing } = await supabase
        .from("weekly_evaluations")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("week_number", weekNum)
        .single();

      if (existing) continue;

      const { weekStart, weekEnd } = getContractWeekBounds(startDate, weekNum, contract.timezone);

      const { data: verifiedWeighIns } = await supabase
        .from("weigh_ins")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("verification_status", "approved")
        .gte("submitted_at", weekStart.toISOString())
        .lte("submitted_at", weekEnd.toISOString());

      const verifiedCount = verifiedWeighIns?.length || 0;

      const { data: ledger } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("contract_id", contract.id);

      const pools = computePoolBalances(contract, (ledger || []) as LedgerEntry[]);

      const evaluation = evaluateWeek({
        contract,
        weekNumber: weekNum,
        weekStart,
        weekEnd,
        verifiedWeighInCount: verifiedCount,
      });

      let actualPayout = evaluation.payoutCents;
      if (evaluation.poolType === "weekly_pool") {
        actualPayout = Math.min(actualPayout, pools.weekly_pool.remaining);
      } else {
        actualPayout = Math.min(actualPayout, pools.penalty_pool.remaining);
      }

      await supabase.from("weekly_evaluations").insert({
        contract_id: contract.id,
        week_number: weekNum,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
        required_count: contract.weigh_ins_per_week,
        completed_verified_count: verifiedCount,
        outcome: evaluation.outcome,
        payout_cents: actualPayout,
      });

      if (actualPayout > 0) {
        await supabase.from("ledger_entries").insert({
          contract_id: contract.id,
          user_id: contract.referee_id,
          entry_type: evaluation.entryType,
          pool_type: evaluation.poolType,
          amount_cents: actualPayout,
          direction: "debit",
          status: "earned",
          reference_type: "weekly_evaluation",
          metadata: { week_number: weekNum, outcome: evaluation.outcome },
        });
      }

      const payoutDollars = (actualPayout / 100).toFixed(2);
      await sendPushNotification(contract.participant_id, {
        title: `Week ${weekNum} evaluated`,
        body:
          evaluation.outcome === "compliant"
            ? `Great job! You were compliant this week.`
            : `You missed weigh-ins this week. $${payoutDollars} penalty applied.`,
        data: { contractId: contract.id, weekNumber: weekNum, outcome: evaluation.outcome },
      }).catch(console.error);

      if (contract.referee_id) {
        const { data: refereeProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", contract.referee_id)
          .single();

        if (refereeProfile) {
          await sendNotification(refereeProfile.email, "weekly_payout_triggered", {
            contractId: contract.id,
            weekNumber: weekNum,
            amountCents: actualPayout,
          }).catch(console.error);
        }
      }

      results.push({
        contractId: contract.id,
        week: weekNum,
        outcome: evaluation.outcome,
        payout: actualPayout,
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
