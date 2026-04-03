import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCents } from "@/lib/utils";
import { Plus, Scale, DollarSign, TrendingDown, Calendar } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get participant contracts
  const { data: participantContracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("participant_id", user.id)
    .order("created_at", { ascending: false });

  // Get referee contracts
  const { data: refereeContracts } = await supabase
    .from("contracts")
    .select("*, profiles!contracts_participant_id_fkey(full_name, email)")
    .eq("referee_id", user.id)
    .order("created_at", { ascending: false });

  // Get pending weigh-ins for referee
  const { data: pendingWeighIns } = await supabase
    .from("weigh_ins")
    .select("id, contract_id")
    .eq("verification_status", "pending")
    .in(
      "contract_id",
      (refereeContracts || []).map((c) => c.id)
    );

  const contracts = participantContracts || [];
  const refContracts = refereeContracts || [];
  const pendingCount = pendingWeighIns?.length || 0;

  return (
    <AppShell activeRoute="/dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="text-slate-600 mt-1">Manage your weight loss contracts</p>
          </div>
          <Link href="/contracts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Contract
            </Button>
          </Link>
        </div>

        {/* Referee alert */}
        {pendingCount > 0 && (
          <Link href="/referee">
            <Card className="border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-900">
                    {pendingCount} weigh-in{pendingCount > 1 ? "s" : ""} awaiting verification
                  </span>
                </div>
                <Badge variant="warning">Review</Badge>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Participant contracts */}
        {contracts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Your Contracts</h2>
            <div className="grid gap-4">
              {contracts.map((contract) => {
                const weightLost = contract.current_verified_weight
                  ? contract.start_weight - contract.current_verified_weight
                  : 0;
                const progressPct = Math.min(
                  100,
                  (weightLost / contract.target_weight_loss) * 100
                );
                const statusColor =
                  contract.status === "active"
                    ? "success"
                    : contract.status === "completed"
                    ? "default"
                    : "secondary";

                return (
                  <Link key={contract.id} href={`/contracts/${contract.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="py-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">
                                {contract.target_weight_loss} lb Weight Loss
                              </h3>
                              <Badge variant={statusColor}>{contract.status}</Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              {contract.target_duration_weeks} weeks &middot;{" "}
                              {contract.weigh_ins_per_week}x/week
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              {formatCents(contract.total_deposit_cents)}
                            </p>
                            <p className="text-xs text-slate-500">deposited</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {weightLost.toFixed(1)} lb lost
                            </span>
                            <span className="text-slate-600">
                              {contract.target_weight_loss} lb goal
                            </span>
                          </div>
                          <Progress value={progressPct} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Referee contracts */}
        {refContracts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Referee Contracts</h2>
            <div className="grid gap-4">
              {refContracts.map((contract) => {
                const participant = contract.profiles as unknown as { full_name: string; email: string } | null;
                return (
                  <Link key={contract.id} href={`/contracts/${contract.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="py-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {participant?.full_name || participant?.email || "Participant"}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {contract.target_weight_loss} lb goal &middot;{" "}
                              {contract.target_duration_weeks} weeks
                            </p>
                          </div>
                          <Badge variant={contract.status === "active" ? "success" : "secondary"}>
                            {contract.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {contracts.length === 0 && refContracts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Scale className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No contracts yet</h3>
              <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                Create your first weight loss contract to get started with accountability.
              </p>
              <Link href="/contracts/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Contract
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
