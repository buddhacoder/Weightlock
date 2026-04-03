import type { Contract } from "@/types/database";

export interface CompletionCheckInput {
  contract: Contract;
  lowestVerifiedWeight: number;
}

export interface CompletionResult {
  isComplete: boolean;
  completionPayoutCents: number;
  actualWeightLoss: number;
  targetWeightLoss: number;
}

export function checkCompletion(input: CompletionCheckInput): CompletionResult {
  const { contract, lowestVerifiedWeight } = input;
  const actualWeightLoss = contract.start_weight - lowestVerifiedWeight;
  const isComplete = actualWeightLoss >= contract.target_weight_loss;

  return {
    isComplete,
    completionPayoutCents: isComplete ? contract.completion_pool_cents : 0,
    actualWeightLoss,
    targetWeightLoss: contract.target_weight_loss,
  };
}
