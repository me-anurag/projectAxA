import React, { useState } from 'react';
import { USERS } from '../lib/theme';
import { playClick } from '../lib/sounds';

export default function Onboarding({ onSelect }) {
  const [hovering, setHovering] = useState(null);

  const handleSelect = (userId) => {
    playClick();
    localStorage.setItem('axa_user', userId);
    onSelect(userId);
  };

  return (
    <div style={styles.root}>
      {/* Background atmospheric effect */}
      <div style={styles.bgLeft} />
      <div style={styles.bgRight} />

      <div style={styles.content}>
        {/* Logo */}
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
          {Object.values(USERS).map((user) => (
            <button
              key={user.id}
              style={{
                ...styles.card,
                ...(hovering === user.id ? { ...styles.cardHover, borderColor: user.primary, boxShadow: `0 0 24px ${user.glow}, inset 0 0 24px rgba(0,0,0,0.4)` } : {}),
                background: user.id === 'anurag'
                  ? 'linear-gradient(135deg, #0a0f1e, #0d1a3d)'
                  : 'linear-gradient(135deg, #1a0a05, #3d1505)',
              }}
              onMouseEnter={() => setHovering(user.id)}
              onMouseLeave={() => setHovering(null)}
              onTouchStart={() => setHovering(user.id)}
              onTouchEnd={() => setHovering(null)}
              onClick={() => handleSelect(user.id)}
            >
              <div style={{ ...styles.cardAccentLine, background: user.btnGradient }} />
              <span style={styles.cardEmoji}>{user.emoji}</span>
              <span style={{ ...styles.cardName, color: user.text, fontFamily: 'Syne, sans-serif' }}>
                {user.displayName}
              </span>
              <span style={{ ...styles.cardSub, color: user.textMuted }}>
                Enter workspace
              </span>
              <div style={{ ...styles.cardArrow, color: user.primary }}>→</div>
            </button>
          ))}
        </div>

        <p style={styles.footer}>You'll stay logged in on this device</p>
      </div>
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    background: '#080808',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgLeft: {
    position: 'absolute',
    left: '-20%',
    top: '20%',
    width: '40%',
    height: '60%',
    background: 'radial-gradient(ellipse, rgba(26,111,255,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgRight: {
    position: 'absolute',
    right: '-20%',
    top: '20%',
    width: '40%',
    height: '60%',
    background: 'radial-gradient(ellipse, rgba(255,77,26,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    width: '100%',
    maxWidth: 420,
    padding: '0 24px',
    animation: 'fadeIn 0.5s ease',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 64,
    fontWeight: 800,
    letterSpacing: '-2px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  logoA: {
    color: '#1a6fff',
    textShadow: '0 0 20px rgba(26,111,255,0.8)',
  },
  logox: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 48,
    fontWeight: 400,
  },
  logoA2: {
    color: '#ff4d1a',
    textShadow: '0 0 20px rgba(255,77,26,0.8)',
  },
  tagline: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontFamily: 'Space Mono, monospace',
    marginTop: 8,
  },
  question: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    letterSpacing: '3px',
    textTransform: 'uppercase',
    fontFamily: 'Space Mono, monospace',
    marginBottom: 24,
  },
  cards: {
    display: 'flex',
    gap: 12,
    width: '100%',
  },
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '20px 18px',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    gap: 4,
  },
  cardHover: {
    transform: 'translateY(-2px)',
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  cardSub: {
    fontSize: 11,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontFamily: 'Space Mono, monospace',
  },
  cardArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    fontSize: 20,
    fontWeight: 700,
    transition: 'transform 0.2s ease',
  },
  footer: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontFamily: 'Space Mono, monospace',
  },
};
