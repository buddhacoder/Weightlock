import type { Contract, Milestone } from "@/types/database";

export interface MilestoneCheckInput {
  contract: Contract;
  milestones: Milestone[];
  lowestVerifiedWeight: number;
}

export interface MilestoneTriggered {
  thresholdLbs: number;
  payoutCents: number;
  bonusPayoutCents: number;
  isBonus: boolean;
}

export function detectMilestones(input: MilestoneCheckInput): MilestoneTriggered[] {
  const { contract, milestones, lowestVerifiedWeight } = input;
  const weightLost = contract.start_weight - lowestVerifiedWeight;
  const triggered: MilestoneTriggered[] = [];

  const interval = contract.milestone_interval_lbs;
  const bonusInterval = contract.milestone_bonus_interval_lbs;

  // Generate all possible thresholds based on the contract's milestone interval
  const maxThreshold = Math.min(
    Math.floor(weightLost / interval) * interval,
    contract.target_weight_loss
  );

  for (let threshold = interval; threshold <= maxThreshold; threshold += interval) {
    // Check if this milestone already exists and is triggered
    const existing = milestones.find((m) => m.threshold_lbs === threshold);
    if (existing && existing.status !== "pending") {
      continue; // Already triggered, idempotent skip
    }

    const isBonus = threshold % bonusInterval === 0;
    triggered.push({
      thresholdLbs: threshold,
      payoutCents: contract.milestone_payout_cents,
      bonusPayoutCents: isBonus ? contract.milestone_bonus_cents : 0,
      isBonus,
    });
  }

  return triggered;
}

export function getLowestVerifiedWeight(
  weighIns: Array<{ weight_lbs: number; verification_status: string }>
): number | null {
  const verified = weighIns.filter((w) => w.verification_status === "approved");
  if (verified.length === 0) return null;
  return Math.min(...verified.map((w) => w.weight_lbs));
}

export function calculateTotalMilestonePayout(milestones: MilestoneTriggered[]): number {
  return milestones.reduce((sum, m) => sum + m.payoutCents + m.bonusPayoutCents, 0);
}
