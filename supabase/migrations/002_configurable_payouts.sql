-- WeightLock Schema Update: Configurable payout rules
-- Run after 001_initial_schema.sql

-- Add per-event payout configuration to contracts
ALTER TABLE public.contracts
  ADD COLUMN weekly_reward_cents integer NOT NULL DEFAULT 3000,
  ADD COLUMN penalty_cents integer NOT NULL DEFAULT 500,
  ADD COLUMN milestone_interval_lbs numeric(5,1) NOT NULL DEFAULT 5.0,
  ADD COLUMN milestone_payout_cents integer NOT NULL DEFAULT 2500,
  ADD COLUMN milestone_bonus_interval_lbs numeric(5,1) NOT NULL DEFAULT 10.0,
  ADD COLUMN milestone_bonus_cents integer NOT NULL DEFAULT 2500;

-- completion_pool_cents already serves as the completion payout amount
