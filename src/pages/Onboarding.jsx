import React, { useState, useRef, useEffect } from 'react';
import { USERS } from '../lib/theme';
import { playClick } from '../lib/sounds';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH DESIGN
//
// Passphrases are stored in environment variables — never in source code.
// REACT_APP_PIN_ANURAG and REACT_APP_PIN_ANSHUMAN in .env.local + Vercel.
//
// Defaults (if env vars not set): storm2026 / ember2026
//
// Auth state stored in localStorage as `axa_auth_${userId}` = '1'
// Once authenticated on a device, never asked again unless localStorage cleared.
//
// Wrong passphrase → shake animation + error, input cleared.
// ─────────────────────────────────────────────────────────────────────────────

const PASSPHRASES = {
  anurag:   process.env.REACT_APP_PIN_ANURAG    || 'storm2026',
  anshuman: process.env.REACT_APP_PIN_ANSHUMAN  || 'ember2026',
};

function isAuthenticated(userId) {
  return localStorage.getItem(`axa_auth_${userId}`) === '1';
}

function saveAuth(userId) {
  localStorage.setItem(`axa_auth_${userId}`, '1');
}

export default function Onboarding({ onSelect }) {
  const [hovering,    setHovering]    = useState(null);
  // null = user select screen, 'anurag'|'anshuman' = passphrase screen
  const [authTarget,  setAuthTarget]  = useState(null);
  const [passphrase,  setPassphrase]  = useState('');
  const [error,       setError]       = useState('');
  const [shaking,     setShaking]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const inputRef = useRef(null);

  // Focus input when auth screen appears
  useEffect(() => {
    if (authTarget) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [authTarget]);

  const handleCardTap = (userId) => {
    playClick();
    // Already authenticated on this device → go straight in
    if (isAuthenticated(userId)) {
      localStorage.setItem('axa_user', userId);
      onSelect(userId);
      return;
    }
    // Show passphrase screen
    setAuthTarget(userId);
    setPassphrase('');
    setError('');
  };

  const handleSubmit = () => {
    const target = authTarget;
    const correct = PASSPHRASES[target];
    if (passphrase === correct) {
      playClick();
      saveAuth(target);
      localStorage.setItem('axa_user', target);
      onSelect(target);
    } else {
      // Wrong — shake and show error
      setShaking(true);
      setError('Wrong passphrase. Try again.');
      setPassphrase('');
      setTimeout(() => {
        setShaking(false);
        inputRef.current?.focus();
      }, 500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { setAuthTarget(null); setError(''); }
  };

  const user = authTarget ? USERS[authTarget] : null;

  // ── Passphrase screen ───────────────────────────────────────────────────────
  if (authTarget && user) {
    return (
      <div style={styles.root}>
        <div style={styles.bgLeft} />
        <div style={styles.bgRight} />

        <div style={{
          ...styles.authCard,
          border: `1px solid ${user.borderHigh}`,
          background: user.surface,
          boxShadow: `0 0 40px ${user.glow}`,
          animation: shaking ? 'axa-shake 0.45s ease' : 'slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: user.btnGradient }} />

          {/* User identity */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{user.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: user.text, letterSpacing: '-0.4px' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: user.textMuted, marginTop: 4, letterSpacing: '1.5px' }}>
              ENTER PASSPHRASE
            </div>
          </div>

          {/* Input */}
          <div style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
            <input
              ref={inputRef}
              type={showPass ? 'text' : 'password'}
              style={{
                width: '100%',
                padding: '13px 44px 13px 14px',
                fontSize: 16,
                fontFamily: 'DM Sans, sans-serif',
                background: user.surfaceHigh,
                border: `1px solid ${error ? '#ef4444' : user.border}`,
                color: user.text,
                outline: 'none',
                boxSizing: 'border-box',
                letterSpacing: showPass ? '0' : '3px',
                transition: 'border-color 0.15s',
              }}
              placeholder="Passphrase..."
              value={passphrase}
              onChange={e => { setPassphrase(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {/* Show/hide toggle */}
            <button
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.5, padding: 2 }}
              onClick={() => setShowPass(v => !v)}
              tabIndex={-1}
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: '#ef4444', marginBottom: 10, letterSpacing: '0.3px' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            style={{
              width: '100%',
              padding: '13px',
              background: passphrase ? user.btnGradient : 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: passphrase ? 'pointer' : 'default',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              color: passphrase ? '#fff' : user.textMuted,
              letterSpacing: '-0.2px',
              transition: 'all 0.15s',
              marginTop: 4,
            }}
            onClick={handleSubmit}
            disabled={!passphrase}
          >
            Enter Workspace →
          </button>

          {/* Back */}
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Mono, monospace', color: user.textMuted, marginTop: 16, letterSpacing: '0.5px', opacity: 0.6 }}
            onClick={() => { setAuthTarget(null); setError(''); setPassphrase(''); }}
          >
            ← Back
          </button>
        </div>

        <style>{`
          @keyframes axa-shake {
            0%,100% { transform: translateX(0); }
            15%      { transform: translateX(-8px); }
            30%      { transform: translateX(8px); }
            45%      { transform: translateX(-6px); }
            60%      { transform: translateX(6px); }
            75%      { transform: translateX(-3px); }
            90%      { transform: translateX(3px); }
          }
        `}</style>
      </div>
    );
  }

  // ── User selection screen (unchanged) ──────────────────────────────────────
  return (
    <div style={styles.root}>
      <div style={styles.bgLeft} />
      <div style={styles.bgRight} />

      <div style={styles.content}>
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <span style={styles.logoA}>A</span>
            <span style={styles.logox}>×</span>
            <span style={styles.logoA2}>A</span>
          </div>
          <p style={styles.tagline}>Two minds. One mission.</p>
        </div>

        <p style={styles.question}>Who are you?</p>

        <div style={styles.cards}>
          {Object.values(USERS).map((u) => (
            <button
              key={u.id}
              style={{
                ...styles.card,
                ...(hovering === u.id ? {
                  ...styles.cardHover,
                  borderColor: u.primary,
                  boxShadow: `0 0 24px ${u.glow}, inset 0 0 24px rgba(0,0,0,0.4)`,
                } : {}),
                background: u.id === 'anurag'
                  ? 'linear-gradient(135deg, #0a0f1e, #0d1a3d)'
                  : 'linear-gradient(135deg, #1a0a05, #3d1505)',
              }}
              onMouseEnter={() => setHovering(u.id)}
              onMouseLeave={() => setHovering(null)}
              onTouchStart={() => setHovering(u.id)}
              onTouchEnd={() => setHovering(null)}
              onClick={() => handleCardTap(u.id)}
            >
              <div style={{ ...styles.cardAccentLine, background: u.btnGradient }} />
              <span style={styles.cardEmoji}>{u.emoji}</span>
              <span style={{ ...styles.cardName, color: u.text, fontFamily: 'Syne, sans-serif' }}>
                {u.displayName}
              </span>
              <span style={{ ...styles.cardSub, color: u.textMuted }}>
                {isAuthenticated(u.id) ? 'Tap to enter' : 'Enter passphrase'}
              </span>
              <div style={{ ...styles.cardArrow, color: u.primary }}>→</div>
            </button>
          ))}
        </div>

        <p style={styles.footer}>Protected · Stays logged in on this device</p>
      </div>
    </div>
  );
}

const styles = {
  root:        { position: 'fixed', inset: 0, background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bgLeft:      { position: 'absolute', left: '-20%', top: '20%', width: '40%', height: '60%', background: 'radial-gradient(ellipse, rgba(26,111,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' },
  bgRight:     { position: 'absolute', right: '-20%', top: '20%', width: '40%', height: '60%', background: 'radial-gradient(ellipse, rgba(255,77,26,0.12) 0%, transparent 70%)', pointerEvents: 'none' },
  content:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%', maxWidth: 420, padding: '0 24px', animation: 'fadeIn 0.5s ease' },
  logoWrap:    { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 48 },
  logo:        { fontFamily: 'Syne, sans-serif', fontSize: 64, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 4 },
  logoA:       { color: '#1a6fff', textShadow: '0 0 20px rgba(26,111,255,0.8)' },
  logox:       { color: 'rgba(255,255,255,0.3)', fontSize: 48, fontWeight: 400 },
  logoA2:      { color: '#ff4d1a', textShadow: '0 0 20px rgba(255,77,26,0.8)' },
  tagline:     { color: 'rgba(255,255,255,0.35)', fontSize: 13, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'Space Mono, monospace', marginTop: 8 },
  question:    { color: 'rgba(255,255,255,0.7)', fontSize: 14, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'Space Mono, monospace', marginBottom: 24 },
  cards:       { display: 'flex', gap: 12, width: '100%' },
  card:        { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px 18px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden', gap: 4 },
  cardHover:   { transform: 'translateY(-2px)' },
  cardAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  cardEmoji:   { fontSize: 32, marginBottom: 8 },
  cardName:    { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  cardSub:     { fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Space Mono, monospace' },
  cardArrow:   { position: 'absolute', bottom: 16, right: 16, fontSize: 20, fontWeight: 700, transition: 'transform 0.2s ease' },
  footer:      { marginTop: 24, color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'Space Mono, monospace' },
  authCard:    { position: 'relative', width: '100%', maxWidth: 340, padding: '32px 28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' },
};
