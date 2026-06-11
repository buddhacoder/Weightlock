"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  // Use service client for writes — RLS doesn't grant referees UPDATE
  // on contract_invites or contracts. The token + expiry + null-referee
  // guards are the security boundary.
  const serviceClient = await createServiceClient();

  const { data: invite } = await serviceClient
    .from("contract_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!invite) return { error: "Invite not found or expired" };

  if (new Date(invite.expires_at) < new Date()) {
    await serviceClient
      .from("contract_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return { error: "Invite has expired" };
  }

  const { error: inviteError } = await serviceClient
    .from("contract_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  if (inviteError) return { error: inviteError.message };

  // Only assign referee if slot is still open
  const { error: contractError, count } = await serviceClient
    .from("contracts")
    .update({ referee_id: user.id })
    .eq("id", invite.contract_id)
    .is("referee_id", null);

  if (contractError) return { error: contractError.message };

  await serviceClient
    .from("profiles")
    .update({ role_preference: "referee" })
    .eq("id", user.id)
    .is("role_preference", null);

  revalidatePath("/dashboard");
  revalidatePath("/referee");
  return { success: true, contractId: invite.contract_id };
}
