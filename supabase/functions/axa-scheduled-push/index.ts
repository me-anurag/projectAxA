// supabase/functions/axa-scheduled-push/index.ts
//
// Supabase Edge Function — runs on Deno
// Triggered by pg_cron at:
//   00:30 UTC → 6:00 AM IST  → sends daily quote push to both users
//   04:30 UTC → 10:00 AM IST → sends mission nudge to users with 0 tasks today
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   VAPID_PUBLIC_KEY   — from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY  — from: npx web-push generate-vapid-keys
//   VAPID_SUBJECT      — mailto:your@email.com
//   ANTHROPIC_API_KEY  — your Anthropic API key
//   SUPABASE_URL       — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')!;
const ANTHROPIC_KEY     = Deno.env.get('ANTHROPIC_API_KEY')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const USERS = {
  anurag:   { displayName: 'Anurag',   emoji: '⚡' },
  anshuman: { displayName: 'Anshuman', emoji: '🔥' },
};

// ── Fetch a personalised quote from Claude ─────────────────────────────────
async function fetchQuote(userName: string): Promise<{ quote: string; author: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Give me one short powerful motivational quote (max 20 words) for an ambitious person named ${userName} preparing for SSC CGL 2026. Return ONLY JSON: {"quote":"...","author":"..."}. No markdown, no explanation.`,
        }],
      }),
    });
    const data  = await res.json();
    const raw   = data.content?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!parsed.quote) throw new Error('Bad response');
    return { quote: parsed.quote, author: parsed.author || 'Unknown' };
  } catch {
    return { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' };
  }
}

// ── Send Web Push to all subscriptions for a user ─────────────────────────
async function pushToUser(userId: string, payload: object): Promise<void> {
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subs?.length) {
    console.log(`[AXA] No subscriptions for ${userId}`);
    return;
  }

  const payloadStr = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr,
      ).catch(async (err: { statusCode?: number }) => {
        // 410 Gone = subscription expired/revoked — clean it up
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          console.log(`[AXA] Removed expired subscription for ${userId}`);
        }
        throw err;
      })
    )
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[AXA] ${userId}: ${sent} sent, ${failed} failed`);
}

// ── Handler: daily_quote ──────────────────────────────────────────────────
async function handleDailyQuote(): Promise<void> {
  console.log('[AXA] Running daily_quote push');

  // Fetch personalised quotes for both users in parallel
  const [anuragQuote, anshumanQuote] = await Promise.all([
    fetchQuote('Anurag'),
    fetchQuote('Anshuman'),
  ]);

  await Promise.all([
    pushToUser('anurag', {
      type:  'daily_quote',
      title: '⚡ Good Morning, Anurag',
      body:  `"${anuragQuote.quote}" — ${anuragQuote.author}`,
      url:   '/',
    }),
    pushToUser('anshuman', {
      type:  'daily_quote',
      title: '🔥 Good Morning, Anshuman',
      body:  `"${anshumanQuote.quote}" — ${anshumanQuote.author}`,
      url:   '/',
    }),
  ]);
}

// ── Handler: mission_nudge ────────────────────────────────────────────────
async function handleMissionNudge(): Promise<void> {
  console.log('[AXA] Running mission_nudge push');

  // Get today's date range in UTC (covers full IST day up to 10am)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  for (const [userId, user] of Object.entries(USERS)) {
    // Count tasks created today for this user
    const { count, error } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('owner', userId)
      .gte('created_at', todayStart.toISOString());

    if (error) { console.error(`[AXA] nudge query error for ${userId}:`, error); continue; }

    if ((count ?? 0) === 0) {
      console.log(`[AXA] ${userId} has 0 missions today — sending nudge`);
      await pushToUser(userId, {
        type:  'mission_nudge',
        title: `${user.emoji} No missions yet, ${user.displayName}`,
        body:  "It's 10am. What's the plan for today? Set a mission — own the day.",
        url:   '/',
      });
    } else {
      console.log(`[AXA] ${userId} already has ${count} mission(s) — no nudge`);
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json() as { type?: string };
    const type = body?.type;

    if (type === 'daily_quote') {
      await handleDailyQuote();
      return new Response(JSON.stringify({ ok: true, type }), { status: 200 });
    }

    if (type === 'mission_nudge') {
      await handleMissionNudge();
      return new Response(JSON.stringify({ ok: true, type }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400 });
  } catch (err) {
    console.error('[AXA] Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
