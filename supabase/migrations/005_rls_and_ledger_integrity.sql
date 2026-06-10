-- WeightLock Migration 005: RLS fixes and ledger integrity
-- Fixes two defects found in pre-launch review:
--   1. App code inserts milestone rows via user-scoped clients, but migration 001
--      defines only SELECT policies on public.milestones, so inserts are rejected.
--   2. Deposit ledger entries can be created twice by racing Stripe handlers
--      (success redirect vs. webhook).

-- Allow participants to create milestones for their own contracts
create policy "Participant can create milestones" on public.milestones
  for insert with check (
    exists (
      select 1 from public.contracts
      where id = contract_id and participant_id = auth.uid()
    )
  );

-- At most one deposit ledger entry per contract
create unique index uniq_deposit_per_contract
  on public.ledger_entries (contract_id)
  where entry_type = 'deposit';
