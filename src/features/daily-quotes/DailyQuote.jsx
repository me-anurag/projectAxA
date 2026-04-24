import React, { useState, useEffect, useCallback } from 'react';
import { USERS } from '../../lib/theme';
import { Icon } from '../../components/TaskCard';

const QUOTE_STORAGE_KEY = 'axa_daily_quote'; // { quote, author, date }
const MODEL = 'claude-sonnet-4-20250514';

// ── Fetch quote from Claude API ──────────────────────────────────────────────
async function fetchDailyQuote(userName) {
  const prompt = `Give me one short, powerful motivational quote (max 20 words) that would inspire a focused, ambitious person named ${userName} to crush their goals today. 
Return ONLY a JSON object with two fields: "quote" (the quote text, no quotation marks) and "author" (person's name, or "Unknown"). 
No explanation, no markdown. Pure JSON only.
Example: {"quote":"The secret of getting ahead is getting started","author":"Mark Twain"}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const raw  = data.content?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!parsed.quote) throw new Error('Bad response');
    return { quote: parsed.quote, author: parsed.author || 'Unknown' };
  } catch (err) {
    console.error('[AxA] Quote fetch failed:', err);
    // Fallback hardcoded quote if API fails
    return {
      quote: 'The secret of getting ahead is getting started.',
      author: 'Mark Twain',
    };
  }
}

// ── Should we show the quote today? ──────────────────────────────────────────
function shouldShowQuote() {
  const today = new Date().toDateString();
  try {
    const stored = JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY) || '{}');
    // Show if not yet shown today
    return stored.date !== today;
  } catch {
    return true;
  }
}

function getCachedQuote() {
  const today = new Date().toDateString();
  try {
    const stored = JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY) || '{}');
    if (stored.date === today && stored.quote) return stored;
  } catch {}
  return null;
}

function cacheQuote(quote, author) {
  localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({
    quote, author, date: new Date().toDateString(),
  }));
}

// ── Fire OS notification for the quote ────────────────────────────────────────
function fireQuoteNotification(quote, userTheme) {
  if (Notification.permission !== 'granted') return;
  const title = `${userTheme.emoji} Good Morning, ${userTheme.displayName}`;
  const body  = `"${quote.quote}" — ${quote.author}`;
  const icon  = '/icons/icon-192.jpg';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, {
        body, icon, badge: icon,
        vibrate: [120, 60, 120],
        tag: 'axa-daily-quote',
        renotify: false, // don't spam if already shown
        data: { url: '/' },
      }))
      .catch(() => {});
  }
}

// ── DailyQuote Component ──────────────────────────────────────────────────────
export default function DailyQuote({ user }) {
  const theme = USERS[user];
  const [visible, setVisible]   = useState(false);
  const [quote,   setQuote]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  // Check at 6am every minute
  const checkTime = useCallback(() => {
    const now  = new Date();
    const hour = now.getHours();

    if (hour >= 6 && shouldShowQuote()) {
      // Check for cached quote first
      const cached = getCachedQuote();
      if (cached) {
        setQuote(cached);
        setVisible(true);
        return;
      }
      // Fetch new quote
      setLoading(true);
      setVisible(true);
      fetchDailyQuote(USERS[user].displayName).then(q => {
        cacheQuote(q.quote, q.author);
        setQuote(q);
        setLoading(false);
        // Also fire OS notification (reaches lock screen / notification shade)
        fireQuoteNotification(q, USERS[user]);
      });
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
    // Check immediately on mount
    checkTime();
    // Then check every 60 seconds
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [checkTime]);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Mark as shown today so it doesn't reappear until tomorrow
    if (quote) cacheQuote(quote.quote, quote.author);
  }, [quote]);

  if (!visible || !mounted) return null;

  return (
    <div style={styles.overlay} onClick={dismiss}>
      <div
        style={{
          ...styles.card,
          background: theme.surface,
          border: `1px solid ${theme.borderHigh}`,
          boxShadow: `0 0 40px ${theme.glow}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div style={{ ...styles.accentBar, background: theme.btnGradient }} />

        {/* Quote icon */}
        <div style={{ ...styles.quoteIconWrap, color: theme.primary }}>
          <Icon name="quote" size={28} color={theme.primary} strokeWidth={1.4} />
        </div>

        {loading ? (
          <div style={{ ...styles.loadingText, color: theme.textMuted }}>
            <span style={styles.pulse}>Fetching your daily dose of fire...</span>
          </div>
        ) : quote ? (
          <>
            <p style={{ ...styles.quoteText, color: theme.text }}>
              "{quote.quote}"
            </p>
            <p style={{ ...styles.authorText, color: theme.textMuted }}>
              — {quote.author}
            </p>
          </>
        ) : null}

        {/* Date + user label */}
        <div style={{ ...styles.metaRow }}>
          <span style={{ ...styles.metaText, color: theme.textMuted }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <span style={{ ...styles.metaUser, color: theme.primary }}>
            {theme.displayName} {theme.emoji}
          </span>
        </div>

        {/* Dismiss */}
        <button style={{ ...styles.dismissBtn, color: theme.textMuted }} onClick={dismiss}>
          <Icon name="x" size={14} color={theme.textMuted} />
          <span>Tap anywhere to dismiss</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.82)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backdropFilter: 'blur(6px)',
    animation: 'fadeIn 0.4s ease',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: '28px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    animation: 'slideInUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  quoteIconWrap: {
    opacity: 0.6,
    marginBottom: 4,
  },
  quoteText: {
    fontSize: 17,
    fontWeight: 700,
    fontFamily: 'Syne, sans-serif',
    lineHeight: 1.55,
    letterSpacing: '-0.3px',
    textAlign: 'center',
  },
  authorText: {
    fontSize: 12,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.5px',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Space Mono, monospace',
    textAlign: 'center',
    padding: '16px 0',
  },
  pulse: {
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingTop: 12,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  metaText: {
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.3px',
  },
  metaUser: {
    fontSize: 11,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.3px',
    marginTop: 4,
    opacity: 0.5,
  },
};
