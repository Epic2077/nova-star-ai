-- Personal Memories — per-user cross-chat memory (no partnership required)
-- Run this in your Supabase SQL Editor.

create table if not exists public.personal_memories (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  category text not null default 'general'
    check (category in (
      'preference',
      'emotional_need',
      'important_date',
      'growth_moment',
      'pattern',
      'goal',
      'general'
    )),

  content text not null,

  confidence float not null default 1.0
    check (confidence >= 0 and confidence <= 1),

  is_active boolean not null default true,

  source_message_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_personal_memories_user_active
  on public.personal_memories (user_id, is_active)
  where is_active = true;

create index if not exists idx_personal_memories_user_category
  on public.personal_memories (user_id, category);

-- RLS
alter table public.personal_memories enable row level security;

-- Service role can do everything (used by the AI extraction process)
create policy "Service role full access on personal_memories"
  on public.personal_memories
  for all
  using (true)
  with check (true);

-- Authenticated users can read their own memories
create policy "Users can read own personal memories"
  on public.personal_memories
  for select
  to authenticated
  using (auth.uid() = user_id);
