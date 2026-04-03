import { z } from "zod";

export const createContractSchema = z.object({
  start_weight: z
    .number()
    .min(80, "Start weight must be at least 80 lb")
    .max(800, "Start weight must be at most 800 lb"),
  target_weight_loss: z
    .number()
    .min(5, "Target must be at least 5 lb")
    .max(200, "Target must be at most 200 lb")
    .default(40),
  target_duration_weeks: z
    .number()
    .int()
    .min(4, "Duration must be at least 4 weeks")
    .max(52, "Duration must be at most 52 weeks")
    .default(16),
  weigh_ins_per_week: z
    .number()
    .int()
    .min(1, "At least 1 weigh-in per week")
    .max(7, "At most 7 weigh-ins per week")
    .default(3),
  referee_email: z.string().email("Valid email required"),
  total_deposit_cents: z
    .number()
    .int()
    .min(10000, "Minimum deposit is $100")
    .max(1000000, "Maximum deposit is $10,000")
    .default(100000),
  weekly_pool_cents: z.number().int().min(0).default(48000),
  milestone_pool_cents: z.number().int().min(0).default(20000),
  penalty_pool_cents: z.number().int().min(0).default(8000),
  completion_pool_cents: z.number().int().min(0).default(24000),
  // Per-event payout rules
  weekly_reward_cents: z.number().int().min(0).default(3000),
  penalty_cents: z.number().int().min(0).default(500),
  milestone_interval_lbs: z.number().min(1).max(50).default(5),
  milestone_payout_cents: z.number().int().min(0).default(2500),
  milestone_bonus_interval_lbs: z.number().min(1).max(100).default(10),
  milestone_bonus_cents: z.number().int().min(0).default(2500),
});

export const submitWeighInSchema = z.object({
  contract_id: z.string().uuid(),
  weight_lbs: z
    .number()
    .min(50, "Weight must be at least 50 lb")
    .max(800, "Weight must be at most 800 lb"),
  note: z.string().max(500).optional(),
});

export const verifyWeighInSchema = z.object({
  weigh_in_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().max(500).optional(),
});

export const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
  role_preference: z.enum(["participant", "referee"]).optional(),
});

export const fundingAllocationSchema = z
  .object({
    total_deposit_cents: z.number().int().min(10000),
    weekly_pool_cents: z.number().int().min(0),
    milestone_pool_cents: z.number().int().min(0),
    penalty_pool_cents: z.number().int().min(0),
    completion_pool_cents: z.number().int().min(0),
  })
  .refine(
    (data) =>
      data.weekly_pool_cents +
        data.milestone_pool_cents +
        data.penalty_pool_cents +
        data.completion_pool_cents ===
      data.total_deposit_cents,
    { message: "Pool allocations must equal total deposit" }
  );

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type SubmitWeighInInput = z.infer<typeof submitWeighInSchema>;
export type VerifyWeighInInput = z.infer<typeof verifyWeighInSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
