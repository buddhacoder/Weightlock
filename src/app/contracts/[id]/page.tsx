import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatCents, formatWeight } from "@/lib/utils";
import { computePoolBalances } from "@/lib/engines/pool-tracker";
import { WeightChart } from "@/components/weight-chart";
import { MilestoneTracker } from "@/components/milestone-tracker";
import type { Contract, WeighIn, Milestone, WeeklyEvaluation, LedgerEntry } from "@/types/database";
import {
  Scale,
  DollarSign,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  Wallet,
  History,
  Plus,
} from "lucide-react";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: contract },
    { data: weighIns },
    { data: milestones },
    { data: evaluations },
    { data: ledger },
  ] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", id).single(),
    supabase.from("weigh_ins").select("*").eq("contract_id", id).order("submitted_at", { ascending: true }),
    supabase.from("milestones").select("*").eq("contract_id", id).order("threshold_lbs", { ascending: true }),
    supabase.from("weekly_evaluations").select("*").eq("contract_id", id).order("week_number", { ascending: true }),
    supabase.from("ledger_entries").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
  ]);

  if (!contract) redirect("/dashboard");

  const c = contract as Contract;
  const isParticipant = c.participant_id === user.id;
  const weightLost = c.current_verified_weight
    ? c.start_weight - c.current_verified_weight
    : 0;
  const progressPct = Math.min(100, (weightLost / c.target_weight_loss) * 100);

  const pools = computePoolBalances(c, (ledger || []) as LedgerEntry[]);

  // Weekly stats
  const approvedThisWeek = (weighIns || []).filter((w) => {
    const wi = w as WeighIn;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return wi.verification_status === "approved" && new Date(wi.submitted_at) >= weekAgo;
  }).length;

  const pendingCount = (weighIns || []).filter(
    (w) => (w as WeighIn).verification_status === "pending"
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {c.target_weight_loss} lb Weight Loss Contract
              </h1>
              <Badge
                variant={
                  c.status === "active"
                    ? "success"
                    : c.status === "completed"
                    ? "default"
                    : "secondary"
                }
              >
                {c.status}
              </Badge>
            </div>
            <p className="text-slate-600 mt-1">
              {c.start_weight} lb → {c.start_weight - c.target_weight_loss} lb &middot;{" "}
              {c.target_duration_weeks} weeks
            </p>
          </div>
          <div className="flex gap-2">
            {isParticipant && c.status === "active" && (
              <Link href={`/contracts/${id}/weigh-in`}>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Log Weigh-In
                </Button>
              </Link>
            )}
            <Link href={`/contracts/${id}/wallet`}>
              <Button variant="outline" className="gap-2">
                <Wallet className="h-4 w-4" />
                Wallet
              </Button>
            </Link>
            <Link href={`/contracts/${id}/history`}>
              <Button variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                History
              </Button>
            </Link>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingDown className="h-4 w-4" />
                Weight Lost
              </div>
              <p className="text-2xl font-bold text-emerald-600">{weightLost.toFixed(1)} lb</p>
              <p className="text-xs text-slate-500">of {c.target_weight_loss} lb goal</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Scale className="h-4 w-4" />
                Current Weight
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {c.current_verified_weight?.toFixed(1) || c.start_weight.toFixed(1)} lb
              </p>
              <p className="text-xs text-slate-500">verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <CheckCircle className="h-4 w-4" />
                This Week
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {approvedThisWeek}/{c.weigh_ins_per_week}
              </p>
              <p className="text-xs text-slate-500">
                weigh-ins verified{pendingCount > 0 ? ` (${pendingCount} pending)` : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
                <DollarSign className="h-4 w-4" />
                At Risk This Week
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCents(Math.min(3000, pools.weekly_pool.remaining))}
              </p>
              <p className="text-xs text-slate-500">
                {formatCents(pools.total_remaining)} total locked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">{weightLost.toFixed(1)} lb lost</span>
              <span className="text-slate-600">{c.target_weight_loss} lb goal</span>
            </div>
            <Progress value={progressPct} className="h-4" />
            <p className="text-xs text-slate-500 mt-2 text-center">
              {progressPct.toFixed(0)}% complete
            </p>
          </CardContent>
        </Card>

        {/* Chart + Milestones */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weight Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightChart
                weighIns={(weighIns || []) as WeighIn[]}
                startWeight={c.start_weight}
                targetWeight={c.start_weight - c.target_weight_loss}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneTracker milestones={(milestones || []) as Milestone[]} />
            </CardContent>
          </Card>
        </div>

        {/* Pool summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fund Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Weekly Pool", pool: pools.weekly_pool, color: "bg-blue-500" },
                { label: "Milestone Pool", pool: pools.milestone_pool, color: "bg-emerald-500" },
                { label: "Penalty Pool", pool: pools.penalty_pool, color: "bg-red-500" },
                { label: "Completion Pool", pool: pools.completion_pool, color: "bg-purple-500" },
              ].map((p) => (
                <div key={p.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{p.label}</span>
                    <span className="font-medium">{formatCents(p.pool.remaining)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full`}
                      style={{
                        width: `${p.pool.allocated > 0 ? (p.pool.remaining / p.pool.allocated) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatCents(p.pool.spent)} released of {formatCents(p.pool.allocated)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Funding CTA for pending_funding contracts */}
        {c.status === "pending_funding" && isParticipant && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-6 text-center">
              <h3 className="text-lg font-semibold text-emerald-900 mb-2">Fund Your Contract</h3>
              <p className="text-sm text-emerald-700 mb-4">
                Deposit {formatCents(c.total_deposit_cents)} to activate your contract.
              </p>
              <Link href={`/api/stripe/checkout?contractId=${id}`}>
                <Button variant="success" size="lg">
                  Pay {formatCents(c.total_deposit_cents)} to Start
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
