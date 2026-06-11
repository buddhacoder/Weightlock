"use server";

import { createClient } from "@/lib/supabase/server";
import { createContractSchema, type CreateContractInput } from "@/lib/validations";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function createContract(input: CreateContractInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Validate pool allocation
  const poolSum =
    data.weekly_pool_cents +
    data.milestone_pool_cents +
    data.penalty_pool_cents +
    data.completion_pool_cents;

  if (poolSum !== data.total_deposit_cents) {
    return { error: "Pool allocations must equal total deposit" };
  }

  // Create contract
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      participant_id: user.id,
      status: "pending_funding",
      start_weight: data.start_weight,
      current_verified_weight: data.start_weight,
      target_weight_loss: data.target_weight_loss,
      target_duration_weeks: data.target_duration_weeks,
      weigh_ins_per_week: data.weigh_ins_per_week,
      total_deposit_cents: data.total_deposit_cents,
      weekly_pool_cents: data.weekly_pool_cents,
      milestone_pool_cents: data.milestone_pool_cents,
      penalty_pool_cents: data.penalty_pool_cents,
      completion_pool_cents: data.completion_pool_cents,
      weekly_reward_cents: data.weekly_reward_cents,
      penalty_cents: data.penalty_cents,
      milestone_interval_lbs: data.milestone_interval_lbs,
      milestone_payout_cents: data.milestone_payout_cents,
      milestone_bonus_interval_lbs: data.milestone_bonus_interval_lbs,
      milestone_bonus_cents: data.milestone_bonus_cents,
      timezone: data.timezone,
    })
    .select()
    .single();

  if (contractError) return { error: contractError.message };

  // Create milestones based on contract's configured intervals
  const milestones = [];
  const interval = data.milestone_interval_lbs;
  const bonusInterval = data.milestone_bonus_interval_lbs;
  for (let threshold = interval; threshold <= data.target_weight_loss; threshold += interval) {
    const isBonus = threshold % bonusInterval === 0;
    milestones.push({
      contract_id: contract.id,
      threshold_lbs: threshold,
      payout_cents: data.milestone_payout_cents,
      bonus_payout_cents: isBonus ? data.milestone_bonus_cents : 0,
      status: "pending",
    });
  }

  if (milestones.length > 0) {
    const { error: milestonesError } = await supabase
      .from("milestones")
      .insert(milestones);
    if (milestonesError) {
      return { error: milestonesError.message };
    }
  }

  // Create invite for referee
  const { data: invite, error: inviteError } = await supabase
    .from("contract_invites")
    .insert({
      contract_id: contract.id,
      referee_email: data.referee_email,
    })
    .select()
    .single();

  if (inviteError) {
    console.error("Failed to create invite:", inviteError);
  } else {
    // Get participant name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const emailResult = await sendNotification(data.referee_email, "referee_invited", {
      participantName: profile?.full_name || user.email,
      inviteToken: invite.token,
      contractId: contract.id,
    }).catch(() => ({ success: false }));

    await supabase.from("notifications").insert({
      user_id: user.id,
      contract_id: contract.id,
      type: "referee_invited",
      payload: { referee_email: data.referee_email },
      status: emailResult.success ? "sent" : "failed",
      sent_at: emailResult.success ? new Date().toISOString() : null,
    });
  }

  revalidatePath("/dashboard");
  return { success: true, contractId: contract.id };
}

export async function getContract(contractId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  return data;
}

export async function getContractsForUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get contracts where user is participant
  const { data: participantContracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("participant_id", user.id)
    .order("created_at", { ascending: false });

  // Get contracts where user is referee
  const { data: refereeContracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("referee_id", user.id)
    .order("created_at", { ascending: false });

  return {
    asParticipant: participantContracts || [],
    asReferee: refereeContracts || [],
  };
}

export async function activateContract(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .eq("participant_id", user.id)
    .single();

  if (!contract) return { error: "Contract not found" };
  if (contract.status !== "pending_funding") return { error: "Contract is not pending funding" };

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + contract.target_duration_weeks * 7);

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "active",
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    })
    .eq("id", contractId);

  if (error) return { error: error.message };

  // Create deposit ledger entry
  await supabase.from("ledger_entries").insert({
    contract_id: contractId,
    user_id: user.id,
    entry_type: "deposit",
    amount_cents: contract.total_deposit_cents,
    direction: "credit",
    status: "released",
    metadata: { source: "stripe_checkout" },
  });

  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function getContractWithDetails(contractId: string) {
  const supabase = await createClient();

  const [
    { data: contract },
    { data: weighIns },
    { data: milestones },
    { data: evaluations },
    { data: ledger },
    { data: invite },
  ] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", contractId).single(),
    supabase
      .from("weigh_ins")
      .select("*")
      .eq("contract_id", contractId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("milestones")
      .select("*")
      .eq("contract_id", contractId)
      .order("threshold_lbs", { ascending: true }),
    supabase
      .from("weekly_evaluations")
      .select("*")
      .eq("contract_id", contractId)
      .order("week_number", { ascending: true }),
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false }),
    supabase
      .from("contract_invites")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return {
    contract,
    weighIns: weighIns || [],
    milestones: milestones || [],
    evaluations: evaluations || [],
    ledger: ledger || [],
    invite,
  };
}
