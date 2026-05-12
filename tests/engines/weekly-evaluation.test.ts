import { describe, it, expect } from "vitest";
import {
  evaluateWeek,
  getContractWeekBounds,
  getCurrentWeekNumber,
} from "@/lib/engines/weekly-evaluation";
import type { Contract } from "@/types/database";

function makeContract(overrides?: Partial<Contract>): Contract {
  return {
    id: "test-contract-1",
    participant_id: "user-1",
    referee_id: "user-2",
    status: "active",
    start_weight: 220,
    current_verified_weight: 215,
    target_weight_loss: 40,
    target_duration_weeks: 16,
    weigh_ins_per_week: 3,
    total_deposit_cents: 100000,
    weekly_pool_cents: 48000,
    milestone_pool_cents: 20000,
    penalty_pool_cents: 8000,
    completion_pool_cents: 24000,
    weekly_reward_cents: 3000,
    penalty_cents: 500,
    milestone_interval_lbs: 5,
    milestone_payout_cents: 2500,
    milestone_bonus_interval_lbs: 10,
    milestone_bonus_cents: 2500,
    timezone: "America/New_York",
    start_date: "2025-01-06",
    end_date: "2025-04-28",
    created_at: "2025-01-06T00:00:00Z",
    updated_at: "2025-01-06T00:00:00Z",
    ...overrides,
  };
}

describe("evaluateWeek", () => {
  const contract = makeContract();
  const weekStart = new Date("2025-01-06");
  const weekEnd = new Date("2025-01-12");

  it("returns compliant with reward when weigh-ins meet requirement", () => {
    const result = evaluateWeek({
      contract,
      weekNumber: 1,
      weekStart,
      weekEnd,
      verifiedWeighInCount: 3,
    });

    expect(result.outcome).toBe("compliant");
    expect(result.payoutCents).toBe(3000);
    expect(result.poolType).toBe("weekly_pool");
    expect(result.entryType).toBe("weekly_reward");
  });

  it("returns compliant when weigh-ins exceed requirement", () => {
    const result = evaluateWeek({
      contract,
      weekNumber: 1,
      weekStart,
      weekEnd,
      verifiedWeighInCount: 5,
    });

    expect(result.outcome).toBe("compliant");
    expect(result.payoutCents).toBe(3000);
  });

  it("returns noncompliant with penalty when weigh-ins are insufficient", () => {
    const result = evaluateWeek({
      contract,
      weekNumber: 1,
      weekStart,
      weekEnd,
      verifiedWeighInCount: 2,
    });

    expect(result.outcome).toBe("noncompliant");
    expect(result.payoutCents).toBe(500);
    expect(result.poolType).toBe("penalty_pool");
    expect(result.entryType).toBe("weekly_penalty");
  });

  it("returns noncompliant with zero weigh-ins", () => {
    const result = evaluateWeek({
      contract,
      weekNumber: 1,
      weekStart,
      weekEnd,
      verifiedWeighInCount: 0,
    });

    expect(result.outcome).toBe("noncompliant");
    expect(result.payoutCents).toBe(500);
  });

  it("uses custom payout amounts from contract config", () => {
    const customContract = makeContract({
      weekly_reward_cents: 5000,
      penalty_cents: 1000,
    });

    const compliant = evaluateWeek({
      contract: customContract,
      weekNumber: 1,
      weekStart,
      weekEnd,
      verifiedWeighInCount: 3,
    });

    expect(compliant.payoutCents).toBe(5000);

    const noncompliant = evaluateWeek({
      contract: customContract,
      weekNumber: 1,
      weekStart,
      weekEnd,
      verifiedWeighInCount: 1,
    });

    expect(noncompliant.payoutCents).toBe(1000);
  });
});

describe("getContractWeekBounds", () => {
  it("returns correct bounds for week 1", () => {
    const startDate = new Date("2025-01-06");
    const { weekStart, weekEnd } = getContractWeekBounds(startDate, 1, "UTC");

    expect(weekStart.toISOString().slice(0, 10)).toBe("2025-01-06");
    expect(weekEnd.toISOString().slice(0, 10)).toBe("2025-01-12");
  });

  it("returns correct bounds for week 2", () => {
    const startDate = new Date("2025-01-06");
    const { weekStart, weekEnd } = getContractWeekBounds(startDate, 2, "UTC");

    expect(weekStart.toISOString().slice(0, 10)).toBe("2025-01-13");
    expect(weekEnd.toISOString().slice(0, 10)).toBe("2025-01-19");
  });
});

describe("getCurrentWeekNumber", () => {
  it("returns 1 on the start date", () => {
    const startDate = new Date("2025-01-06");
    const now = new Date("2025-01-06");
    expect(getCurrentWeekNumber(startDate, now)).toBe(1);
  });

  it("returns 2 in the second week", () => {
    const startDate = new Date("2025-01-06");
    const now = new Date("2025-01-14");
    expect(getCurrentWeekNumber(startDate, now)).toBe(2);
  });

  it("returns 16 at the end of 16 weeks", () => {
    const startDate = new Date("2025-01-06");
    const now = new Date("2025-04-21");
    expect(getCurrentWeekNumber(startDate, now)).toBe(16);
  });
});
