import React, { useState, useEffect, useCallback } from 'react';
import { USERS } from '../../lib/theme';
import { Icon } from '../../components/TaskCard';

const QUOTE_STORAGE_KEY = 'axa_daily_quote';

// ── 60 handpicked quotes — rotates by day of year, never repeats for 60 days ─
const QUOTES = [
  { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { quote: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { quote: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { quote: 'The harder you work for something, the greater you\'ll feel when you achieve it.', author: 'Unknown' },
  { quote: 'Dream bigger. Do bigger.', author: 'Unknown' },
  { quote: 'Don\'t stop when you\'re tired. Stop when you\'re done.', author: 'Unknown' },
  { quote: 'Wake up with determination. Go to bed with satisfaction.', author: 'Unknown' },
  { quote: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
  { quote: 'Little things make big days.', author: 'Unknown' },
  { quote: 'It\'s going to be hard, but hard is not impossible.', author: 'Unknown' },
  { quote: 'Don\'t wait for opportunity. Create it.', author: 'Unknown' },
  { quote: 'First, have a definite, clear practical ideal — a goal, an objective.', author: 'Aristotle' },
  { quote: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { quote: 'An unexamined life is not worth living.', author: 'Socrates' },
  { quote: 'Spread love everywhere you go.', author: 'Mother Teresa' },
  { quote: 'When you reach the end of your rope, tie a knot in it and hang on.', author: 'Franklin D. Roosevelt' },
  { quote: 'Always remember that you are absolutely unique.', author: 'Margaret Mead' },
  { quote: 'You will face many defeats in life, but never let yourself be defeated.', author: 'Maya Angelou' },
  { quote: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela' },
  { quote: 'In the end, it\'s not the years in your life that count. It\'s the life in your years.', author: 'Abraham Lincoln' },
  { quote: 'Life is either a daring adventure or nothing at all.', author: 'Helen Keller' },
  { quote: 'You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.', author: 'Dr. Seuss' },
  { quote: 'If life were predictable it would cease to be life, and be without flavor.', author: 'Eleanor Roosevelt' },
  { quote: 'Spread love everywhere you go. Let no one ever come to you without leaving happier.', author: 'Mother Teresa' },
  { quote: 'Many of life\'s failures are people who did not realize how close they were to success when they gave up.', author: 'Thomas A. Edison' },
  { quote: 'You only live once, but if you do it right, once is enough.', author: 'Mae West' },
  { quote: 'In three words I can sum up everything I\'ve learned about life: it goes on.', author: 'Robert Frost' },
  { quote: 'If you look at what you have in life, you\'ll always have more.', author: 'Oprah Winfrey' },
  { quote: 'If you set your goals ridiculously high and it\'s a failure, you will fail above everyone else\'s success.', author: 'James Cameron' },
  { quote: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { quote: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { quote: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { quote: 'Opportunities don\'t happen. You create them.', author: 'Chris Grosser' },
  { quote: 'Love your family, work super hard, live your passion.', author: 'Gary Vaynerchuk' },
  { quote: 'It is never too late to be what you might have been.', author: 'George Eliot' },
  { quote: 'Strive not to be a success, but rather to be of value.', author: 'Albert Einstein' },
  { quote: 'Two roads diverged in a wood, and I took the one less traveled by.', author: 'Robert Frost' },
  { quote: 'I attribute my success to this: I never gave or took any excuse.', author: 'Florence Nightingale' },
  { quote: 'I would rather die of passion than of boredom.', author: 'Vincent van Gogh' },
  { quote: 'If you can dream it, you can achieve it.', author: 'Zig Ziglar' },
  { quote: 'Life is short, and it is here to be lived.', author: 'Kate Winslet' },
  { quote: 'A person who never made a mistake never tried anything new.', author: 'Albert Einstein' },
  { quote: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky' },
  { quote: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { quote: 'Whether you think you can or you think you can\'t, you\'re right.', author: 'Henry Ford' },
  { quote: 'I have not failed. I\'ve just found 10,000 ways that won\'t work.', author: 'Thomas Edison' },
  { quote: 'The only limit to our realization of tomorrow will be our doubts of today.', author: 'Franklin D. Roosevelt' },
  { quote: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { quote: 'Hardships often prepare ordinary people for an extraordinary destiny.', author: 'C.S. Lewis' },
  { quote: 'Darkness cannot drive out darkness; only light can do that.', author: 'Martin Luther King Jr.' },
  { quote: 'Try to be a rainbow in someone\'s cloud.', author: 'Maya Angelou' },
  { quote: 'Not everything that is faced can be changed, but nothing can be changed until it is faced.', author: 'James Baldwin' },
  { quote: 'At the end of the day, whether or not those people are comfortable with how you\'re living your life is irrelevant.', author: 'Diane von Furstenberg' },
  { quote: 'Certain things catch your eye, but pursue only those that capture the heart.', author: 'Ancient Indian Proverb' },
  { quote: 'Believe in yourself, take on your challenges, dig deep within yourself to conquer fears.', author: 'Chantal Sutherland' },
  { quote: 'No man ever stepped in the same river twice, for it\'s not the same river and he\'s not the same man.', author: 'Heraclitus' },
  { quote: 'Build your own dreams, or someone else will hire you to build theirs.', author: 'Farrah Gray' },
  { quote: 'The battles that count aren\'t the ones for gold medals. The struggles within yourself are the ones that matter.', author: 'Jesse Owens' },
  { quote: 'Education costs money, but then so does ignorance.', author: 'Sir Claus Moser' },
  { quote: 'I have learned over the years that when one\'s mind is made up, this diminishes fear.', author: 'Rosa Parks' },
];

// Pick quote by day of year so it changes daily and cycles through all quotes
function getTodaysQuote() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff  = now - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
function shouldShowQuote() {
  try {
    const stored = JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY) || '{}');
    return stored.date !== new Date().toDateString();
  } catch { return true; }
}

function getCachedQuote() {
  try {
    const stored = JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY) || '{}');
    if (stored.date === new Date().toDateString() && stored.quote) return stored;
  } catch {}
  return null;
}

function cacheQuote(quote, author) {
  localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({
    quote, author, date: new Date().toDateString(),
  }));
}

// ── Fire OS notification for the quote ───────────────────────────────────────
function fireQuoteNotification(q, userTheme) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = `${userTheme.emoji} Good Morning, ${userTheme.displayName}`;
  const body  = `"${q.quote}" — ${q.author}`;
  const icon  = '/icons/icon-192.jpg';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, {
        body, icon, badge: icon,
        vibrate: [120, 60, 120],
        tag: 'axa-daily-quote',
        renotify: false,
        data: { url: '/' },
      }))
      .catch(() => {});
  }
}

// ── DailyQuote Component ──────────────────────────────────────────────────────
export default function DailyQuote({ user }) {
  const theme = USERS[user];
  const [visible, setVisible] = useState(false);
  const [quote,   setQuote]   = useState(null);
  const [mounted, setMounted] = useState(false);

  const checkTime = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && shouldShowQuote()) {
      const cached = getCachedQuote();
      if (cached) {
        setQuote(cached);
        setVisible(true);
        return;
      }
      // Get today's quote from the local bank — instant, no API call
      const q = getTodaysQuote();
      cacheQuote(q.quote, q.author);
      setQuote(q);
      setVisible(true);
      fireQuoteNotification(q, USERS[user]);
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [checkTime]);

  const dismiss = useCallback(() => {
    setVisible(false);
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
        <div style={{ ...styles.accentBar, background: theme.btnGradient }} />

        <div style={{ opacity: 0.6, marginBottom: 4 }}>
          <Icon name="quote" size={28} color={theme.primary} strokeWidth={1.4} />
        </div>

        {quote && (
          <>
            <p style={{ ...styles.quoteText, color: theme.text }}>
              "{quote.quote}"
            </p>
            <p style={{ ...styles.authorText, color: theme.textMuted }}>
              — {quote.author}
            </p>
          </>
        )}

        <div style={styles.metaRow}>
          <span style={{ ...styles.metaText, color: theme.textMuted }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <span style={{ ...styles.metaUser, color: theme.primary }}>
            {theme.displayName} {theme.emoji}
          </span>
        </div>

        <button style={{ ...styles.dismissBtn, color: theme.textMuted }} onClick={dismiss}>
          <Icon name="x" size={14} color={theme.textMuted} />
          <span>Tap anywhere to dismiss</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(6px)', animation: 'fadeIn 0.4s ease' },
  card:       { width: '100%', maxWidth: 360, padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden', animation: 'slideInUp 0.4s cubic-bezier(0.34,1.56,0.64,1)' },
  accentBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  quoteText:  { fontSize: 17, fontWeight: 700, fontFamily: 'Syne, sans-serif', lineHeight: 1.55, letterSpacing: '-0.3px', textAlign: 'center' },
  authorText: { fontSize: 12, fontFamily: 'Space Mono, monospace', letterSpacing: '0.5px', textAlign: 'center' },
  metaRow:    { display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' },
  metaText:   { fontSize: 10, fontFamily: 'Space Mono, monospace', letterSpacing: '0.3px' },
  metaUser:   { fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 700 },
  dismissBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontFamily: 'Space Mono, monospace', letterSpacing: '0.3px', marginTop: 4, opacity: 0.5 },
};
