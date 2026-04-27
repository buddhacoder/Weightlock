"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getInviteByToken(token: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contract_invites")
    .select("*, contracts(id, participant_id, start_weight, target_weight_loss, target_duration_weeks, total_deposit_cents, profiles!contracts_participant_id_fkey(full_name, email))")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  return data;
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get invite
  const { data: invite } = await supabase
    .from("contract_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!invite) return { error: "Invite not found or expired" };

  // Check expiration
  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("contract_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return { error: "Invite has expired" };
  }

  // Update invite status
  const { error: inviteError } = await supabase
    .from("contract_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  if (inviteError) return { error: inviteError.message };

  // Assign referee to contract
  const { error: contractError } = await supabase
    .from("contracts")
    .update({ referee_id: user.id })
    .eq("id", invite.contract_id);

  if (contractError) return { error: contractError.message };

  // Update profile role_preference if not set
  await supabase
    .from("profiles")
    .update({ role_preference: "referee" })
    .eq("id", user.id)
    .is("role_preference", null);

  revalidatePath("/dashboard");
  revalidatePath("/referee");
  return { success: true, contractId: invite.contract_id };
}
