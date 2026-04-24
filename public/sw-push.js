// public/sw-push.js
// Custom service worker push handler
// This file is imported by the CRA-generated service-worker.js via workbox
// It handles push events sent by the Supabase Edge Function

// ── Handle push events from server (Edge Function) ─────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'AxA', body: event.data.text() };
  }

  const title   = payload.title || 'AxA';
  const options = {
    body:    payload.body  || '',
    icon:    '/icons/icon-192.jpg',
    badge:   '/icons/icon-192.jpg',
    vibrate: [150, 80, 150, 80, 150],
    tag:     payload.type  || 'axa-push',
    renotify: true,
    data:    { url: payload.url || '/' },
    // Actions let the user tap without opening the app
    actions: payload.type === 'mission_nudge' ? [
      { action: 'open', title: '🚀 Set a Mission' },
      { action: 'dismiss', title: 'Dismiss' },
    ] : [
      { action: 'open', title: 'Open AxA' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Handle notification click ──────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ── Handle SKIP_WAITING message from app (auto-update) ────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
