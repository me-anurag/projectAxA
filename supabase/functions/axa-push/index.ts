// ─────────────────────────────────────────────────────────────────────────────
// AxA Push — Supabase Edge Function
// Handles ALL push notification types:
//   1. New message   → triggered by Database Webhook on messages INSERT
//   2. New challenge → triggered by Database Webhook on challenges INSERT
//   3. Ping test     → triggered manually from app
//
// Secrets needed in Supabase Dashboard → Settings → Edge Function Secrets:
//   VAPID_PUBLIC_KEY      from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY     from: npx web-push generate-vapid-keys
//   VAPID_SUBJECT         e.g.  mailto:anurag@example.com
//   WEBHOOK_SECRET        any random string you choose (e.g. "axa_webhook_2026")
//   SUPABASE_URL          auto-injected
//   SUPABASE_SERVICE_ROLE_KEY  auto-injected
//
// HOW WEB PUSH WORKS (so you understand what's happening):
//   Your app subscribes to the browser's push service (FCM for Android Chrome,
//   APNs for iOS Safari). The subscription has an endpoint URL + encryption keys.
//   We store that in the push_subscriptions table.
//   When this function runs, it sends an encrypted HTTP POST to that endpoint.
//   The browser's push service (Google/Apple) delivers it to the phone OS.
//   The OS wakes up the service worker and shows the notification.
//   This works even when the app and phone are completely off/asleep.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ── Supabase client (service role — can read all rows) ────────────────────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ── VAPID credentials ─────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:axa@example.com';
const WEBHOOK_SECRET    = Deno.env.get('WEBHOOK_SECRET')    ?? '';

// ─────────────────────────────────────────────────────────────────────────────
// WEB PUSH SENDER
// Uses the web-push npm package via esm.sh — handles all the VAPID signing
// and AES-GCM payload encryption that Web Push requires.
// ─────────────────────────────────────────────────────────────────────────────
// Note: We use the webpush-webcrypto package which works in Deno's WebCrypto env
import webpush from 'https://esm.sh/web-push@3.6.7?deno-std=0.177.0';

function initWebPush() {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  icon = '/icons/icon-192.jpg'
): Promise<{ sent: boolean; reason?: string }> {
  // Get this user's push subscription from DB
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { sent: false, reason: `No subscription for ${userId}` };
  }

  const subscription = {
    endpoint: data.endpoint,
    keys: { p256dh: data.p256dh, auth: data.auth },
  };

  const payload = JSON.stringify({ title, body, icon, badge: '/icons/icon-192.jpg' });

  try {
    await webpush.sendNotification(subscription, payload, {
      TTL: 86400, // keep trying for 24h if device is offline
      urgency: 'high',
    });
    return { sent: true };
  } catch (e: any) {
    // 410 Gone = subscription expired/user revoked permission
    if (e?.statusCode === 410 || e?.statusCode === 404) {
      // Clean up dead subscription
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    }
    return { sent: false, reason: e?.message ?? 'unknown error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook secret header (security — prevents random internet calls)
  const secret = req.headers.get('x-webhook-secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  initWebPush();

  const type   = body.type as string;   // 'message' | 'challenge' | 'ping'
  const record = body.record;            // the new DB row (from webhook)
  const userId = body.user_id as string; // for ping: who to notify

  const results: any[] = [];

  // ── 1. New message ──────────────────────────────────────────────────────────
  if (type === 'message' && record) {
    const sender   = record.sender;
    const receiver = sender === 'anurag' ? 'anshuman' : 'anurag';
    const from     = sender === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
    const preview  = record.body ? String(record.body).slice(0, 80) : '📷 Sent an image';

    const result = await sendPushToUser(receiver, from, preview);
    results.push({ type: 'message', receiver, ...result });
  }

  // ── 2. New challenge ────────────────────────────────────────────────────────
  else if (type === 'challenge' && record) {
    const from     = record.from_user === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
    const receiver = record.to_user;

    const result = await sendPushToUser(
      receiver,
      `⚔️ Challenge from ${from}`,
      record.title ?? 'You have a new challenge!'
    );
    results.push({ type: 'challenge', receiver, ...result });
  }

  // ── 3. Ping test ────────────────────────────────────────────────────────────
  else if (type === 'ping' && userId) {
    const displayName = userId === 'anurag' ? 'Anurag' : 'Anshuman';
    const emoji       = userId === 'anurag' ? '⚡' : '🔥';

    const result = await sendPushToUser(
      userId,
      `🔔 Ping — ${displayName} ${emoji}`,
      'Notifications are working! AxA is live.'
    );
    results.push({ type: 'ping', userId, ...result });
  }

  else {
    return new Response(JSON.stringify({ ok: false, reason: 'Unknown type or missing record' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('[AxA push]', JSON.stringify(results));
  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
