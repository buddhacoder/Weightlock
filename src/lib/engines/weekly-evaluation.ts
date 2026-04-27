import type { Contract, WeeklyOutcome } from "@/types/database";

export interface WeeklyEvaluationInput {
  contract: Contract;
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  verifiedWeighInCount: number;
}

export interface WeeklyEvaluationResult {
  outcome: WeeklyOutcome;
  payoutCents: number;
  poolType: "weekly_pool" | "penalty_pool";
  entryType: "weekly_reward" | "weekly_penalty";
}

export function evaluateWeek(input: WeeklyEvaluationInput): WeeklyEvaluationResult {
  const { contract, verifiedWeighInCount } = input;
  const isCompliant = verifiedWeighInCount >= contract.weigh_ins_per_week;

  if (isCompliant) {
    return {
      outcome: "compliant",
      payoutCents: contract.weekly_reward_cents,
      poolType: "weekly_pool",
      entryType: "weekly_reward",
    };
  } else {
    return {
      outcome: "noncompliant",
      payoutCents: contract.penalty_cents,
      poolType: "penalty_pool",
      entryType: "weekly_penalty",
    };
  }
}

export function getContractWeekBounds(
  contractStartDate: Date,
  weekNumber: number
): { weekStart: Date; weekEnd: Date } {
  const start = new Date(contractStartDate);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { weekStart: start, weekEnd: end };
}

export function getCurrentWeekNumber(contractStartDate: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - new Date(contractStartDate).getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}
