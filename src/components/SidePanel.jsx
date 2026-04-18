import React from 'react';
import { USERS } from '../lib/theme';
import { playClick } from '../lib/sounds';

const MENU_ITEMS = [
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'syllabus', label: 'Syllabus', icon: '📚' },
  { id: 'breathing', label: 'Breathing', icon: '🫁', badge: 'Soon' },
  { id: 'logout', label: 'Log Out', icon: '🚪', danger: true },
];

export default function SidePanel({ open, onClose, user, onMenuItem }) {
  const theme = USERS[user];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          ...styles.backdrop,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
        }}
        onClick={() => { playClick(); onClose(); }}
      />

      {/* Drawer */}
      <div style={{
        ...styles.drawer,
        background: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
      }}>
        {/* User identity */}
        <div style={{ ...styles.userSection, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.avatar, background: theme.btnGradient }}>
            {theme.emoji}
          </div>
          <div>
            <div style={{ ...styles.userName, color: theme.text, fontFamily: 'Syne, sans-serif' }}>
              {theme.displayName} {theme.emoji}
            </div>
            <div style={{ ...styles.userSub, color: theme.textMuted }}>AxA Workspace</div>
          </div>
        </div>

        {/* Menu items */}
        <div style={styles.menu}>
          {MENU_ITEMS.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.menuItem,
                color: item.danger ? '#ef4444' : theme.text,
              }}
              onClick={() => {
                playClick();
                onMenuItem(item.id);
                onClose();
              }}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span style={styles.menuLabel}>{item.label}</span>
              {item.badge && (
                <span style={{ ...styles.menuBadge, background: theme.primary }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* App version */}
        <div style={{ ...styles.version, color: theme.textMuted }}>AxA v1.0 • Two minds. One mission.</div>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 40,
    transition: 'opacity 0.2s ease',
    backdropFilter: 'blur(2px)',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    zIndex: 50,
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
  },
  userSection: {
    padding: '48px 20px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    flexShrink: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  userSub: {
    fontSize: 11,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.5px',
    marginTop: 2,
  },
  menu: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  menuIcon: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 500,
  },
  menuBadge: {
    fontSize: 9,
    color: '#fff',
    padding: '2px 6px',
    fontFamily: 'Space Mono, monospace',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  version: {
    padding: '16px 20px',
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.5px',
  },
};
