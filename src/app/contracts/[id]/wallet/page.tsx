import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCents } from "@/lib/utils";
import { computePoolBalances } from "@/lib/engines/pool-tracker";
import type { Contract, LedgerEntry } from "@/types/database";
import { ArrowLeft, DollarSign, TrendingUp, Lock, Unlock } from "lucide-react";

export default async function WalletPage({
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

  const [{ data: contract }, { data: ledger }] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", id).single(),
    supabase.from("ledger_entries").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
  ]);

  if (!contract) redirect("/dashboard");

  const c = contract as Contract;
  const isParticipant = c.participant_id === user.id;
  const pools = computePoolBalances(c, (ledger || []) as LedgerEntry[]);

  // Compute referee earnings
  const refereeEntries = ((ledger || []) as LedgerEntry[]).filter(
    (e) => e.direction === "debit" && (e.status === "earned" || e.status === "released")
  );
  const totalEarned = refereeEntries.reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/contracts/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contract
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Lock className="h-5 w-5 text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{formatCents(pools.total_remaining)}</p>
              <p className="text-xs text-slate-500">Locked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Unlock className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-emerald-600">{formatCents(pools.total_released)}</p>
              <p className="text-xs text-slate-500">Released</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <DollarSign className="h-5 w-5 text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{formatCents(pools.total_deposited)}</p>
              <p className="text-xs text-slate-500">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Pool details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pool Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Weekly Compliance", pool: pools.weekly_pool, color: "bg-blue-500" },
              { label: "Milestones", pool: pools.milestone_pool, color: "bg-emerald-500" },
              { label: "Penalties", pool: pools.penalty_pool, color: "bg-red-500" },
              { label: "Completion", pool: pools.completion_pool, color: "bg-purple-500" },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{p.label}</span>
                  <span className="text-slate-600">
                    {formatCents(p.pool.remaining)} of {formatCents(p.pool.allocated)}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${p.color} rounded-full transition-all`}
                    style={{
                      width: `${p.pool.allocated > 0 ? (p.pool.remaining / p.pool.allocated) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatCents(p.pool.spent)} released
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {(ledger || []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {((ledger || []) as LedgerEntry[]).slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {entry.entry_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          entry.direction === "credit" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {entry.direction === "credit" ? "+" : "-"}
                        {formatCents(entry.amount_cents)}
                      </p>
                      <Badge variant={entry.status === "released" ? "success" : "secondary"} className="text-xs">
                        {entry.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
