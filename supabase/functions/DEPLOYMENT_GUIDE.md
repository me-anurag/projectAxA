# AxA Push Notifications — Deployment Guide
## Complete step-by-step. Do this once.

---

## STEP 1 — Generate VAPID keys (on your computer, once)

VAPID keys are the cryptographic credentials that authorize your server
to send Web Push notifications to devices. Generate them once and keep them safe.

```bash
npx web-push generate-vapid-keys
```

Output looks like:
```
Public Key:
BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Save both. You'll use them in Steps 2 and 3.

---

## STEP 2 — Add secrets to Supabase

In your Supabase dashboard:
→ Settings → Edge Functions → Secrets → Add new secret

Add these 4 secrets:

| Key | Value |
|-----|-------|
| VAPID_PUBLIC_KEY | Your public key from Step 1 |
| VAPID_PRIVATE_KEY | Your private key from Step 1 |
| VAPID_SUBJECT | mailto:anurag@example.com (any email) |
| ANTHROPIC_API_KEY | Your Anthropic API key |

SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically — don't add them.

---

## STEP 3 — Add VAPID public key to Vercel

In your Vercel project:
→ Settings → Environment Variables → Add

| Key | Value |
|-----|-------|
| REACT_APP_VAPID_PUBLIC_KEY | Your PUBLIC key from Step 1 |

⚠️ Only the PUBLIC key goes to Vercel. Never put the private key in frontend code.

Redeploy after adding (or trigger a new commit).

---

## STEP 4 — Run the SQL in Supabase

In Supabase dashboard:
→ SQL Editor → New Query → paste contents of PUSH_SCHEMA.sql → Run

This creates the push_subscriptions table.

For the cron schedules in PUSH_SCHEMA.sql:
1. Replace YOUR_PROJECT_REF with your actual Supabase project ref
   (found in: Settings → General → Reference ID)
2. Replace YOUR_SERVICE_ROLE_KEY with your service role key
   (found in: Settings → API → service_role key)
3. Enable pg_cron extension first:
   → Dashboard → Database → Extensions → search "pg_cron" → Enable
4. Enable pg_net extension (for HTTP calls from cron):
   → Dashboard → Database → Extensions → search "pg_net" → Enable
5. Then run the cron.schedule() calls from the SQL file

---

## STEP 5 — Deploy the Edge Function

Install Supabase CLI if you don't have it:
```bash
npm install -g supabase
```

Login and link your project:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy the function:
```bash
supabase functions deploy axa-scheduled-push --no-verify-jwt
```

The --no-verify-jwt flag is needed because the cron job calls this function
directly (not through a user session).

---

## STEP 6 — Test it manually

Test the daily quote push:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/axa-scheduled-push \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"daily_quote"}'
```

Test the mission nudge:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/axa-scheduled-push \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"mission_nudge"}'
```

Both should return: {"ok":true,"type":"..."} 
And notifications should appear on your phone within seconds.

---

## STEP 7 — Both users open the app once after deployment

When Anurag and Anshuman each open the app after this deploy:
1. Browser asks for notification permission
2. If granted, the app saves their device's push subscription to Supabase
3. From then on, the Edge Function can push to their devices

Both users must do this on the device they want to receive notifications on.
If they use multiple devices, each device registers separately.

---

## HOW IT ALL WORKS (for future reference)

```
06:00 AM IST daily:
  pg_cron → POST /functions/axa-scheduled-push {"type":"daily_quote"}
    → Claude API → personalised quote for each user
    → webpush.sendNotification() → Google/Apple push servers
    → device OS shows notification even if app is closed

10:00 AM IST daily:
  pg_cron → POST /functions/axa-scheduled-push {"type":"mission_nudge"}
    → query tasks table: count tasks created today per user
    → if count = 0 → send nudge notification to that user only
    → if count > 0 → skip (they're already working)

Realtime (while app is open):
  New message → Supabase realtime → usePushNotifications → OS notification
  New challenge → Supabase realtime → usePushNotifications → OS notification
  Daily quote fetched → DailyQuote.jsx → OS notification + in-app overlay
```

---

## NOTIFICATION SCHEDULE SUMMARY

| Time (IST) | Trigger | Who receives |
|-----------|---------|--------------|
| 6:00 AM | Daily quote | Both users always |
| 10:00 AM | No mission nudge | Only users with 0 tasks today |
| Anytime | New message | Recipient only |
| Anytime | New challenge | Recipient only |

---

## TROUBLESHOOTING

**Notifications not arriving:**
- Check that the user opened the app and granted permission after this deploy
- Verify push_subscriptions table has rows (Supabase → Table Editor)
- Test Edge Function manually with the curl commands above
- Check Edge Function logs: Supabase → Edge Functions → axa-scheduled-push → Logs

**"No subscriptions for user" in logs:**
- User hasn't opened the app since deploy, or denied permission
- Ask them to open the app and allow notifications

**Cron not firing:**
- Verify pg_cron and pg_net extensions are enabled
- Check cron.job table: SELECT * FROM cron.job;
- Check cron.job_run_details for errors: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

**iOS not receiving when app is closed:**
- Must be installed as PWA (Add to Home Screen), not just a browser tab
- Requires iOS 16.4 or later
- User must have granted notification permission
