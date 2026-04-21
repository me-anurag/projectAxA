import { useState, useCallback, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MUSIC SYSTEM
//
// Default songs are built-in and cannot be deleted.
// User songs are stored as base64 in localStorage (per user).
//
// Settings stored in localStorage: `axa_music_settings_${userId}`
// User songs stored in: `axa_music_songs_${userId}`
//
// Settings shape:
// {
//   enabled: boolean,       // music on/off globally
//   mode: 'loop'|'queue',   // loop one song, or play one after next
//   currentSongId: string,  // which song is selected/playing
// }
// ─────────────────────────────────────────────────────────────────────────────

// Default songs — these are served from /sounds/ (bundled with app)
// Cannot be deleted by users
export const DEFAULT_SONGS = [
  { id: 'default_tibetan', title: 'Tibetan Meditation', artist: 'Default', src: '/sounds/song_tibetan.mp3',  isDefault: true },
  { id: 'default_bandeya', title: 'Bandeya Rey Bandeya', artist: 'Default', src: '/sounds/song_bandeya.mp3', isDefault: true },
  { id: 'default_aagaaz',  title: 'Aagaaz',              artist: 'Default', src: '/sounds/song_aagaaz.mp3',  isDefault: true },
];

const SETTINGS_KEY = (u) => `axa_music_settings_${u}`;
const SONGS_KEY    = (u) => `axa_music_songs_${u}`;

function loadSettings(userId) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY(userId));
    return raw ? JSON.parse(raw) : {
      enabled: true,
      mode: 'queue',
      currentSongId: DEFAULT_SONGS[0].id,
    };
  } catch {
    return { enabled: true, mode: 'queue', currentSongId: DEFAULT_SONGS[0].id };
  }
}

function saveSettings(userId, data) {
  localStorage.setItem(SETTINGS_KEY(userId), JSON.stringify(data));
}

function loadUserSongs(userId) {
  try {
    const raw = localStorage.getItem(SONGS_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUserSongs(userId, songs) {
  localStorage.setItem(SONGS_KEY(userId), JSON.stringify(songs));
}

// Convert a File to base64 data URL
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useMusic(userId) {
  const [settings,   setSettingsState] = useState(() => loadSettings(userId));
  const [userSongs,  setUserSongs]     = useState(() => loadUserSongs(userId));
  const audioRef   = useRef(null);
  const isPlayingRef = useRef(false);

  // All songs combined: defaults first, then user songs
  const allSongs = [...DEFAULT_SONGS, ...userSongs];

  // Current song object
  const currentSong = allSongs.find(s => s.id === settings.currentSongId) || allSongs[0];

  // ── Persist settings ───────────────────────────────────────────────────────
  const updateSettings = useCallback((patch) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      saveSettings(userId, next);
      return next;
    });
  }, [userId]);

  // ── Audio engine ───────────────────────────────────────────────────────────
  // Start playing the selected song after startup sound finishes (~1.5s delay)
  const startPlayback = useCallback(() => {
    if (!settings.enabled || !currentSong) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new Audio(currentSong.src);
      audio.volume = 0.35; // gentle background volume
      audioRef.current = audio;
      isPlayingRef.current = true;

      audio.addEventListener('ended', () => {
        if (!isPlayingRef.current) return;
        if (settings.mode === 'loop') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          // Queue mode: play next song
          const idx  = allSongs.findIndex(s => s.id === settings.currentSongId);
          const next = allSongs[(idx + 1) % allSongs.length];
          if (next) {
            updateSettings({ currentSongId: next.id });
          }
        }
      });

      audio.play().catch(() => {
        // Autoplay blocked — ok, user will need to interact first
      });
    } catch (e) { /* silent */ }
  }, [settings.enabled, settings.mode, settings.currentSongId, currentSong, allSongs, updateSettings]);

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  // When currentSongId changes in queue mode, restart playback with new song
  useEffect(() => {
    if (settings.enabled && isPlayingRef.current) {
      startPlayback();
    }
  }, [settings.currentSongId]); // intentional — only watch id change

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopPlayback(); };
  }, [stopPlayback]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleEnabled = useCallback((val) => {
    updateSettings({ enabled: val });
    if (!val) stopPlayback();
  }, [updateSettings, stopPlayback]);

  const setMode = useCallback((mode) => {
    updateSettings({ mode });
  }, [updateSettings]);

  const selectSong = useCallback((songId) => {
    updateSettings({ currentSongId: songId });
  }, [updateSettings]);

  const playNext = useCallback(() => {
    const idx  = allSongs.findIndex(s => s.id === settings.currentSongId);
    const next = allSongs[(idx + 1) % allSongs.length];
    if (next) selectSong(next.id);
  }, [allSongs, settings.currentSongId, selectSong]);

  const playPrev = useCallback(() => {
    const idx  = allSongs.findIndex(s => s.id === settings.currentSongId);
    const prev = allSongs[(idx - 1 + allSongs.length) % allSongs.length];
    if (prev) selectSong(prev.id);
  }, [allSongs, settings.currentSongId, selectSong]);

  // ── User song management ───────────────────────────────────────────────────
  const addSong = useCallback(async (file) => {
    try {
      const base64 = await fileToBase64(file);
      const name   = file.name.replace(/\.[^.]+$/, ''); // strip extension
      const song = {
        id:        `user_${Date.now()}`,
        title:     name,
        artist:    'My Library',
        src:       base64,
        isDefault: false,
      };
      setUserSongs(prev => {
        const next = [...prev, song];
        saveUserSongs(userId, next);
        return next;
      });
      return song;
    } catch (e) {
      console.error('[AxA] addSong error:', e);
    }
  }, [userId]);

  const deleteSong = useCallback((songId) => {
    setUserSongs(prev => {
      const next = prev.filter(s => s.id !== songId);
      saveUserSongs(userId, next);
      return next;
    });
    // If deleted song was playing, switch to first song
    if (settings.currentSongId === songId) {
      updateSettings({ currentSongId: DEFAULT_SONGS[0].id });
    }
  }, [userId, settings.currentSongId, updateSettings]);

  const renameSong = useCallback((songId, title) => {
    setUserSongs(prev => {
      const next = prev.map(s => s.id === songId ? { ...s, title } : s);
      saveUserSongs(userId, next);
      return next;
    });
  }, [userId]);

  return {
    settings,
    allSongs,
    currentSong,
    audioRef,
    startPlayback,
    stopPlayback,
    toggleEnabled,
    setMode,
    selectSong,
    playNext,
    playPrev,
    addSong,
    deleteSong,
    renameSong,
  };
}
