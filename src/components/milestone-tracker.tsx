"use client";

import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import type { Milestone } from "@/types/database";
import { Target, Check, Circle } from "lucide-react";

export function MilestoneTracker({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No milestones configured</p>;
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {milestones.map((m) => {
        const isTriggered = m.status === "triggered" || m.status === "paid";
        const totalPayout = m.payout_cents + m.bonus_payout_cents;

        return (
          <div
            key={m.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              isTriggered ? "bg-emerald-50 border-emerald-200" : "bg-white"
            }`}
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                isTriggered ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {isTriggered ? <Check className="h-4 w-4" /> : <Target className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isTriggered ? "text-emerald-900" : "text-slate-700"}`}>
                {m.threshold_lbs} lb lost
              </p>
              {m.bonus_payout_cents > 0 && (
                <p className="text-xs text-slate-500">Includes bonus</p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${isTriggered ? "text-emerald-600" : "text-slate-500"}`}>
                {formatCents(totalPayout)}
              </p>
              {isTriggered && (
                <Badge variant="success" className="text-xs">Earned</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
