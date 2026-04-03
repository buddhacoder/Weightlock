-- WeightLock Initial Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role_preference text check (role_preference in ('participant', 'referee')),
  created_at timestamptz not null default now()
);

-- Contracts table
create table public.contracts (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid not null references public.profiles(id),
  referee_id uuid references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'pending_funding', 'active', 'completed', 'canceled')),
  start_weight numeric(6,1) not null,
  current_verified_weight numeric(6,1),
  target_weight_loss numeric(5,1) not null default 40.0,
  target_duration_weeks integer not null default 16,
  weigh_ins_per_week integer not null default 3,
  total_deposit_cents integer not null,
  weekly_pool_cents integer not null,
  milestone_pool_cents integer not null,
  penalty_pool_cents integer not null,
  completion_pool_cents integer not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract invites table
create table public.contract_invites (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  referee_email text not null,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'canceled')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- Weigh-ins table
create table public.weigh_ins (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  participant_id uuid not null references public.profiles(id),
  weight_lbs numeric(5,1) not null,
  photo_path text,
  note text,
  submitted_at timestamptz not null default now(),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  rejection_reason text
);

-- Milestones table
create table public.milestones (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  threshold_lbs numeric(5,1) not null,
  triggered_at timestamptz,
  payout_cents integer not null default 2500,
  bonus_payout_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'triggered', 'paid')),
  unique(contract_id, threshold_lbs)
);

-- Weekly evaluations table
create table public.weekly_evaluations (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  week_number integer not null,
  week_start date not null,
  week_end date not null,
  required_count integer not null,
  completed_verified_count integer not null default 0,
  outcome text not null check (outcome in ('compliant', 'noncompliant')),
  payout_cents integer not null default 0,
  processed_at timestamptz not null default now(),
  unique(contract_id, week_number)
);

-- Ledger entries table
create table public.ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid references public.profiles(id),
  entry_type text not null check (entry_type in ('deposit', 'weekly_reward', 'weekly_penalty', 'milestone_payout', 'milestone_bonus', 'completion_payout', 'refund')),
  pool_type text check (pool_type in ('weekly_pool', 'milestone_pool', 'penalty_pool', 'completion_pool')),
  amount_cents integer not null,
  direction text not null check (direction in ('credit', 'debit')),
  status text not null default 'pending' check (status in ('pending', 'earned', 'released', 'failed', 'canceled')),
  reference_type text,
  reference_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Stripe accounts table
create table public.stripe_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id),
  stripe_customer_id text,
  stripe_connect_account_id text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notifications table
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  contract_id uuid references public.contracts(id) on delete set null,
  type text not null check (type in (
    'referee_invited', 'weighin_due_reminder', 'weighin_awaiting_verification',
    'weighin_approved', 'weighin_rejected', 'weekly_payout_triggered',
    'milestone_payout_triggered', 'completion_reached'
  )),
  payload jsonb not null default '{}',
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_contracts_participant on public.contracts(participant_id);
create index idx_contracts_referee on public.contracts(referee_id);
create index idx_contracts_status on public.contracts(status);
create index idx_weigh_ins_contract on public.weigh_ins(contract_id);
create index idx_weigh_ins_verification on public.weigh_ins(verification_status);
create index idx_milestones_contract on public.milestones(contract_id);
create index idx_weekly_evaluations_contract on public.weekly_evaluations(contract_id);
create index idx_ledger_entries_contract on public.ledger_entries(contract_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_contract_invites_token on public.contract_invites(token);

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.handle_updated_at();

create trigger stripe_accounts_updated_at
  before update on public.stripe_accounts
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_invites enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.milestones enable row level security;
alter table public.weekly_evaluations enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.stripe_accounts enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can read/update own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Contracts: participant and referee can view
create policy "Participant can view own contracts" on public.contracts
  for select using (auth.uid() = participant_id);
create policy "Referee can view assigned contracts" on public.contracts
  for select using (auth.uid() = referee_id);
create policy "Participant can create contracts" on public.contracts
  for insert with check (auth.uid() = participant_id);
create policy "Participant can update own contracts" on public.contracts
  for update using (auth.uid() = participant_id);

-- Contract invites: visible to contract participant and the invited referee
create policy "Participant can view own invites" on public.contract_invites
  for select using (
    exists (select 1 from public.contracts where id = contract_id and participant_id = auth.uid())
  );
create policy "Referee can view own invites" on public.contract_invites
  for select using (referee_email = (select email from public.profiles where id = auth.uid()));
create policy "Participant can create invites" on public.contract_invites
  for insert with check (
    exists (select 1 from public.contracts where id = contract_id and participant_id = auth.uid())
  );

-- Weigh-ins
create policy "Participant can view own weigh-ins" on public.weigh_ins
  for select using (auth.uid() = participant_id);
create policy "Referee can view contract weigh-ins" on public.weigh_ins
  for select using (
    exists (select 1 from public.contracts where id = contract_id and referee_id = auth.uid())
  );
create policy "Participant can create weigh-ins" on public.weigh_ins
  for insert with check (auth.uid() = participant_id);
create policy "Referee can update weigh-ins for verification" on public.weigh_ins
  for update using (
    exists (select 1 from public.contracts where id = contract_id and referee_id = auth.uid())
  );

-- Milestones: visible to participant and referee
create policy "Participant can view milestones" on public.milestones
  for select using (
    exists (select 1 from public.contracts where id = contract_id and participant_id = auth.uid())
  );
create policy "Referee can view milestones" on public.milestones
  for select using (
    exists (select 1 from public.contracts where id = contract_id and referee_id = auth.uid())
  );

-- Weekly evaluations
create policy "Participant can view evaluations" on public.weekly_evaluations
  for select using (
    exists (select 1 from public.contracts where id = contract_id and participant_id = auth.uid())
  );
create policy "Referee can view evaluations" on public.weekly_evaluations
  for select using (
    exists (select 1 from public.contracts where id = contract_id and referee_id = auth.uid())
  );

-- Ledger entries
create policy "Participant can view own ledger" on public.ledger_entries
  for select using (
    exists (select 1 from public.contracts where id = contract_id and participant_id = auth.uid())
  );
create policy "Referee can view contract ledger" on public.ledger_entries
  for select using (
    exists (select 1 from public.contracts where id = contract_id and referee_id = auth.uid())
  );

-- Stripe accounts: own only
create policy "Users can view own stripe account" on public.stripe_accounts
  for select using (auth.uid() = user_id);
create policy "Users can insert own stripe account" on public.stripe_accounts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own stripe account" on public.stripe_accounts
  for update using (auth.uid() = user_id);

-- Notifications: own only
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

-- Storage bucket for weigh-in photos
insert into storage.buckets (id, name, public) values ('weighin-photos', 'weighin-photos', false);

create policy "Participant can upload photos" on storage.objects
  for insert with check (bucket_id = 'weighin-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Authenticated users can view photos" on storage.objects
  for select using (bucket_id = 'weighin-photos' and auth.role() = 'authenticated');
