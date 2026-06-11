"use server";

import { createClient } from "@/lib/supabase/server";
import { submitWeighInSchema, verifyWeighInSchema } from "@/lib/validations";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function submitWeighIn(input: {
  contract_id: string;
  weight_lbs: number;
  note?: string;
  photo_path?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = submitWeighInSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify user owns this contract
  const { data: contract } = await supabase
    .from("contracts")
    .select("*, profiles!contracts_referee_id_fkey(email)")
    .eq("id", parsed.data.contract_id)
    .eq("participant_id", user.id)
    .single();

  if (!contract) return { error: "Contract not found" };
  if (contract.status !== "active") return { error: "Contract is not active" };

  const { data: weighIn, error } = await supabase
    .from("weigh_ins")
    .insert({
      contract_id: parsed.data.contract_id,
      participant_id: user.id,
      weight_lbs: parsed.data.weight_lbs,
      note: parsed.data.note || null,
      photo_path: input.photo_path || null,
      verification_status: "pending",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Notify referee
  if (contract.referee_id) {
    const { data: refereeProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", contract.referee_id)
      .single();

    const { data: participantProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (refereeProfile) {
      const emailResult = await sendNotification(refereeProfile.email, "weighin_awaiting_verification", {
        participantName: participantProfile?.full_name || user.email,
        weight: parsed.data.weight_lbs,
        contractId: contract.id,
      }).catch(() => ({ success: false }));

      await supabase.from("notifications").insert({
        user_id: contract.referee_id,
        contract_id: contract.id,
        type: "weighin_awaiting_verification",
        payload: { weigh_in_id: weighIn.id, weight: parsed.data.weight_lbs },
        status: emailResult.success ? "sent" : "failed",
        sent_at: emailResult.success ? new Date().toISOString() : null,
      });
    }
  }

  revalidatePath(`/contracts/${parsed.data.contract_id}`);
  return { success: true, weighInId: weighIn.id };
}

export async function verifyWeighIn(input: {
  weigh_in_id: string;
  status: "approved" | "rejected";
  rejection_reason?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = verifyWeighInSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Get weigh-in and verify referee access
  const { data: weighIn } = await supabase
    .from("weigh_ins")
    .select("*, contracts!inner(*)")
    .eq("id", parsed.data.weigh_in_id)
    .single();

  if (!weighIn) return { error: "Weigh-in not found" };

  const contract = weighIn.contracts as unknown as { referee_id: string; id: string; participant_id: string; start_weight: number };
  if (contract.referee_id !== user.id) {
    return { error: "Not authorized" };
  }

  if (weighIn.verification_status !== "pending") {
    return { error: "Weigh-in already verified" };
  }

  // Update weigh-in
  const { error } = await supabase
    .from("weigh_ins")
    .update({
      verification_status: parsed.data.status,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejection_reason: parsed.data.rejection_reason || null,
    })
    .eq("id", parsed.data.weigh_in_id);

  if (error) return { error: error.message };

  // If approved, update current verified weight on contract
  if (parsed.data.status === "approved") {
    const { data: allApproved } = await supabase
      .from("weigh_ins")
      .select("weight_lbs")
      .eq("contract_id", contract.id)
      .eq("verification_status", "approved")
      .order("weight_lbs", { ascending: true })
      .limit(1);

    const lowestWeight = allApproved?.[0]?.weight_lbs ?? weighIn.weight_lbs;
    const currentLowest = Math.min(lowestWeight, weighIn.weight_lbs);

    await supabase
      .from("contracts")
      .update({ current_verified_weight: currentLowest })
      .eq("id", contract.id);
  }

  // Notify participant
  const { data: participantProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", contract.participant_id)
    .single();

  if (participantProfile) {
    const notifType = parsed.data.status === "approved" ? "weighin_approved" : "weighin_rejected";
    const emailResult = await sendNotification(participantProfile.email, notifType as "weighin_approved" | "weighin_rejected", {
      weight: weighIn.weight_lbs,
      contractId: contract.id,
      reason: parsed.data.rejection_reason,
    }).catch(() => ({ success: false }));

    await supabase.from("notifications").insert({
      user_id: contract.participant_id,
      contract_id: contract.id,
      type: notifType,
      payload: { weigh_in_id: weighIn.id },
      status: emailResult.success ? "sent" : "failed",
      sent_at: emailResult.success ? new Date().toISOString() : null,
    });
  }

  revalidatePath(`/contracts/${contract.id}`);
  revalidatePath("/referee");
  return { success: true };
}

export async function getPendingWeighIns() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("weigh_ins")
    .select("*, contracts!inner(id, participant_id, start_weight, profiles!contracts_participant_id_fkey(full_name, email))")
    .eq("contracts.referee_id", user.id)
    .eq("verification_status", "pending")
    .order("submitted_at", { ascending: false });

  return data || [];
}

export async function getWeighInPhotoUrl(photoPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.storage
    .from("weighin-photos")
    .createSignedUrl(photoPath, 60 * 60); // 1 hour expiry

  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function uploadWeighInPhoto(contractId: string, file: File) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const fileName = `${user.id}/${contractId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("weighin-photos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) return { error: error.message };
  return { success: true, path: data.path };
}
