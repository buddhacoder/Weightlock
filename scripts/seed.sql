-- WeightLock Seed Data
-- Run this against your Supabase database after running migrations
-- Note: In production, users are created via Supabase Auth.
-- These IDs are placeholders — replace with actual auth user IDs after creating accounts.

-- Example UUIDs (replace after creating auth users):
-- Participant: 00000000-0000-0000-0000-000000000001
-- Referee:     00000000-0000-0000-0000-000000000002

-- Insert profiles (normally created by auth trigger)
INSERT INTO public.profiles (id, email, full_name, role_preference) VALUES
  ('00000000-0000-0000-0000-000000000001', 'participant@demo.com', 'Alex Johnson', 'participant'),
  ('00000000-0000-0000-0000-000000000002', 'referee@demo.com', 'Sam Rivera', 'referee')
ON CONFLICT (id) DO NOTHING;

-- Create active contract
INSERT INTO public.contracts (
  id, participant_id, referee_id, status,
  start_weight, current_verified_weight, target_weight_loss,
  target_duration_weeks, weigh_ins_per_week,
  total_deposit_cents, weekly_pool_cents, milestone_pool_cents,
  penalty_pool_cents, completion_pool_cents,
  start_date, end_date
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'active',
  220.0, 212.0, 40.0,
  16, 3,
  100000, 48000, 20000, 8000, 24000,
  CURRENT_DATE - INTERVAL '21 days',
  CURRENT_DATE + INTERVAL '91 days'
) ON CONFLICT (id) DO NOTHING;

-- Create milestones
INSERT INTO public.milestones (contract_id, threshold_lbs, payout_cents, bonus_payout_cents, status, triggered_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 5.0, 2500, 0, 'triggered', NOW() - INTERVAL '7 days'),
  ('10000000-0000-0000-0000-000000000001', 10.0, 2500, 2500, 'pending', NULL),
  ('10000000-0000-0000-0000-000000000001', 15.0, 2500, 0, 'pending', NULL),
  ('10000000-0000-0000-0000-000000000001', 20.0, 2500, 2500, 'pending', NULL),
  ('10000000-0000-0000-0000-000000000001', 25.0, 2500, 0, 'pending', NULL),
  ('10000000-0000-0000-0000-000000000001', 30.0, 2500, 2500, 'pending', NULL),
  ('10000000-0000-0000-0000-000000000001', 35.0, 2500, 0, 'pending', NULL),
  ('10000000-0000-0000-0000-000000000001', 40.0, 2500, 2500, 'pending', NULL)
ON CONFLICT (contract_id, threshold_lbs) DO NOTHING;

-- Create verified weigh-ins
INSERT INTO public.weigh_ins (contract_id, participant_id, weight_lbs, verification_status, verified_by, verified_at, submitted_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 219.0, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 218.5, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 217.8, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 216.5, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 215.2, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 214.0, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 213.5, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 212.0, 'approved', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  -- Pending weigh-in
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 211.5, 'pending', NULL, NULL, NOW() - INTERVAL '1 day');

-- Create weekly evaluations
INSERT INTO public.weekly_evaluations (contract_id, week_number, week_start, week_end, required_count, completed_verified_count, outcome, payout_cents) VALUES
  ('10000000-0000-0000-0000-000000000001', 1, (CURRENT_DATE - INTERVAL '21 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date, 3, 3, 'compliant', 3000),
  ('10000000-0000-0000-0000-000000000001', 2, (CURRENT_DATE - INTERVAL '14 days')::date, (CURRENT_DATE - INTERVAL '8 days')::date, 3, 3, 'compliant', 3000)
ON CONFLICT (contract_id, week_number) DO NOTHING;

-- Create ledger entries
INSERT INTO public.ledger_entries (contract_id, user_id, entry_type, pool_type, amount_cents, direction, status, metadata) VALUES
  -- Deposit
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'deposit', NULL, 100000, 'credit', 'released', '{"source": "demo_seed"}'),
  -- Weekly rewards
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'weekly_reward', 'weekly_pool', 3000, 'debit', 'earned', '{"week_number": 1}'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'weekly_reward', 'weekly_pool', 3000, 'debit', 'earned', '{"week_number": 2}'),
  -- 5 lb milestone
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'milestone_payout', 'milestone_pool', 2500, 'debit', 'earned', '{"threshold_lbs": 5}');

-- Create contract invite (already accepted)
INSERT INTO public.contract_invites (contract_id, referee_email, status, token) VALUES
  ('10000000-0000-0000-0000-000000000001', 'referee@demo.com', 'accepted', 'demo-invite-token-accepted');
