-- AxA App — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- TASKS table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('anurag', 'anshuman')),
  title text not null,
  description text,
  deadline timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'missed')),
  image_urls text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SUBTASKS table
create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  label text not null,
  done boolean default false,
  position int default 0
);

-- REACTIONS table (Instagram-style reactions on tasks)
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  reactor text not null check (reactor in ('anurag', 'anshuman')),
  emoji text not null,
  created_at timestamptz default now(),
  unique(task_id, reactor, emoji)
);

-- COMMENTS table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author text not null check (author in ('anurag', 'anshuman')),
  body text not null,
  created_at timestamptz default now()
);

-- CHALLENGES table
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  from_user text not null check (from_user in ('anurag', 'anshuman')),
  to_user text not null check (to_user in ('anurag', 'anshuman')),
  title text not null,
  description text,
  deadline timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'missed', 'declined')),
  created_at timestamptz default now()
);

-- CHAT MESSAGES table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null check (sender in ('anurag', 'anshuman')),
  body text,
  image_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (open for now — both users share same account)
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table reactions enable row level security;
alter table comments enable row level security;
alter table challenges enable row level security;
alter table messages enable row level security;

-- RLS policies (allow all authenticated + anon for simplicity — this is a 2-person private app)
create policy "allow all" on tasks for all using (true) with check (true);
create policy "allow all" on subtasks for all using (true) with check (true);
create policy "allow all" on reactions for all using (true) with check (true);
create policy "allow all" on comments for all using (true) with check (true);
create policy "allow all" on challenges for all using (true) with check (true);
create policy "allow all" on messages for all using (true) with check (true);

-- Enable realtime on all tables
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table subtasks;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table challenges;
alter publication supabase_realtime add table messages;

-- Storage bucket for task images
insert into storage.buckets (id, name, public) values ('task-images', 'task-images', true) on conflict do nothing;
create policy "allow all on task-images" on storage.objects for all using (bucket_id = 'task-images') with check (bucket_id = 'task-images');
