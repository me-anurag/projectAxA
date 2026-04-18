import React from 'react';
import { USERS, VIEWS } from '../lib/theme';
import { playClick } from '../lib/sounds';

export default function BottomBar({ currentUser, activeView, onViewChange, unreadCount = 0 }) {
  const anurag = USERS.anurag;
  const anshuman = USERS.anshuman;
  const isAnurag = currentUser === 'anurag';

  const leftUser = isAnurag ? anurag : anshuman;    // own
  const rightUser = isAnurag ? anshuman : anurag;   // other

  const handlePress = (view) => {
    playClick();
    onViewChange(view);
  };

  return (
    <div style={styles.container}>
      {/* Own workspace button */}
      <button
        style={{
          ...styles.userBtn,
          background: activeView === VIEWS.OWN
            ? leftUser.btnGradient
            : leftUser.surface,
          borderRight: `1px solid ${leftUser.border}`,
          color: activeView === VIEWS.OWN ? '#fff' : leftUser.textMuted,
        }}
        onClick={() => handlePress(VIEWS.OWN)}
      >
        <span style={styles.btnEmoji}>{leftUser.emoji}</span>
        <span style={{ ...styles.btnLabel, fontFamily: 'Syne, sans-serif' }}>
          {leftUser.displayName}
        </span>
        {activeView === VIEWS.OWN && <div style={{ ...styles.activeDot, background: leftUser.primary }} />}
      </button>

      {/* Chat button — center, smaller */}
      <button
        style={{
          ...styles.chatBtn,
          background: activeView === VIEWS.CHAT
            ? 'linear-gradient(135deg, #1a6fff44, #ff4d1a44)'
            : 'rgba(255,255,255,0.04)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          color: activeView === VIEWS.CHAT ? '#fff' : 'rgba(255,255,255,0.4)',
        }}
        onClick={() => handlePress(VIEWS.CHAT)}
      >
        <ChatIcon active={activeView === VIEWS.CHAT} />
        {unreadCount > 0 && (
          <div style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</div>
        )}
      </button>

      {/* Other workspace button */}
      <button
        style={{
          ...styles.userBtn,
          background: activeView === VIEWS.OTHER
            ? rightUser.btnGradient
            : rightUser.surface,
          borderLeft: `1px solid ${rightUser.border}`,
          color: activeView === VIEWS.OTHER ? '#fff' : rightUser.textMuted,
        }}
        onClick={() => handlePress(VIEWS.OTHER)}
      >
        <span style={styles.btnEmoji}>{rightUser.emoji}</span>
        <span style={{ ...styles.btnLabel, fontFamily: 'Syne, sans-serif' }}>
          {rightUser.displayName}
        </span>
        {activeView === VIEWS.OTHER && <div style={{ ...styles.activeDot, background: rightUser.primary }} />}
      </button>
    </div>
  );
}

function ChatIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: 'var(--bottom-bar-height)',
    flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  userBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.18s ease',
    position: 'relative',
    padding: '8px 4px',
  },
  chatBtn: {
    width: 68,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.18s ease',
    position: 'relative',
  },
  btnEmoji: {
    fontSize: 18,
    lineHeight: 1,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    width: 4,
    height: 4,
    borderRadius: '50%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: '#ff4d1a',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 4px',
    borderRadius: 99,
    fontFamily: 'Space Mono, monospace',
    minWidth: 16,
    textAlign: 'center',
  },
};
