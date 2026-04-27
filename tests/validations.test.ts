import { describe, it, expect } from "vitest";
import {
  createContractSchema,
  submitWeighInSchema,
  verifyWeighInSchema,
  fundingAllocationSchema,
} from "@/lib/validations";

describe("createContractSchema", () => {
  const validInput = {
    start_weight: 220,
    target_weight_loss: 40,
    target_duration_weeks: 16,
    weigh_ins_per_week: 3,
    referee_email: "referee@example.com",
    total_deposit_cents: 100000,
    weekly_pool_cents: 48000,
    milestone_pool_cents: 20000,
    penalty_pool_cents: 8000,
    completion_pool_cents: 24000,
  };

  it("accepts valid input", () => {
    const result = createContractSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects weight below 80", () => {
    const result = createContractSchema.safeParse({ ...validInput, start_weight: 50 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createContractSchema.safeParse({ ...validInput, referee_email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("rejects deposit below minimum", () => {
    const result = createContractSchema.safeParse({ ...validInput, total_deposit_cents: 5000 });
    expect(result.success).toBe(false);
  });

  it("rejects duration beyond 52 weeks", () => {
    const result = createContractSchema.safeParse({ ...validInput, target_duration_weeks: 60 });
    expect(result.success).toBe(false);
  });
});

describe("submitWeighInSchema", () => {
  it("accepts valid weigh-in", () => {
    const result = submitWeighInSchema.safeParse({
      contract_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_lbs: 215.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight below 50", () => {
    const result = submitWeighInSchema.safeParse({
      contract_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_lbs: 30,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID", () => {
    const result = submitWeighInSchema.safeParse({
      contract_id: "not-a-uuid",
      weight_lbs: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("verifyWeighInSchema", () => {
  it("accepts approval", () => {
    const result = verifyWeighInSchema.safeParse({
      weigh_in_id: "550e8400-e29b-41d4-a716-446655440000",
      status: "approved",
    });
    expect(result.success).toBe(true);
  });

  it("accepts rejection with reason", () => {
    const result = verifyWeighInSchema.safeParse({
      weigh_in_id: "550e8400-e29b-41d4-a716-446655440000",
      status: "rejected",
      rejection_reason: "Photo not clear",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = verifyWeighInSchema.safeParse({
      weigh_in_id: "550e8400-e29b-41d4-a716-446655440000",
      status: "maybe",
    });
    expect(result.success).toBe(false);
  });
});

describe("fundingAllocationSchema", () => {
  it("accepts balanced allocation", () => {
    const result = fundingAllocationSchema.safeParse({
      total_deposit_cents: 100000,
      weekly_pool_cents: 48000,
      milestone_pool_cents: 20000,
      penalty_pool_cents: 8000,
      completion_pool_cents: 24000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unbalanced allocation", () => {
    const result = fundingAllocationSchema.safeParse({
      total_deposit_cents: 100000,
      weekly_pool_cents: 50000,
      milestone_pool_cents: 20000,
      penalty_pool_cents: 8000,
      completion_pool_cents: 24000,
    });
    expect(result.success).toBe(false);
  });
});
