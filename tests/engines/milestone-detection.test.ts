import { describe, it, expect } from "vitest";
import {
  detectMilestones,
  getLowestVerifiedWeight,
  calculateTotalMilestonePayout,
} from "@/lib/engines/milestone-detection";
import type { Contract, Milestone } from "@/types/database";

function makeContract(overrides?: Partial<Contract>): Contract {
  return {
    id: "test-contract-1",
    participant_id: "user-1",
    referee_id: "user-2",
    status: "active",
    start_weight: 220,
    current_verified_weight: 210,
    target_weight_loss: 40,
    target_duration_weeks: 16,
    weigh_ins_per_week: 3,
    total_deposit_cents: 100000,
    weekly_pool_cents: 48000,
    milestone_pool_cents: 20000,
    penalty_pool_cents: 8000,
    completion_pool_cents: 24000,
    start_date: "2025-01-06",
    end_date: "2025-04-28",
    created_at: "2025-01-06T00:00:00Z",
    updated_at: "2025-01-06T00:00:00Z",
    ...overrides,
  };
}

function makeMilestone(threshold: number, status: "pending" | "triggered" = "pending"): Milestone {
  return {
    id: `ms-${threshold}`,
    contract_id: "test-contract-1",
    threshold_lbs: threshold,
    triggered_at: status === "triggered" ? "2025-02-01T00:00:00Z" : null,
    payout_cents: 2500,
    bonus_payout_cents: threshold % 10 === 0 ? 2500 : 0,
    status,
  };
}

describe("detectMilestones", () => {
  it("detects 5 lb milestone", () => {
    const contract = makeContract();
    const milestones = [makeMilestone(5), makeMilestone(10)];

    const result = detectMilestones({
      contract,
      milestones,
      lowestVerifiedWeight: 214, // 6 lb lost
    });

    expect(result).toHaveLength(1);
    expect(result[0].thresholdLbs).toBe(5);
    expect(result[0].payoutCents).toBe(2500);
    expect(result[0].bonusPayoutCents).toBe(0);
  });

  it("detects multiple milestones at once", () => {
    const contract = makeContract();
    const milestones = [makeMilestone(5), makeMilestone(10), makeMilestone(15)];

    const result = detectMilestones({
      contract,
      milestones,
      lowestVerifiedWeight: 205, // 15 lb lost
    });

    expect(result).toHaveLength(3);
    expect(result[0].thresholdLbs).toBe(5);
    expect(result[1].thresholdLbs).toBe(10);
    expect(result[2].thresholdLbs).toBe(15);
  });

  it("includes bonus at 10 lb intervals", () => {
    const contract = makeContract();
    const milestones = [makeMilestone(5), makeMilestone(10)];

    const result = detectMilestones({
      contract,
      milestones,
      lowestVerifiedWeight: 209, // 11 lb lost
    });

    const tenLbMilestone = result.find((m) => m.thresholdLbs === 10);
    expect(tenLbMilestone).toBeDefined();
    expect(tenLbMilestone!.bonusPayoutCents).toBe(2500);
    expect(tenLbMilestone!.isBonus).toBe(true);
  });

  it("skips already triggered milestones (idempotent)", () => {
    const contract = makeContract();
    const milestones = [
      makeMilestone(5, "triggered"),
      makeMilestone(10),
    ];

    const result = detectMilestones({
      contract,
      milestones,
      lowestVerifiedWeight: 209, // 11 lb lost
    });

    expect(result).toHaveLength(1);
    expect(result[0].thresholdLbs).toBe(10);
  });

  it("returns empty array when no new milestones reached", () => {
    const contract = makeContract();
    const milestones = [makeMilestone(5)];

    const result = detectMilestones({
      contract,
      milestones,
      lowestVerifiedWeight: 217, // 3 lb lost
    });

    expect(result).toHaveLength(0);
  });

  it("does not exceed target weight loss", () => {
    const contract = makeContract({ target_weight_loss: 10 });
    const milestones = [makeMilestone(5), makeMilestone(10)];

    const result = detectMilestones({
      contract,
      milestones,
      lowestVerifiedWeight: 200, // 20 lb lost, but target is only 10
    });

    expect(result).toHaveLength(2);
    // Should not include milestones beyond 10
    expect(result.every((m) => m.thresholdLbs <= 10)).toBe(true);
  });
});

describe("getLowestVerifiedWeight", () => {
  it("returns lowest verified weight", () => {
    const weighIns = [
      { weight_lbs: 218, verification_status: "approved" },
      { weight_lbs: 215, verification_status: "approved" },
      { weight_lbs: 216, verification_status: "approved" },
      { weight_lbs: 210, verification_status: "pending" },
    ];

    expect(getLowestVerifiedWeight(weighIns)).toBe(215);
  });

  it("returns null when no verified weigh-ins", () => {
    const weighIns = [
      { weight_lbs: 210, verification_status: "pending" },
      { weight_lbs: 215, verification_status: "rejected" },
    ];

    expect(getLowestVerifiedWeight(weighIns)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(getLowestVerifiedWeight([])).toBeNull();
  });
});

describe("calculateTotalMilestonePayout", () => {
  it("sums payouts and bonuses", () => {
    const milestones = [
      { thresholdLbs: 5, payoutCents: 2500, bonusPayoutCents: 0, isBonus: false },
      { thresholdLbs: 10, payoutCents: 2500, bonusPayoutCents: 2500, isBonus: true },
    ];

    expect(calculateTotalMilestonePayout(milestones)).toBe(7500);
  });
});
