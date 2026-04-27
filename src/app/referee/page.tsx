import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import { VerificationCard } from "@/components/verification-card";
import type { Contract, WeighIn, LedgerEntry } from "@/types/database";
import { Users, DollarSign, CheckCircle, Clock } from "lucide-react";

export default async function RefereePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get referee contracts
  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, profiles!contracts_participant_id_fkey(full_name, email)")
    .eq("referee_id", user.id)
    .order("created_at", { ascending: false });

  // Get pending weigh-ins across all referee contracts
  const contractIds = (contracts || []).map((c) => c.id);
  let pendingWeighIns: Array<WeighIn & { participant_name?: string; participant_email?: string; start_weight?: number }> = [];
  let totalEarned = 0;

  if (contractIds.length > 0) {
    const { data: pending } = await supabase
      .from("weigh_ins")
      .select("*")
      .in("contract_id", contractIds)
      .eq("verification_status", "pending")
      .order("submitted_at", { ascending: false });

    pendingWeighIns = (pending || []).map((wi) => {
      const contract = (contracts || []).find((c) => c.id === wi.contract_id);
      const participant = contract?.profiles as unknown as { full_name: string; email: string } | null;
      return {
        ...wi,
        participant_name: participant?.full_name || undefined,
        participant_email: participant?.email || undefined,
        start_weight: contract?.start_weight,
      };
    }) as typeof pendingWeighIns;

    // Get ledger entries for earnings
    const { data: ledger } = await supabase
      .from("ledger_entries")
      .select("*")
      .in("contract_id", contractIds)
      .eq("direction", "debit")
      .in("status", ["earned", "released"]);

    totalEarned = (ledger || []).reduce((sum, e) => sum + e.amount_cents, 0);
  }

  const activeContracts = (contracts || []).filter((c) => c.status === "active");

  return (
    <AppShell activeRoute="/referee">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referee Panel</h1>
          <p className="text-slate-600 mt-1">Verify weigh-ins and track your earnings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Users className="h-5 w-5 text-slate-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{activeContracts.length}</p>
              <p className="text-xs text-slate-500">Active Contracts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <DollarSign className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-600">{formatCents(totalEarned)}</p>
              <p className="text-xs text-slate-500">Total Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-600">{pendingWeighIns.length}</p>
              <p className="text-xs text-slate-500">Pending Reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending weigh-ins */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Pending Verification</h2>
          {pendingWeighIns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-600">All caught up! No weigh-ins to verify.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingWeighIns.map((wi) => (
                <VerificationCard
                  key={wi.id}
                  weighIn={wi}
                  participantName={wi.participant_name || wi.participant_email || "Participant"}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contract overview */}
        {activeContracts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Your Contracts</h2>
            <div className="space-y-3">
              {activeContracts.map((contract) => {
                const participant = contract.profiles as unknown as { full_name: string; email: string } | null;
                return (
                  <Card key={contract.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {participant?.full_name || participant?.email || "Participant"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {contract.target_weight_loss} lb goal &middot;{" "}
                            {contract.weigh_ins_per_week}x/week
                          </p>
                        </div>
                        <Badge variant="success">{contract.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(contracts || []).length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No referee contracts</h3>
              <p className="text-slate-600">
                You&apos;ll see contracts here when someone invites you as their referee.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
