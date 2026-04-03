import { describe, it, expect } from "vitest";
import { computePoolBalances } from "@/lib/engines/pool-tracker";
import type { LedgerEntry } from "@/types/database";

const contract = {
  weekly_pool_cents: 48000,
  milestone_pool_cents: 20000,
  penalty_pool_cents: 8000,
  completion_pool_cents: 24000,
  total_deposit_cents: 100000,
};

function makeEntry(overrides: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: Math.random().toString(),
    contract_id: "c1",
    user_id: "u1",
    entry_type: "weekly_reward",
    pool_type: "weekly_pool",
    amount_cents: 0,
    direction: "debit",
    status: "earned",
    reference_type: null,
    reference_id: null,
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computePoolBalances", () => {
  it("returns full balances with no entries", () => {
    const result = computePoolBalances(contract, []);

    expect(result.weekly_pool.allocated).toBe(48000);
    expect(result.weekly_pool.spent).toBe(0);
    expect(result.weekly_pool.remaining).toBe(48000);
    expect(result.total_deposited).toBe(100000);
    expect(result.total_released).toBe(0);
    expect(result.total_remaining).toBe(100000);
  });

  it("calculates spent correctly", () => {
    const entries: LedgerEntry[] = [
      makeEntry({ pool_type: "weekly_pool", amount_cents: 3000, direction: "debit", status: "earned" }),
      makeEntry({ pool_type: "weekly_pool", amount_cents: 3000, direction: "debit", status: "released" }),
      makeEntry({ pool_type: "penalty_pool", amount_cents: 500, direction: "debit", status: "earned" }),
    ];

    const result = computePoolBalances(contract, entries);

    expect(result.weekly_pool.spent).toBe(6000);
    expect(result.weekly_pool.remaining).toBe(42000);
    expect(result.penalty_pool.spent).toBe(500);
    expect(result.penalty_pool.remaining).toBe(7500);
    expect(result.total_released).toBe(6500);
    expect(result.total_remaining).toBe(93500);
  });

  it("ignores credit entries for pool spending", () => {
    const entries: LedgerEntry[] = [
      makeEntry({ pool_type: "weekly_pool", amount_cents: 100000, direction: "credit", status: "released" }),
    ];

    const result = computePoolBalances(contract, entries);
    expect(result.weekly_pool.spent).toBe(0);
    expect(result.total_released).toBe(0);
  });

  it("ignores pending and failed entries", () => {
    const entries: LedgerEntry[] = [
      makeEntry({ pool_type: "weekly_pool", amount_cents: 3000, direction: "debit", status: "pending" }),
      makeEntry({ pool_type: "weekly_pool", amount_cents: 3000, direction: "debit", status: "failed" }),
    ];

    const result = computePoolBalances(contract, entries);
    expect(result.weekly_pool.spent).toBe(0);
  });
});
