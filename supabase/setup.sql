-- ─────────────────────────────────────────────────────────────────────────────
-- AxA Push Subscriptions Table
-- Run this in Supabase SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the table
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null unique,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  updated_at timestamptz default now()
);

-- 2. Enable RLS and allow all (app uses anon key, both users share the table)
alter table push_subscriptions enable row level security;

drop policy if exists "allow all" on push_subscriptions;
create policy "allow all" on push_subscriptions
  for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- DATABASE WEBHOOKS
-- These fire the Edge Function the instant a message or challenge is inserted.
-- Set these up in: Supabase Dashboard → Database → Webhooks → Create Webhook
--
-- WEBHOOK 1 — New Message:
--   Name:    axa-new-message
--   Table:   messages
--   Events:  INSERT
--   URL:     https://YOUR_PROJECT_REF.supabase.co/functions/v1/axa-push
--   Headers:
--     Content-Type: application/json
--     x-webhook-secret: (your WEBHOOK_SECRET value)
--   HTTP Body (choose "Custom Payload"):
--     {
--       "type": "message",
--       "record": {{ .record | toJson }}
--     }
--
-- WEBHOOK 2 — New Challenge:
--   Name:    axa-new-challenge
--   Table:   challenges
--   Events:  INSERT
--   URL:     https://YOUR_PROJECT_REF.supabase.co/functions/v1/axa-push
--   Headers:
--     Content-Type: application/json
--     x-webhook-secret: (your WEBHOOK_SECRET value)
--   HTTP Body (choose "Custom Payload"):
--     {
--       "type": "challenge",
--       "record": {{ .record | toJson }}
--     }
-- ─────────────────────────────────────────────────────────────────────────────
