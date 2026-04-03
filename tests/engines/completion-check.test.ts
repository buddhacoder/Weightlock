import { describe, it, expect } from "vitest";
import { checkCompletion } from "@/lib/engines/completion-check";
import type { Contract } from "@/types/database";

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

describe("checkCompletion", () => {
  it("detects completion when target is reached", () => {
    const contract = makeContract();
    const result = checkCompletion({
      contract,
      lowestVerifiedWeight: 180, // 40 lb lost
    });

    expect(result.isComplete).toBe(true);
    expect(result.completionPayoutCents).toBe(24000);
    expect(result.actualWeightLoss).toBe(40);
  });

  it("detects completion when target is exceeded", () => {
    const contract = makeContract();
    const result = checkCompletion({
      contract,
      lowestVerifiedWeight: 175, // 45 lb lost
    });

    expect(result.isComplete).toBe(true);
    expect(result.completionPayoutCents).toBe(24000);
    expect(result.actualWeightLoss).toBe(45);
  });

  it("returns incomplete when target not reached", () => {
    const contract = makeContract();
    const result = checkCompletion({
      contract,
      lowestVerifiedWeight: 190, // 30 lb lost
    });

    expect(result.isComplete).toBe(false);
    expect(result.completionPayoutCents).toBe(0);
    expect(result.actualWeightLoss).toBe(30);
  });

  it("returns incomplete when barely under target", () => {
    const contract = makeContract();
    const result = checkCompletion({
      contract,
      lowestVerifiedWeight: 180.5, // 39.5 lb lost
    });

    expect(result.isComplete).toBe(false);
    expect(result.completionPayoutCents).toBe(0);
  });
});
