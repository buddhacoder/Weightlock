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

const WEEKLY_REWARD_CENTS = 3000; // $30
const WEEKLY_PENALTY_CENTS = 500; // $5

export function evaluateWeek(input: WeeklyEvaluationInput): WeeklyEvaluationResult {
  const { contract, verifiedWeighInCount } = input;
  const isCompliant = verifiedWeighInCount >= contract.weigh_ins_per_week;

  if (isCompliant) {
    // Calculate remaining weekly pool funds
    const weeklyReward = Math.min(WEEKLY_REWARD_CENTS, getRemainingPool(contract, "weekly"));
    return {
      outcome: "compliant",
      payoutCents: weeklyReward,
      poolType: "weekly_pool",
      entryType: "weekly_reward",
    };
  } else {
    // Noncompliant: penalty from penalty pool
    const penaltyAmount = Math.min(WEEKLY_PENALTY_CENTS, getRemainingPool(contract, "penalty"));
    return {
      outcome: "noncompliant",
      payoutCents: penaltyAmount,
      poolType: "penalty_pool",
      entryType: "weekly_penalty",
    };
  }
}

function getRemainingPool(contract: Contract, pool: "weekly" | "penalty"): number {
  // In a real implementation, we'd query the ledger to compute spent amounts.
  // For the engine function, we accept the contract's pool values as maximums.
  // The actual remaining check happens at the service layer when creating entries.
  if (pool === "weekly") return contract.weekly_pool_cents;
  return contract.penalty_pool_cents;
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
