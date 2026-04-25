// ─────────────────────────────────────────────────────────────────────────────
// AxA Push — Supabase Edge Function
// Handles ALL push notification types:
//   1. New message   → triggered by Database Webhook on messages INSERT
//   2. New challenge → triggered by Database Webhook on challenges INSERT
//   3. Ping test     → triggered manually from app
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import webpush from 'https://esm.sh/web-push@3.6.7?deno-std=0.177.0';

// ── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ── VAPID credentials ─────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:axa@example.com';
const WEBHOOK_SECRET    = Deno.env.get('WEBHOOK_SECRET')    ?? '';

// ── CORS headers — required so browser preflight (OPTIONS) doesn't get 405 ───
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Helper: JSON response with CORS ──────────────────────────────────────────
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB PUSH SENDER
// ─────────────────────────────────────────────────────────────────────────────
function initWebPush() {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  icon = '/icons/icon-192.jpg'
): Promise<{ sent: boolean; reason?: string }> {
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
      TTL: 86400,
      urgency: 'high',
    });
    return { sent: true };
  } catch (e: any) {
    if (e?.statusCode === 410 || e?.statusCode === 404) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    }
    return { sent: false, reason: e?.message ?? 'unknown error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // ── CORS preflight — browsers send this before every cross-origin POST ──────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Only allow POST beyond this point ────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // ── Verify webhook secret ────────────────────────────────────────────────────
  const secret = req.headers.get('x-webhook-secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, reason: 'Bad JSON' }, 400);
  }

  initWebPush();

  const type   = body.type   as string;
  const record = body.record;
  const userId = body.user_id as string;

  const results: any[] = [];

  // ── 1. New message ───────────────────────────────────────────────────────────
  if (type === 'message' && record) {
    const sender   = record.sender;
    const receiver = sender === 'anurag' ? 'anshuman' : 'anurag';
    const from     = sender === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
    const preview  = record.body ? String(record.body).slice(0, 80) : '📷 Sent an image';

    const result = await sendPushToUser(receiver, from, preview);
    results.push({ type: 'message', receiver, ...result });
  }

  // ── 2. New challenge ─────────────────────────────────────────────────────────
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

  // ── 3. Ping test ─────────────────────────────────────────────────────────────
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
    return jsonResponse({ ok: false, reason: 'Unknown type or missing record' }, 400);
  }

  console.log('[AxA push]', JSON.stringify(results));
  return jsonResponse({ ok: true, results });
});