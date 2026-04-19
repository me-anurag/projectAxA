import React from 'react';
import { USERS } from '../lib/theme';
import { Icon } from './TaskCard';
import { playClick } from '../lib/sounds';

// Each item: id, label, icon name (from Icon library), danger?, badge?
const MENU_ITEMS = [
  { id: 'settings',  label: 'Settings',  icon: 'settings'  },
  { id: 'syllabus',  label: 'Syllabus',  icon: 'book'      },
  { id: 'breathing', label: 'Breathing', icon: 'wind',      badge: 'Soon' },
  { id: 'logout',    label: 'Log Out',   icon: 'logOut',    danger: true  },
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
          {/* Avatar: themed gradient square with initial */}
          <div style={{ ...styles.avatar, background: theme.btnGradient }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>
              {theme.displayName[0]}
            </span>
          </div>
          <div>
            <div style={{ ...styles.userName, color: theme.text }}>
              {theme.displayName}
            </div>
            <div style={{ ...styles.userSub, color: theme.textMuted }}>AxA Workspace</div>
          </div>
        </div>

        {/* Menu */}
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
              <span style={{ ...styles.menuIcon, color: item.danger ? '#ef4444' : theme.textMuted }}>
                <Icon name={item.icon} size={18} color={item.danger ? '#ef4444' : theme.textMuted} strokeWidth={1.6} />
              </span>
              <span style={styles.menuLabel}>{item.label}</span>
              {item.badge && (
                <span style={{ ...styles.menuBadge, background: theme.primary }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* App version footer */}
        <div style={{ ...styles.version, color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Mini AxA logo */}
            <span style={{ ...styles.miniLogo }}>
              <span style={{ color: '#1a6fff', fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>A</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}>×</span>
              <span style={{ color: '#ff4d1a', fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>A</span>
            </span>
            <span>v1.0 · Two minds. One mission.</span>
          </div>
        </div>
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
    transition: 'opacity 0.22s ease',
    backdropFilter: 'blur(2px)',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 264,
    zIndex: 50,
    transition: 'transform 0.26s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
  },
  userSection: {
    padding: '52px 20px 20px',
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
    flexShrink: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.3px',
    fontFamily: 'Syne, sans-serif',
  },
  userSub: {
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.5px',
    marginTop: 2,
  },
  menu: {
    flex: 1,
    padding: '6px 0',
    overflowY: 'auto',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '13px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    textAlign: 'left',
    transition: 'background 0.12s',
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    flexShrink: 0,
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
    padding: '14px 20px',
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.3px',
  },
  miniLogo: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
  },
};
