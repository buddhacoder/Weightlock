export type ContractStatus =
  | "draft"
  | "pending_funding"
  | "active"
  | "completed"
  | "canceled";

export type InviteStatus = "pending" | "accepted" | "expired" | "canceled";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type WeeklyOutcome = "compliant" | "noncompliant";

export type MilestoneStatus = "pending" | "triggered" | "paid";

export type LedgerEntryType =
  | "deposit"
  | "weekly_reward"
  | "weekly_penalty"
  | "milestone_payout"
  | "milestone_bonus"
  | "completion_payout"
  | "refund";

export type PoolType =
  | "weekly_pool"
  | "milestone_pool"
  | "penalty_pool"
  | "completion_pool";

export type LedgerDirection = "credit" | "debit";

export type LedgerStatus = "pending" | "earned" | "released" | "failed" | "canceled";

export type NotificationType =
  | "referee_invited"
  | "weighin_due_reminder"
  | "weighin_awaiting_verification"
  | "weighin_approved"
  | "weighin_rejected"
  | "weekly_payout_triggered"
  | "milestone_payout_triggered"
  | "completion_reached";

export type NotificationStatus = "pending" | "sent" | "failed";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role_preference: "participant" | "referee" | null;
  created_at: string;
}

export interface Contract {
  id: string;
  participant_id: string;
  referee_id: string | null;
  status: ContractStatus;
  start_weight: number;
  current_verified_weight: number | null;
  target_weight_loss: number;
  target_duration_weeks: number;
  weigh_ins_per_week: number;
  total_deposit_cents: number;
  weekly_pool_cents: number;
  milestone_pool_cents: number;
  penalty_pool_cents: number;
  completion_pool_cents: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractInvite {
  id: string;
  contract_id: string;
  referee_email: string;
  token: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface WeighIn {
  id: string;
  contract_id: string;
  participant_id: string;
  weight_lbs: number;
  photo_path: string | null;
  note: string | null;
  submitted_at: string;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

export interface Milestone {
  id: string;
  contract_id: string;
  threshold_lbs: number;
  triggered_at: string | null;
  payout_cents: number;
  bonus_payout_cents: number;
  status: MilestoneStatus;
}

export interface WeeklyEvaluation {
  id: string;
  contract_id: string;
  week_number: number;
  week_start: string;
  week_end: string;
  required_count: number;
  completed_verified_count: number;
  outcome: WeeklyOutcome;
  payout_cents: number;
  processed_at: string;
}

export interface LedgerEntry {
  id: string;
  contract_id: string;
  user_id: string | null;
  entry_type: LedgerEntryType;
  pool_type: PoolType | null;
  amount_cents: number;
  direction: LedgerDirection;
  status: LedgerStatus;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface StripeAccount {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  contract_id: string | null;
  type: NotificationType;
  payload: Record<string, unknown>;
  sent_at: string | null;
  status: NotificationStatus;
  created_at: string;
}
