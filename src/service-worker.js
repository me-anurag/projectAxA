/* eslint-disable no-restricted-globals */
/* global clients */
// ─────────────────────────────────────────────────────────────────────────────
// AxA Custom Service Worker
// Place this file at: src/service-worker.js
// CRA (react-scripts) automatically uses this as the SW template when present.
// It extends the default Workbox precaching with push notification handling.
//
// DO NOT rename this file. CRA specifically looks for src/service-worker.js
// ─────────────────────────────────────────────────────────────────────────────

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

// ── Precache all build assets (CRA injects the manifest here) ────────────────
precacheAndRoute(self.__WB_MANIFEST);

// ── SPA fallback — serve index.html for navigation requests ──────────────────
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// ── Cache images and static assets ───────────────────────────────────────────
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({ cacheName: 'images', plugins: [new ExpirationPlugin({ maxEntries: 50 })] })
);

// ── Skip waiting — take control immediately when new version installs ─────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATION HANDLER
// This is the critical piece that was missing.
// When the server sends a Web Push (via the Edge Function), the OS wakes up
// this service worker and fires the 'push' event below.
// Without this handler, pushes arrive at the device but are silently dropped.
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};

  try {
    // The Edge Function sends JSON: { title, body, icon, badge }
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'AxA', body: event.data ? event.data.text() : 'New notification' };
  }

  const title   = data.title   || 'AxA';
  const options = {
    body:    data.body    || '',
    icon:    data.icon    || '/icons/icon-192.jpg',
    badge:   data.badge   || '/icons/icon-192.jpg',
    vibrate: [200, 100, 200],
    tag:     `axa-push-${Date.now()}`, // unique so every push shows
    data:    { url: data.url || '/' },
    requireInteraction: false,
  };

  // event.waitUntil keeps the SW alive until the notification is shown
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Handle notification click — open/focus the app ───────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
