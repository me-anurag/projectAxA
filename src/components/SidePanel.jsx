import React, { useState } from 'react';
import { USERS } from '../lib/theme';
import { Icon } from './TaskCard';
import { playClick } from '../lib/sounds';
import MusicPanel from '../features/music/MusicPanel';

export default function SidePanel({
  open, onClose, user, onMenuItem,
  soundOn, onToggleSound,
  quotesOn, onToggleQuotes,
  music,
}) {
  const theme = USERS[user];
  const [showMusic, setShowMusic] = useState(false);

  const handleClose = () => {
    setShowMusic(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          ...styles.backdrop,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
        }}
        onClick={() => { playClick(); handleClose(); }}
      />

      {/* Drawer */}
      <div style={{
        ...styles.drawer,
        background: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
      }}>

        {/* ── Music panel (sub-view inside drawer) ── */}
        {showMusic ? (
          <MusicPanel
            theme={theme}
            music={music}
            onClose={() => setShowMusic(false)}
          />
        ) : (
          <>
            {/* User identity */}
            <div style={{ ...styles.userSection, borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ ...styles.avatar, background: theme.btnGradient }}>
                <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>
                  {theme.displayName[0]}
                </span>
              </div>
              <div>
                <div style={{ ...styles.userName, color: theme.text }}>{theme.displayName}</div>
                <div style={{ ...styles.userSub, color: theme.textMuted }}>AxA Workspace</div>
              </div>
            </div>

            <div style={styles.menu}>

              <SectionLabel label="NAVIGATION" theme={theme} />

              <MenuItem icon="book" label="Syllabus" theme={theme}
                onClick={() => { playClick(); onMenuItem('syllabus'); handleClose(); }} />

              <MenuItem icon="wind" label="Breathing" theme={theme} badge="Soon"
                onClick={() => { playClick(); onMenuItem('breathing'); handleClose(); }} />

              <SectionLabel label="SETTINGS" theme={theme} />

              {/* Sound toggle */}
              <ToggleItem
                icon={soundOn ? 'volume' : 'volumeOff'}
                label="Sound Effects"
                value={soundOn}
                theme={theme}
                onToggle={(v) => { onToggleSound(v); }}
              />

              {/* Music — navigates into sub-panel */}
              <button
                style={{ ...styles.menuItem, color: theme.text }}
                onClick={() => { playClick(); setShowMusic(true); }}
              >
                <span style={styles.menuIconWrap}>
                  <Icon name="volume" size={17} color={theme.textMuted} strokeWidth={1.6} />
                </span>
                <span style={styles.menuLabel}>Music</span>
                {music?.settings?.enabled && (
                  <span style={{ ...styles.badge, background: theme.primary }}>ON</span>
                )}
                <Icon name="chevronDown" size={14} color={theme.textMuted} strokeWidth={2}
                  style={{ transform: 'rotate(-90deg)' }} />
              </button>

              {/* Daily quotes toggle */}
              <ToggleItem
                icon="quote"
                label="Daily Quotes (6am)"
                value={quotesOn}
                theme={theme}
                onToggle={(v) => { onToggleQuotes(v); }}
              />

              <MenuItem icon="settings" label="Settings" theme={theme}
                onClick={() => { playClick(); onMenuItem('settings'); handleClose(); }} />

              <SectionLabel label="ACCOUNT" theme={theme} />

              <MenuItem icon="logOut" label="Log Out" theme={theme} danger
                onClick={() => { playClick(); onMenuItem('logout'); handleClose(); }} />
            </div>

            <div style={{ ...styles.footer, borderTop: `1px solid ${theme.border}` }}>
              <span style={styles.miniLogoA}>A</span>
              <span style={styles.miniLogoX}>×</span>
              <span style={styles.miniLogoB}>A</span>
              <span style={{ ...styles.footerText, color: theme.textMuted }}>v1.0 · Two minds. One mission.</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SectionLabel({ label, theme }) {
  return (
    <div style={{ padding: '12px 20px 4px', fontSize: 9, fontFamily: 'Space Mono, monospace', letterSpacing: '1.5px', color: theme.textMuted, opacity: 0.6 }}>
      {label}
    </div>
  );
}

function MenuItem({ icon, label, theme, badge, danger, onClick }) {
  return (
    <button style={{ ...styles.menuItem, color: danger ? '#ef4444' : theme.text }} onClick={onClick}>
      <span style={styles.menuIconWrap}>
        <Icon name={icon} size={17} color={danger ? '#ef4444' : theme.textMuted} strokeWidth={1.6} />
      </span>
      <span style={styles.menuLabel}>{label}</span>
      {badge && <span style={{ ...styles.badge, background: theme.primary }}>{badge}</span>}
    </button>
  );
}

function ToggleItem({ icon, label, value, theme, onToggle }) {
  return (
    <div style={styles.toggleItem}>
      <span style={styles.menuIconWrap}>
        <Icon name={icon} size={17} color={theme.textMuted} strokeWidth={1.6} />
      </span>
      <span style={{ ...styles.menuLabel, color: theme.text }}>{label}</span>
      <button
        style={{ ...styles.toggleTrack, background: value ? theme.primary : 'rgba(255,255,255,0.1)' }}
        onClick={() => onToggle(!value)}
      >
        <span style={{ ...styles.toggleThumb, transform: value ? 'translateX(14px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}

const styles = {
  backdrop:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, transition: 'opacity 0.22s ease', backdropFilter: 'blur(2px)' },
  drawer:     { position: 'fixed', top: 0, left: 0, bottom: 0, width: 268, zIndex: 50, transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  userSection:{ padding: '52px 20px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  avatar:     { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName:   { fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'Syne, sans-serif' },
  userSub:    { fontSize: 10, fontFamily: 'Space Mono, monospace', letterSpacing: '0.5px', marginTop: 2 },
  menu:       { flex: 1, padding: '4px 0', overflowY: 'auto' },
  menuItem:   { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left', transition: 'background 0.12s' },
  menuIconWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, flexShrink: 0 },
  menuLabel:  { flex: 1, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 },
  badge:      { fontSize: 9, color: '#fff', padding: '2px 6px', fontFamily: 'Space Mono, monospace', fontWeight: 700, letterSpacing: '0.5px' },
  toggleItem: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px' },
  toggleTrack:{ position: 'relative', width: 32, height: 18, border: 'none', cursor: 'pointer', borderRadius: 9, transition: 'background 0.2s', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 2px' },
  toggleThumb:{ width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'transform 0.2s', display: 'block', flexShrink: 0 },
  footer:     { padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 4 },
  miniLogoA:  { color: '#1a6fff', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14 },
  miniLogoX:  { color: 'rgba(255,255,255,0.18)', fontWeight: 300, fontSize: 12 },
  miniLogoB:  { color: '#ff4d1a', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14 },
  footerText: { fontSize: 10, fontFamily: 'Space Mono, monospace', letterSpacing: '0.3px', marginLeft: 4 },
};
