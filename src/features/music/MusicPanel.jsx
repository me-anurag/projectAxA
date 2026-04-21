import React, { useState, useRef } from 'react';
import { Icon } from '../../components/TaskCard';
import { playClick } from '../../lib/sounds';

// ─────────────────────────────────────────────────────────────────────────────
// MusicPanel — renders inside SidePanel as a full sub-screen
// Opens when user taps "Music" in the side panel
// ─────────────────────────────────────────────────────────────────────────────

export default function MusicPanel({ theme, music, onClose }) {
  const {
    settings, allSongs, currentSong,
    toggleEnabled, setMode, selectSong,
    addSong, deleteSong, renameSong,
    startPlayback
  } = music;

  const [renamingId, setRenamingId] = useState(null);
  const [renameVal,  setRenameVal]  = useState('');
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    await addSong(file);
    setUploading(false);
    e.target.value = '';
  };

  const handleToggleEnabled = (val) => {
    playClick();
    toggleEnabled(val);
    if (val) {
      // Small delay so interaction has happened (required for autoplay)
      setTimeout(() => startPlayback(), 100);
    }
  };

  const handleSelectSong = (id) => {
    playClick();
    selectSong(id);
    if (settings.enabled) {
      setTimeout(() => startPlayback(), 100);
    }
  };

  return (
    <div style={{ ...S.root, background: theme.bg }}>
      {/* Header */}
      <div style={{ ...S.header, background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ ...S.accentBar, background: theme.btnGradient }} />
        <button style={S.backBtn} onClick={() => { playClick(); onClose(); }}>
          <Icon name="chevronDown" size={18} color={theme.textMuted} strokeWidth={2} />
        </button>
        <div style={{ ...S.headerTitle, color: theme.text }}>Music</div>
        {/* Enable/disable toggle */}
        <TogglePill value={settings.enabled} onChange={handleToggleEnabled} theme={theme} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Now playing */}
        {settings.enabled && currentSong && (
          <div style={{ ...S.nowPlaying, background: `${theme.primary}14`, borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ ...S.npDot, background: theme.primary }} className="axa-pulse" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.npTitle, color: theme.text }}>{currentSong.title}</div>
              <div style={{ ...S.npArtist, color: theme.textMuted }}>Now playing in background</div>
            </div>
          </div>
        )}

        {/* Playback mode */}
        <div style={{ ...S.section, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ ...S.sectionLabel, color: theme.textMuted }}>PLAYBACK MODE</div>
          <div style={S.modeRow}>
            {[
              { id: 'queue', label: 'Play in Order', icon: 'history' },
              { id: 'loop',  label: 'Loop One',      icon: 'target'  },
            ].map(m => (
              <button
                key={m.id}
                style={{
                  ...S.modeBtn,
                  background: settings.mode === m.id ? theme.btnGradient : theme.surfaceHigh,
                  border: `1px solid ${settings.mode === m.id ? 'transparent' : theme.border}`,
                  color: settings.mode === m.id ? '#fff' : theme.textMuted,
                }}
                onClick={() => { playClick(); setMode(m.id); }}
              >
                <Icon name={m.icon} size={13} color={settings.mode === m.id ? '#fff' : theme.textMuted} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Song list */}
        <div style={S.section}>
          <div style={{ ...S.sectionLabel, color: theme.textMuted }}>SONGS</div>

          {allSongs.map(song => {
            const isSelected = song.id === settings.currentSongId;
            return (
              <div key={song.id} style={{
                ...S.songRow,
                background: isSelected ? `${theme.primary}14` : 'transparent',
                borderLeft: isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
              }}>
                {/* Play indicator or select */}
                <button style={S.songSelectBtn} onClick={() => handleSelectSong(song.id)}>
                  <div style={{
                    ...S.songDot,
                    background: isSelected ? theme.primary : theme.borderHigh,
                    boxShadow: isSelected ? `0 0 6px ${theme.glow}` : 'none',
                  }} />
                </button>

                {/* Song info */}
                {renamingId === song.id ? (
                  <input
                    style={{ ...S.renameInput, color: theme.text, background: theme.surfaceHigh, border: `1px solid ${theme.borderHigh}` }}
                    value={renameVal}
                    autoFocus
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={() => { if (renameVal.trim()) renameSong(song.id, renameVal.trim()); setRenamingId(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (renameVal.trim()) renameSong(song.id, renameVal.trim()); setRenamingId(null); } }}
                  />
                ) : (
                  <div style={S.songInfo} onClick={() => handleSelectSong(song.id)}>
                    <div style={{ ...S.songTitle, color: isSelected ? theme.primary : theme.text }}>
                      {song.title}
                    </div>
                    <div style={{ ...S.songArtist, color: theme.textMuted }}>
                      {song.isDefault ? 'Default · Cannot delete' : song.artist}
                    </div>
                  </div>
                )}

                {/* Actions — only for user songs */}
                {!song.isDefault && renamingId !== song.id && (
                  <div style={S.songActions}>
                    <button style={S.songActionBtn} onClick={() => { setRenamingId(song.id); setRenameVal(song.title); }}>
                      <Icon name="settings" size={13} color={theme.textMuted} />
                    </button>
                    <button style={S.songActionBtn} onClick={() => { playClick(); deleteSong(song.id); }}>
                      <Icon name="trash" size={13} color={theme.textMuted} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add song button */}
          <input
            ref={fileRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            style={{ ...S.addSongBtn, borderColor: theme.border, color: theme.textMuted }}
            onClick={() => { playClick(); fileRef.current?.click(); }}
            disabled={uploading}
          >
            <Icon name="plus" size={15} color={theme.textMuted} strokeWidth={2} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
              {uploading ? 'Adding...' : 'Add MP3 from device'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TogglePill({ value, onChange, theme }) {
  return (
    <button
      style={{
        position: 'relative', width: 36, height: 20, border: 'none', cursor: 'pointer',
        borderRadius: 10, transition: 'background 0.2s',
        background: value ? theme.primary : 'rgba(255,255,255,0.12)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 3px',
      }}
      onClick={() => onChange(!value)}
    >
      <span style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'transform 0.2s', display: 'block', flexShrink: 0,
        transform: value ? 'translateX(16px)' : 'translateX(0)',
      }} />
    </button>
  );
}

const S = {
  root:       { display: 'flex', flexDirection: 'column', height: '100%' },
  header:     { display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 52, position: 'relative', flexShrink: 0 },
  accentBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  backBtn:    { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', transform: 'rotate(90deg)' },
  headerTitle:{ flex: 1, fontSize: 15, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.3px' },
  nowPlaying: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' },
  npDot:      { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' },
  npTitle:    { fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  npArtist:   { fontSize: 10, fontFamily: 'Space Mono, monospace', marginTop: 1 },
  section:    { padding: '12px 14px' },
  sectionLabel: { fontSize: 9, fontFamily: 'Space Mono, monospace', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 8 },
  modeRow:    { display: 'flex', gap: 8 },
  modeBtn:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' },
  songRow:    { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', transition: 'all 0.15s' },
  songSelectBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 },
  songDot:    { width: 10, height: 10, borderRadius: '50%', transition: 'all 0.2s', flexShrink: 0 },
  songInfo:   { flex: 1, minWidth: 0, cursor: 'pointer' },
  songTitle:  { fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' },
  songArtist: { fontSize: 10, fontFamily: 'Space Mono, monospace', marginTop: 2 },
  songActions:{ display: 'flex', gap: 2, flexShrink: 0 },
  songActionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.65 },
  renameInput:{ flex: 1, padding: '5px 8px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' },
  addSongBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 0', background: 'none', border: 'none', borderTop: '1px dashed', cursor: 'pointer', marginTop: 8, transition: 'opacity 0.15s' },
};
