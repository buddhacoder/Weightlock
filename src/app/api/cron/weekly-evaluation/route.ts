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
    const currentWeek = getCurrentWeekNumber(startDate, now);

    // Evaluate the previous week (we evaluate at the start of the new week)
    const evaluateWeekNum = currentWeek - 1;
    if (evaluateWeekNum < 1) continue;

    // Check for duplicate evaluation
    const { data: existing } = await supabase
      .from("weekly_evaluations")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("week_number", evaluateWeekNum)
      .single();

    if (existing) {
      results.push({ contractId: contract.id, week: evaluateWeekNum, status: "already_evaluated" });
      continue;
    }

    const { weekStart, weekEnd } = getContractWeekBounds(startDate, evaluateWeekNum);

    // Count verified weigh-ins for this week
    const { data: verifiedWeighIns } = await supabase
      .from("weigh_ins")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("verification_status", "approved")
      .gte("submitted_at", weekStart.toISOString())
      .lte("submitted_at", weekEnd.toISOString());

    const verifiedCount = verifiedWeighIns?.length || 0;

    // Get pool balances to check remaining funds
    const { data: ledger } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("contract_id", contract.id);

    const pools = computePoolBalances(contract, (ledger || []) as LedgerEntry[]);

    // Evaluate
    const evaluation = evaluateWeek({
      contract,
      weekNumber: evaluateWeekNum,
      weekStart,
      weekEnd,
      verifiedWeighInCount: verifiedCount,
    });

    // Cap payout to remaining pool
    let actualPayout = evaluation.payoutCents;
    if (evaluation.poolType === "weekly_pool") {
      actualPayout = Math.min(actualPayout, pools.weekly_pool.remaining);
    } else {
      actualPayout = Math.min(actualPayout, pools.penalty_pool.remaining);
    }

    // Create evaluation record
    await supabase.from("weekly_evaluations").insert({
      contract_id: contract.id,
      week_number: evaluateWeekNum,
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
      required_count: contract.weigh_ins_per_week,
      completed_verified_count: verifiedCount,
      outcome: evaluation.outcome,
      payout_cents: actualPayout,
    });

    // Create ledger entry
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
        metadata: { week_number: evaluateWeekNum, outcome: evaluation.outcome },
      });
    }

    // Push notification to participant
    const payoutDollars = (actualPayout / 100).toFixed(2);
    await sendPushNotification(contract.participant_id, {
      title: `Week ${evaluateWeekNum} evaluated`,
      body:
        evaluation.outcome === "compliant"
          ? `Great job! You were compliant this week.`
          : `You missed weigh-ins this week. $${payoutDollars} penalty applied.`,
      data: { contractId: contract.id, weekNumber: evaluateWeekNum, outcome: evaluation.outcome },
    }).catch(console.error);

    // Notify referee via email
    if (contract.referee_id) {
      const { data: refereeProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", contract.referee_id)
        .single();

      if (refereeProfile) {
        await sendNotification(refereeProfile.email, "weekly_payout_triggered", {
          contractId: contract.id,
          weekNumber: evaluateWeekNum,
          amountCents: actualPayout,
        }).catch(console.error);
      }
    }

    results.push({
      contractId: contract.id,
      week: evaluateWeekNum,
      outcome: evaluation.outcome,
      payout: actualPayout,
    });
  }

  return NextResponse.json({ processed: results.length, results });
}
