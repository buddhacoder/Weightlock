import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInviteByToken } from "@/lib/actions/invites";
import { AcceptInviteClient } from "@/components/accept-invite-client";
import { formatCents } from "@/lib/utils";
import { Scale } from "lucide-react";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Scale className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invite Not Found</h1>
          <p className="text-slate-600">This invite may have expired or already been accepted.</p>
        </div>
      </div>
    );
  }

  const contract = invite.contracts as unknown as {
    id: string;
    start_weight: number;
    target_weight_loss: number;
    target_duration_weeks: number;
    total_deposit_cents: number;
    profiles: { full_name: string; email: string };
  };

  const participantName = contract.profiles?.full_name || contract.profiles?.email || "Someone";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <AcceptInviteClient
        token={token}
        participantName={participantName}
        targetWeightLoss={contract.target_weight_loss}
        durationWeeks={contract.target_duration_weeks}
        totalDeposit={formatCents(contract.total_deposit_cents)}
      />
    </div>
  );
}
