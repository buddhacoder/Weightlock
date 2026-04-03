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

const MILESTONE_PAYOUT_CENTS = 2500; // $25 per 5 lb
const MILESTONE_BONUS_CENTS = 2500; // extra $25 at 10 lb intervals

export function detectMilestones(input: MilestoneCheckInput): MilestoneTriggered[] {
  const { contract, milestones, lowestVerifiedWeight } = input;
  const weightLost = contract.start_weight - lowestVerifiedWeight;
  const triggered: MilestoneTriggered[] = [];

  // Generate all possible thresholds (every 5 lb up to target)
  const maxThreshold = Math.min(
    Math.floor(weightLost / 5) * 5,
    contract.target_weight_loss
  );

  for (let threshold = 5; threshold <= maxThreshold; threshold += 5) {
    // Check if this milestone already exists and is triggered
    const existing = milestones.find((m) => m.threshold_lbs === threshold);
    if (existing && existing.status !== "pending") {
      continue; // Already triggered, idempotent skip
    }

    const isBonus = threshold % 10 === 0;
    triggered.push({
      thresholdLbs: threshold,
      payoutCents: MILESTONE_PAYOUT_CENTS,
      bonusPayoutCents: isBonus ? MILESTONE_BONUS_CENTS : 0,
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
