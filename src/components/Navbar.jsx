import React from 'react';
import { USERS } from '../lib/theme';
import { playClick } from '../lib/sounds';

export default function Navbar({ user, onHamburger, activeView }) {
  const theme = USERS[user];

  return (
    <nav style={{ ...styles.nav, background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
      {/* Hamburger — left */}
      <button style={styles.hamburger} onClick={() => { playClick(); onHamburger(); }}>
        <span style={{ ...styles.line, background: theme.text }} />
        <span style={{ ...styles.line, width: 16, background: theme.text }} />
        <span style={{ ...styles.line, background: theme.text }} />
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* AxA Logo — right */}
      <div style={styles.logo}>
        <span style={{ ...styles.logoA, color: '#1a6fff', textShadow: '0 0 10px rgba(26,111,255,0.7)' }}>A</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>×</span>
        <span style={{ ...styles.logoA, color: '#ff4d1a', textShadow: '0 0 10px rgba(255,77,26,0.7)' }}>A</span>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    height: 'var(--nav-height)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: 8,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  line: {
    height: 2,
    width: 22,
    borderRadius: 1,
    transition: 'all 0.2s',
    display: 'block',
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    lineHeight: 1,
  },
  logoA: {
    display: 'inline-block',
  },
};
