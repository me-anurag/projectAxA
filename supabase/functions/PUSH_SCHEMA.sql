-- ─────────────────────────────────────────────────────────────────────────────
-- AXA PUSH SUBSCRIPTIONS TABLE
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Table to store each device's Web Push subscription object.
-- When a user grants notification permission, the app saves their
-- device's push endpoint + keys here so the Edge Function can push to them.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,            -- 'anurag' or 'anshuman'
  endpoint    text not null unique,     -- Push service URL (unique per device)
  p256dh      text not null,            -- Encryption key
  auth        text not null,            -- Auth secret
  created_at  timestamptz default now()
);

-- Allow all operations (same pattern as rest of app — no auth)
alter table push_subscriptions enable row level security;
create policy "allow all" on push_subscriptions for all using (true) with check (true);

-- Enable realtime (not strictly needed but consistent)
alter publication supabase_realtime add table push_subscriptions;


-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEDULE THE EDGE FUNCTION
-- After deploying the Edge Function (see DEPLOYMENT_GUIDE.md),
-- run this to schedule it with pg_cron.
-- Times are in UTC. India (IST) = UTC + 5:30
--   6:00 AM IST = 00:30 UTC
--  10:00 AM IST = 04:30 UTC
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron extension (only needed once per project)
-- Go to: Dashboard → Database → Extensions → search "pg_cron" → Enable

-- Schedule the 6am IST daily quote push (00:30 UTC)
select cron.schedule(
  'axa-daily-quote-push',
  '30 0 * * *',
  $$
  select net.http_post(
    url    := 'https://vfcnrsapoxlclktpmlwd.supabase.co/functions/v1/axa-scheduled-push',
    body   := '{"type":"daily_quote"}'::jsonb,
    headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmY25yc2Fwb3hsY2xrdHBtbHdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUzMzIwOSwiZXhwIjoyMDkyMTA5MjA5fQ.PiaO8GV0oUD6driDdIsTq5mmjm2lDkim3v6xhzQedtA","Content-Type":"application/json"}'::jsonb
  )
  $$
);

-- Schedule the 10am IST no-mission nudge (04:30 UTC)
select cron.schedule(
  'axa-mission-nudge',
  '30 4 * * *',
  $$
  select net.http_post(
    url    := 'https://vfcnrsapoxlclktpmlwd.supabase.co/functions/v1/axa-scheduled-push',
    body   := '{"type":"mission_nudge"}'::jsonb,
    headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmY25yc2Fwb3hsY2xrdHBtbHdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUzMzIwOSwiZXhwIjoyMDkyMTA5MjA5fQ.PiaO8GV0oUD6driDdIsTq5mmjm2lDkim3v6xhzQedtA","Content-Type":"application/json"}'::jsonb
  )
  $$
);

-- To verify schedules are set:
-- select * from cron.job;

-- To remove a schedule:
-- select cron.unschedule('axa-daily-quote-push');
-- select cron.unschedule('axa-mission-nudge');
