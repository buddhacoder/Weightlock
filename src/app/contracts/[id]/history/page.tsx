import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import type { WeighIn, WeeklyEvaluation, Milestone, LedgerEntry } from "@/types/database";
import { ArrowLeft, Scale, Calendar, Target, DollarSign } from "lucide-react";

type HistoryEvent = {
  id: string;
  type: "weighin" | "evaluation" | "milestone" | "ledger";
  timestamp: string;
  data: WeighIn | WeeklyEvaluation | Milestone | LedgerEntry;
};

export default async function HistoryPage({
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
    { data: evaluations },
    { data: milestones },
    { data: ledger },
  ] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", id).single(),
    supabase.from("weigh_ins").select("*").eq("contract_id", id).order("submitted_at", { ascending: false }),
    supabase.from("weekly_evaluations").select("*").eq("contract_id", id).order("processed_at", { ascending: false }),
    supabase.from("milestones").select("*").eq("contract_id", id).eq("status", "triggered").order("triggered_at", { ascending: false }),
    supabase.from("ledger_entries").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
  ]);

  if (!contract) redirect("/dashboard");

  // Build unified timeline
  const events: HistoryEvent[] = [
    ...(weighIns || []).map((w) => ({
      id: `wi-${w.id}`,
      type: "weighin" as const,
      timestamp: w.submitted_at,
      data: w as WeighIn,
    })),
    ...(evaluations || []).map((e) => ({
      id: `ev-${e.id}`,
      type: "evaluation" as const,
      timestamp: e.processed_at,
      data: e as WeeklyEvaluation,
    })),
    ...(milestones || []).map((m) => ({
      id: `ms-${m.id}`,
      type: "milestone" as const,
      timestamp: m.triggered_at!,
      data: m as Milestone,
    })),
    ...(ledger || []).map((l) => ({
      id: `le-${l.id}`,
      type: "ledger" as const,
      timestamp: l.created_at,
      data: l as LedgerEntry,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

        <h1 className="text-2xl font-bold text-slate-900">Contract History</h1>

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No activity yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {event.type === "weighin" && <Scale className="h-4 w-4 text-blue-500" />}
                      {event.type === "evaluation" && <Calendar className="h-4 w-4 text-purple-500" />}
                      {event.type === "milestone" && <Target className="h-4 w-4 text-emerald-500" />}
                      {event.type === "ledger" && <DollarSign className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {event.type === "weighin" && (() => {
                        const wi = event.data as WeighIn;
                        return (
                          <>
                            <p className="text-sm font-medium text-slate-900">
                              Weigh-in: {wi.weight_lbs} lb
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  wi.verification_status === "approved"
                                    ? "success"
                                    : wi.verification_status === "rejected"
                                    ? "destructive"
                                    : "warning"
                                }
                              >
                                {wi.verification_status}
                              </Badge>
                              {wi.note && <span className="text-xs text-slate-500">{wi.note}</span>}
                            </div>
                          </>
                        );
                      })()}
                      {event.type === "evaluation" && (() => {
                        const ev = event.data as WeeklyEvaluation;
                        return (
                          <>
                            <p className="text-sm font-medium text-slate-900">
                              Week {ev.week_number} Evaluation
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={ev.outcome === "compliant" ? "success" : "destructive"}>
                                {ev.outcome}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {ev.completed_verified_count}/{ev.required_count} weigh-ins &middot;{" "}
                                {formatCents(ev.payout_cents)} payout
                              </span>
                            </div>
                          </>
                        );
                      })()}
                      {event.type === "milestone" && (() => {
                        const ms = event.data as Milestone;
                        return (
                          <p className="text-sm font-medium text-slate-900">
                            {ms.threshold_lbs} lb milestone reached &middot;{" "}
                            {formatCents(ms.payout_cents + ms.bonus_payout_cents)} payout
                          </p>
                        );
                      })()}
                      {event.type === "ledger" && (() => {
                        const le = event.data as LedgerEntry;
                        return (
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">
                              {le.entry_type.replace(/_/g, " ")}
                            </p>
                            <span
                              className={`text-sm font-medium ${
                                le.direction === "credit" ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {le.direction === "credit" ? "+" : "-"}
                              {formatCents(le.amount_cents)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
