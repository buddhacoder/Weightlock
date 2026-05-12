-- Push notification tokens table
create table public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

create index idx_push_tokens_user on public.push_tokens(user_id);

-- RLS: users can only manage their own tokens
alter table public.push_tokens enable row level security;

create policy "Users can view own push tokens" on public.push_tokens
  for select using (auth.uid() = user_id);

create policy "Users can insert own push tokens" on public.push_tokens
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own push tokens" on public.push_tokens
  for delete using (auth.uid() = user_id);
