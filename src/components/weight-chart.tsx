"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import type { WeighIn } from "@/types/database";

export function WeightChart({
  weighIns,
  startWeight,
  targetWeight,
}: {
  weighIns: WeighIn[];
  startWeight: number;
  targetWeight: number;
}) {
  const approvedWeighIns = weighIns
    .filter((w) => w.verification_status === "approved")
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  if (approvedWeighIns.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        No verified weigh-ins yet
      </div>
    );
  }

  const data = approvedWeighIns.map((w) => ({
    date: new Date(w.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: w.weight_lbs,
  }));

  const allWeights = data.map((d) => d.weight);
  const minW = Math.min(...allWeights, targetWeight) - 5;
  const maxW = Math.max(...allWeights, startWeight) + 5;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <YAxis domain={[minW, maxW]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <Tooltip
          formatter={(value) => [`${value} lb`, "Weight"]}
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
        />
        <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="5 5" label={{ value: "Goal", fill: "#10b981", fontSize: 11 }} />
        <ReferenceLine y={startWeight} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Start", fill: "#94a3b8", fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#059669"
          strokeWidth={2}
          dot={{ fill: "#059669", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
