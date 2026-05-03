// ─────────────────────────────────────────────────────────────────────────────
// AxA Push — Supabase Edge Function
// NO external npm packages — uses only Deno built-ins and Supabase client.
// The previous version used web-push@3.6.7 from esm.sh which crashes on
// Deno v2.x with EarlyDrop (import fails at boot time).
//
// This version implements VAPID JWT signing natively using WebCrypto API
// which is built into Deno — zero imports that can fail.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:axa@example.com';
const WEBHOOK_SECRET    = Deno.env.get('WEBHOOK_SECRET')    ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// ── Base64url helpers ─────────────────────────────────────────────────────────
function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice(0, (4 - b64.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

// ── Build VAPID JWT ───────────────────────────────────────────────────────────
async function buildVapidJwt(audience: string): Promise<string> {
  const header  = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })));

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);

  // Import using JWK format — avoids PKCS8 DER encoding issues across runtimes.
  // We derive x and y from the uncompressed public key (0x04 || x || y).
  const pubBytes = base64urlDecode(VAPID_PUBLIC_KEY);
  // pubBytes[0] === 0x04 (uncompressed point marker), then 32 bytes x, 32 bytes y
  const x = base64urlEncode(pubBytes.slice(1, 33).buffer);
  const y = base64urlEncode(pubBytes.slice(33, 65).buffer);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: VAPID_PRIVATE_KEY, // already base64url
    x,
    y,
  };

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    sigInput
  );

  return `${header}.${payload}.${base64urlEncode(sig)}`;
}

// ── Send Web Push to one subscription ────────────────────────────────────────
async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
): Promise<{ sent: boolean; reason?: string }> {

  // Look up subscription from DB
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { sent: false, reason: `No subscription found for ${userId}` };
  }

  const { endpoint, p256dh, auth } = data;

  // Parse the audience (origin) from the endpoint URL
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Build VAPID JWT
  let jwt: string;
  try {
    jwt = await buildVapidJwt(audience);
  } catch (e: any) {
    return { sent: false, reason: `VAPID JWT build failed: ${e.message}` };
  }

  // The notification payload
  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.jpg',
    badge: '/icons/icon-192.jpg',
  });

  // ── Encrypt payload using Web Push encryption (RFC 8291) ──────────────────
  let encryptedBody: Uint8Array;
  try {
    encryptedBody = await encryptPayload(payload, p256dh, auth);
  } catch (e: any) {
    return { sent: false, reason: `Encryption failed: ${e.message}` };
  }

  // Send the push
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'Content-Type':  'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: encryptedBody,
  });

  if (res.status === 201 || res.status === 200) {
    return { sent: true };
  }

  // 410 = subscription expired, clean it up
  if (res.status === 410 || res.status === 404) {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return { sent: false, reason: `Subscription expired (${res.status}) — cleaned up` };
  }

  const text = await res.text().catch(() => '');
  return { sent: false, reason: `Push service returned ${res.status}: ${text.slice(0, 200)}` };
}

// ── RFC 8291 payload encryption ───────────────────────────────────────────────
// aes128gcm content encoding for Web Push
async function encryptPayload(
  plaintext: string,
  p256dhBase64: string,
  authBase64: string,
): Promise<Uint8Array> {
  const encoder   = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Decode subscription keys
  const clientPublicKey = base64urlDecode(p256dhBase64);
  const authSecret      = base64urlDecode(authBase64);

  // Generate server ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key (uncompressed, 65 bytes)
  const serverPublicKeyBuffer = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyBuffer);

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  ));

  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive pseudorandom key
  const prk = await hkdf(
    authSecret,
    sharedSecret,
    buildInfo('Content-Encoding: auth\0', new Uint8Array(0), new Uint8Array(0)),
    32
  );

  // Derive content encryption key (16 bytes for AES-128)
  const cek = await hkdf(
    salt,
    prk,
    buildInfo('Content-Encoding: aes128gcm\0', serverPublicKey, clientPublicKey),
    16
  );

  // Derive nonce (12 bytes)
  const nonce = await hkdf(
    salt,
    prk,
    buildInfo('Content-Encoding: nonce\0', serverPublicKey, clientPublicKey),
    12
  );

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);

  // Add padding byte (0x02 = last record)
  const padded = new Uint8Array(plaintextBytes.length + 1);
  padded.set(plaintextBytes);
  padded[plaintextBytes.length] = 0x02;

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

  // Build the aes128gcm header: salt (16) + rs (4) + keyid_len (1) + keyid (65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  // Concatenate header + ciphertext
  const result = new Uint8Array(header.length + ciphertext.length);
  result.set(header);
  result.set(ciphertext, header.length);
  return result;
}

// ── HKDF helper ───────────────────────────────────────────────────────────────
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    keyMaterial,
    length * 8
  );
  return new Uint8Array(bits);
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const info = new Uint8Array(typeBytes.length + clientKey.length + serverKey.length);
  info.set(typeBytes);
  info.set(clientKey, typeBytes.length);
  info.set(serverKey, typeBytes.length + clientKey.length);
  return info;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ ok: false, reason: 'Bad JSON' }, 400); }

  const type   = body.type   as string;
  const record = body.record;
  const userId = body.user_id as string;
  const results: any[] = [];

  if (type === 'message' && record) {
    const sender   = record.sender;
    const receiver = sender === 'anurag' ? 'anshuman' : 'anurag';
    const from     = sender === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
    const preview  = record.body ? String(record.body).slice(0, 80) : '📷 Image';
    results.push({ type: 'message', receiver, ...(await sendPushToUser(receiver, from, preview)) });
  }
  else if (type === 'challenge' && record) {
    const from     = record.from_user === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
    const receiver = record.to_user;
    results.push({ type: 'challenge', receiver, ...(await sendPushToUser(receiver, `⚔️ Challenge from ${from}`, record.title ?? 'New challenge!')) });
  }
  else if (type === 'ping' && userId) {
    const name  = userId === 'anurag' ? 'Anurag' : 'Anshuman';
    const emoji = userId === 'anurag' ? '⚡' : '🔥';
    results.push({ type: 'ping', userId, ...(await sendPushToUser(userId, `🔔 Ping — ${name} ${emoji}`, 'Notifications are working! AxA is live.')) });
  }
  else {
    return jsonResp({ ok: false, reason: 'Unknown type' }, 400);
  }

  console.log('[AxA push]', JSON.stringify(results));
  return jsonResp({ ok: true, results });
});