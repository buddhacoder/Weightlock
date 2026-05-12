import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createTransfer } from "@/lib/stripe";
import type { LedgerEntry } from "@/types/database";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Find all ledger entries with status "earned" (referee payouts not yet released)
  const { data: earnedEntries, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("status", "earned")
    .eq("direction", "debit");

  if (error) {
    console.error("Failed to fetch earned ledger entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger entries" },
      { status: 500 }
    );
  }

  if (!earnedEntries || earnedEntries.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const entries = earnedEntries as LedgerEntry[];

  // Group entries by referee (user_id) and contract
  const grouped = new Map<
    string,
    { contractId: string; userId: string; totalCents: number; entryIds: string[] }
  >();

  for (const entry of entries) {
    if (!entry.user_id) continue;

    const key = `${entry.user_id}:${entry.contract_id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.totalCents += entry.amount_cents;
      existing.entryIds.push(entry.id);
    } else {
      grouped.set(key, {
        contractId: entry.contract_id,
        userId: entry.user_id,
        totalCents: entry.amount_cents,
        entryIds: [entry.id],
      });
    }
  }

  const results: Array<{
    userId: string;
    contractId: string;
    amountCents: number;
    status: string;
  }> = [];

  for (const [, group] of grouped) {
    // Check if referee has a completed Stripe Connect account
    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_connect_account_id, onboarding_complete")
      .eq("user_id", group.userId)
      .single();

    if (
      !stripeAccount?.stripe_connect_account_id ||
      !stripeAccount.onboarding_complete
    ) {
      results.push({
        userId: group.userId,
        contractId: group.contractId,
        amountCents: group.totalCents,
        status: "skipped_no_connect_account",
      });
      continue;
    }

    try {
      // Execute the Stripe transfer
      await createTransfer({
        amountCents: group.totalCents,
        destinationAccountId: stripeAccount.stripe_connect_account_id,
        contractId: group.contractId,
        description: `WeightLock payout for contract ${group.contractId}`,
      });

      // Update all entries in this group to "released"
      await supabase
        .from("ledger_entries")
        .update({ status: "released" })
        .in("id", group.entryIds);

      results.push({
        userId: group.userId,
        contractId: group.contractId,
        amountCents: group.totalCents,
        status: "transferred",
      });
    } catch (transferError) {
      console.error(
        `Transfer failed for user ${group.userId}, contract ${group.contractId}:`,
        transferError
      );

      // Mark entries as failed so they can be retried or investigated
      await supabase
        .from("ledger_entries")
        .update({ status: "failed" })
        .in("id", group.entryIds);

      results.push({
        userId: group.userId,
        contractId: group.contractId,
        amountCents: group.totalCents,
        status: "transfer_failed",
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
