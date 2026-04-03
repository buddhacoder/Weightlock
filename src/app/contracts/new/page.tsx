"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContract } from "@/lib/actions/contracts";
import { formatCents } from "@/lib/utils";
import { DollarSign, ArrowRight, AlertTriangle } from "lucide-react";

const DEFAULT_DEPOSIT = 100000; // $1000

function computeDefaults(totalCents: number) {
  // Proportional allocation matching the default ratios
  const weeklyPct = 0.48;
  const milestonePct = 0.20;
  const penaltyPct = 0.08;
  const completionPct = 0.24;
  return {
    weekly_pool_cents: Math.round(totalCents * weeklyPct),
    milestone_pool_cents: Math.round(totalCents * milestonePct),
    penalty_pool_cents: Math.round(totalCents * penaltyPct),
    completion_pool_cents: Math.round(totalCents * completionPct),
  };
}

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    start_weight: 220,
    target_weight_loss: 40,
    target_duration_weeks: 16,
    weigh_ins_per_week: 3,
    referee_email: "",
    total_deposit_cents: DEFAULT_DEPOSIT,
    ...computeDefaults(DEFAULT_DEPOSIT),
  });

  function updateField(field: string, value: number | string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "total_deposit_cents") {
        const pools = computeDefaults(value as number);
        return { ...next, ...pools };
      }
      return next;
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await createContract(form);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/contracts/${result.contractId}`);
    }
  }

  const poolSum =
    form.weekly_pool_cents +
    form.milestone_pool_cents +
    form.penalty_pool_cents +
    form.completion_pool_cents;
  const isBalanced = poolSum === form.total_deposit_cents;

  return (
    <AppShell activeRoute="/contracts/new">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Contract</h1>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Weight Goal</CardTitle>
              <CardDescription>Set your starting weight and target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Starting Weight (lb)</Label>
                  <Input
                    type="number"
                    value={form.start_weight}
                    onChange={(e) => updateField("start_weight", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Target Loss (lb)</Label>
                  <Input
                    type="number"
                    value={form.target_weight_loss}
                    onChange={(e) => updateField("target_weight_loss", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (weeks)</Label>
                  <Input
                    type="number"
                    value={form.target_duration_weeks}
                    onChange={(e) => updateField("target_duration_weeks", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Weigh-ins per week</Label>
                  <Input
                    type="number"
                    value={form.weigh_ins_per_week}
                    onChange={(e) => updateField("weigh_ins_per_week", Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label>Referee Email</Label>
                <Input
                  type="email"
                  placeholder="referee@example.com"
                  value={form.referee_email}
                  onChange={(e) => updateField("referee_email", e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your referee will be invited to verify your weigh-ins and earn rewards.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  Target weight: <strong>{form.start_weight - form.target_weight_loss} lb</strong>{" "}
                  (from {form.start_weight} lb)
                </p>
                <p className="text-sm text-slate-600">
                  {form.weigh_ins_per_week} weigh-ins per week for {form.target_duration_weeks} weeks
                </p>
              </div>
              <Button onClick={() => setStep(2)} className="w-full gap-2">
                Continue to Funding <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Funding Structure
              </CardTitle>
              <CardDescription>Configure your deposit and pool allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Total Deposit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    type="number"
                    className="pl-7"
                    value={form.total_deposit_cents / 100}
                    onChange={(e) => {
                      const cents = Math.round(Number(e.target.value) * 100);
                      updateField("total_deposit_cents", cents);
                    }}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-slate-700">Pool Allocation</h4>
                {[
                  { key: "weekly_pool_cents", label: "Weekly Compliance Pool", desc: "Released to referee for each compliant week" },
                  { key: "milestone_pool_cents", label: "Milestone Pool", desc: "Released at every 5 lb milestone" },
                  { key: "penalty_pool_cents", label: "Penalty Pool", desc: "Released to referee for noncompliant weeks" },
                  { key: "completion_pool_cents", label: "Completion Pool", desc: "Released when full goal is achieved" },
                ].map((pool) => (
                  <div key={pool.key}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{pool.label}</Label>
                      <span className="text-xs text-slate-500">
                        {formatCents(form[pool.key as keyof typeof form] as number)}
                      </span>
                    </div>
                    <Input
                      type="number"
                      className="h-8 text-sm mt-1"
                      value={(form[pool.key as keyof typeof form] as number) / 100}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [pool.key]: Math.round(Number(e.target.value) * 100),
                        }))
                      }
                    />
                    <p className="text-xs text-slate-400 mt-0.5">{pool.desc}</p>
                  </div>
                ))}
                {!isBalanced && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Pools total {formatCents(poolSum)} but deposit is{" "}
                      {formatCents(form.total_deposit_cents)}. They must match.
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <h4 className="font-medium text-sm text-red-900 mb-1">Money at Risk</h4>
                <p className="text-sm text-red-700">
                  By creating this contract, you commit to depositing{" "}
                  <strong>{formatCents(form.total_deposit_cents)}</strong>. Funds will be released
                  based on your adherence to the contract rules. Missed weigh-ins and noncompliance
                  will trigger penalty payouts to your referee.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !isBalanced || !form.referee_email}
                  className="flex-1"
                >
                  {loading ? "Creating..." : "Create Contract"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
