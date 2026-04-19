import React from 'react';
import { USERS } from '../lib/theme';
import { playClick } from '../lib/sounds';

export default function Navbar({ user, onHamburger }) {
  const theme = USERS[user];

  return (
    <nav style={{ ...styles.nav, background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>

      {/* Hamburger — custom SVG, 3 lines with middle shorter */}
      <button style={styles.hamburger} onClick={() => { playClick(); onHamburger(); }} aria-label="Menu">
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
          <line x1="0" y1="1"  x2="22" y2="1"  stroke={theme.text} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="0" y1="8"  x2="15" y2="8"  stroke={theme.text} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="0" y1="15" x2="22" y2="15" stroke={theme.text} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* AxA Logo — right side, uses the actual uploaded branding colors */}
      <div style={styles.logo} aria-label="AxA">
        <span style={{ color: '#1a6fff', textShadow: '0 0 12px rgba(26,111,255,0.65)' }}>A</span>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontWeight: 300, fontSize: 18 }}>×</span>
        <span style={{ color: '#ff4d1a', textShadow: '0 0 12px rgba(255,77,26,0.65)' }}>A</span>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    height: 'var(--nav-height)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  hamburger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 6px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    lineHeight: 1,
    userSelect: 'none',
  },
};
