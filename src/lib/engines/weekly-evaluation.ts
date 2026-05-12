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

/**
 * Simple timezone offset lookup for major US timezones.
 * Returns offset in hours from UTC (negative = behind UTC).
 *
 * NOTE: This does NOT handle DST transitions. In production you would use
 * a library like date-fns-tz for proper IANA timezone math. For MVP this
 * simple mapping is sufficient to demonstrate the plumbing.
 */
const TIMEZONE_OFFSETS: Record<string, number> = {
  "UTC": 0,
  "America/New_York": -5,
  "America/Chicago": -6,
  "America/Denver": -7,
  "America/Los_Angeles": -8,
  "America/Anchorage": -9,
  "Pacific/Honolulu": -10,
  "America/Phoenix": -7,
  "America/Detroit": -5,
  "America/Indiana/Indianapolis": -5,
  "America/Boise": -7,
};

function getTimezoneOffsetMs(timezone?: string): number {
  if (!timezone) return 0;
  const hours = TIMEZONE_OFFSETS[timezone] ?? 0;
  return hours * 60 * 60 * 1000;
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
  const offsetMs = getTimezoneOffsetMs(timezone);

  // Compute the week start date in UTC terms
  const base = new Date(contractStartDate);
  base.setUTCHours(0, 0, 0, 0);
  const startMs = base.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;

  // weekStart = midnight in participant's timezone, expressed as UTC instant
  // "midnight local" = midnight UTC minus the (negative) offset
  const weekStart = new Date(startMs - offsetMs);

  // weekEnd = end-of-day (23:59:59.999) 6 calendar days later in participant's timezone
  const endDayMs = startMs + 6 * 24 * 60 * 60 * 1000;
  const weekEnd = new Date(endDayMs + 24 * 60 * 60 * 1000 - 1 - offsetMs);

  return { weekStart, weekEnd };
}

export function getCurrentWeekNumber(
  contractStartDate: Date,
  now: Date = new Date(),
  timezone?: string
): number {
  // Apply timezone offset so "now" is evaluated in the participant's local day
  const offsetMs = getTimezoneOffsetMs(timezone);
  const adjustedNow = new Date(now.getTime() + offsetMs);
  const adjustedStart = new Date(new Date(contractStartDate).getTime() + offsetMs);
  const diffMs = adjustedNow.getTime() - adjustedStart.getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}
