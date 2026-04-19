import React from 'react';
import { USERS, VIEWS } from '../lib/theme';
import { Icon } from './TaskCard';
import { playClick } from '../lib/sounds';

export default function BottomBar({ currentUser, activeView, onViewChange, unreadCount = 0 }) {
  const isAnurag = currentUser === 'anurag';
  const ownUser   = USERS[currentUser];
  const otherUser = USERS[isAnurag ? 'anshuman' : 'anurag'];

  const press = (view) => { playClick(); onViewChange(view); };

  return (
    <div style={styles.container}>

      {/* Own workspace — slides from left */}
      <UserBtn
        theme={ownUser}
        active={activeView === VIEWS.OWN}
        side="left"
        onPress={() => press(VIEWS.OWN)}
      />

      {/* Chat — center, narrower */}
      <button
        style={{
          ...styles.chatBtn,
          background: activeView === VIEWS.CHAT
            ? 'linear-gradient(135deg,rgba(26,111,255,0.22),rgba(255,77,26,0.22))'
            : 'rgba(255,255,255,0.03)',
          borderLeft:  `1px solid rgba(255,255,255,0.06)`,
          borderRight: `1px solid rgba(255,255,255,0.06)`,
        }}
        onClick={() => press(VIEWS.CHAT)}
      >
        <Icon
          name="chat"
          size={20}
          color={activeView === VIEWS.CHAT ? '#fff' : 'rgba(255,255,255,0.35)'}
          strokeWidth={activeView === VIEWS.CHAT ? 2 : 1.6}
        />
        {unreadCount > 0 && (
          <div style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</div>
        )}
      </button>

      {/* Other workspace — slides from right */}
      <UserBtn
        theme={otherUser}
        active={activeView === VIEWS.OTHER}
        side="right"
        onPress={() => press(VIEWS.OTHER)}
      />
    </div>
  );
}

function UserBtn({ theme, active, side, onPress }) {
  return (
    <button
      style={{
        ...styles.userBtn,
        background: active ? theme.btnGradient : theme.surface,
        borderLeft:  side === 'right' ? `1px solid ${theme.border}` : 'none',
        borderRight: side === 'left'  ? `1px solid ${theme.border}` : 'none',
      }}
      onClick={onPress}
    >
      {/* Active indicator dot */}
      {active && <div style={{ ...styles.activeDot, background: '#fff' }} />}

      {/* Icon: ⚡ for anurag (zap), 🔥 for anshuman (fire) — rendered as SVG */}
      <div style={{ opacity: active ? 1 : 0.55, transition: 'opacity 0.15s' }}>
        <Icon
          name={theme.id === 'anurag' ? 'zap' : 'fire'}
          size={18}
          color={active ? '#fff' : theme.primary}
          strokeWidth={0}
        />
      </div>

      <span style={{
        ...styles.btnLabel,
        color: active ? '#fff' : theme.textMuted,
        fontFamily: 'Syne, sans-serif',
      }}>
        {theme.displayName}
      </span>
    </button>
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
    padding: '6px 4px',
  },
  chatBtn: {
    width: 64,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.18s ease',
    position: 'relative',
  },
  btnLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  activeDot: {
    position: 'absolute',
    top: 7,
    width: 3,
    height: 3,
    borderRadius: '50%',
    opacity: 0.8,
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
