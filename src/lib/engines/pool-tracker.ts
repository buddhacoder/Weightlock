import type { LedgerEntry, PoolType } from "@/types/database";

export interface PoolBalance {
  allocated: number;
  spent: number;
  remaining: number;
}

export interface ContractPoolBalances {
  weekly_pool: PoolBalance;
  milestone_pool: PoolBalance;
  penalty_pool: PoolBalance;
  completion_pool: PoolBalance;
  total_deposited: number;
  total_released: number;
  total_remaining: number;
}

export function computePoolBalances(
  contract: {
    weekly_pool_cents: number;
    milestone_pool_cents: number;
    penalty_pool_cents: number;
    completion_pool_cents: number;
    total_deposit_cents: number;
  },
  ledgerEntries: LedgerEntry[]
): ContractPoolBalances {
  const poolAllocations: Record<PoolType, number> = {
    weekly_pool: contract.weekly_pool_cents,
    milestone_pool: contract.milestone_pool_cents,
    penalty_pool: contract.penalty_pool_cents,
    completion_pool: contract.completion_pool_cents,
  };

  const poolSpent: Record<PoolType, number> = {
    weekly_pool: 0,
    milestone_pool: 0,
    penalty_pool: 0,
    completion_pool: 0,
  };

  // Sum up all debit entries per pool
  for (const entry of ledgerEntries) {
    if (
      entry.direction === "debit" &&
      entry.pool_type &&
      (entry.status === "earned" || entry.status === "released")
    ) {
      poolSpent[entry.pool_type] += entry.amount_cents;
    }
  }

  const pools = (Object.keys(poolAllocations) as PoolType[]).reduce(
    (acc, pool) => {
      acc[pool] = {
        allocated: poolAllocations[pool],
        spent: poolSpent[pool],
        remaining: poolAllocations[pool] - poolSpent[pool],
      };
      return acc;
    },
    {} as Record<PoolType, PoolBalance>
  );

  const totalReleased = Object.values(poolSpent).reduce((a, b) => a + b, 0);

  return {
    ...pools,
    total_deposited: contract.total_deposit_cents,
    total_released: totalReleased,
    total_remaining: contract.total_deposit_cents - totalReleased,
  };
}
