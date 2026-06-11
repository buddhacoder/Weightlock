import { fromZonedTime } from "date-fns-tz";
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
  weekNumber: number,
  timezone?: string
): { weekStart: Date; weekEnd: Date } {
  const tz = timezone || "UTC";
  const base = new Date(contractStartDate);

  const startYear = base.getUTCFullYear();
  const startMonth = base.getUTCMonth();
  const startDay = base.getUTCDate() + (weekNumber - 1) * 7;

  // Midnight on the start day in the participant's timezone, expressed as UTC
  const weekStart = fromZonedTime(new Date(startYear, startMonth, startDay, 0, 0, 0, 0), tz);

  const endDay = startDay + 6;
  // 23:59:59.999 on the end day in the participant's timezone, expressed as UTC
  const weekEnd = fromZonedTime(new Date(startYear, startMonth, endDay, 23, 59, 59, 999), tz);

  return { weekStart, weekEnd };
}

export function getCurrentWeekNumber(
  contractStartDate: Date,
  now: Date = new Date(),
  timezone?: string
): number {
  const tz = timezone || "UTC";
  const base = new Date(contractStartDate);

  // Compute the start of week 1 in the participant's timezone
  const week1Start = fromZonedTime(
    new Date(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0, 0),
    tz
  );

  const diffMs = now.getTime() - week1Start.getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}
