import { useState, useCallback, useEffect, useRef } from 'react';

// export const DEFAULT_SONGS = [
//   { id: 'default_tibetan', title: 'Tibetan Meditation',  artist: 'Default', src: '/sounds/song_tibetan.mp3',  isDefault: true },
//   { id: 'default_bandeya', title: 'Bandeya Rey Bandeya', artist: 'Default', src: '/sounds/song_bandeya.mp3', isDefault: true },
//   { id: 'default_aagaaz',  title: 'Aagaaz',              artist: 'Default', src: '/sounds/song_aagaaz.mp3',  isDefault: true },
// ];
export const DEFAULT_SONGS = [
  { id: 'default_silent_ember', title: 'Silent Ember', artist: 'AxA Soundtrack', src: '/sounds/silent_ember.mp3', isDefault: true },
  { id: 'default_tibetan', title: 'Tibetan Meditation', artist: 'Default', src: '/sounds/song_tibetan.mp3', isDefault: true },
  { id: 'default_bandeya', title: 'Bandeya Rey Bandeya', artist: 'Default', src: '/sounds/song_bandeya.mp3', isDefault: true },
  { id: 'default_aagaaz', title: 'Aagaaz', artist: 'Default', src: '/sounds/song_aagaaz.mp3', isDefault: true },
  { id: 'default_song_time', title: 'Time', artist: 'AxA Soundtrack', src: '/sounds/song_time.mp3', isDefault: true },
  { id: 'default_rise_from_within', title: 'Rise From Within', artist: 'AxA Soundtrack', src: '/sounds/rise_from_within.mp3', isDefault: true },
  { id: 'default_inspire', title: 'Inspire', artist: 'AxA Soundtrack', src: '/sounds/Inspire.mp3', isDefault: true },
  { id: 'default_zen_garden', title: 'Zen Garden', artist: 'AxA Soundtrack', src: '/sounds/Zen_garden.mp3', isDefault: true },
  { id: 'default_awaken_yourself', title: 'Awaken Yourself', artist: 'AxA Soundtrack', src: '/sounds/Awaken_yourself.mp3', isDefault: true },
  { id: 'default_positive_aura', title: 'Positive Aura', artist: 'AxA Soundtrack', src: '/sounds/positive_aura.mp3', isDefault: true },
  { id: 'default_calm_yourself', title: 'Calm Yourself', artist: 'AxA Soundtrack', src: '/sounds/calm_yourself.mp3', isDefault: true },
  { id: 'default_wind_chimes', title: 'Wind Chimes', artist: 'AxA Soundtrack', src: '/sounds/wind_chimes.mp3', isDefault: true },
];

const SETTINGS_KEY = (u) => `axa_music_settings_${u}`;
const SONGS_KEY    = (u) => `axa_music_songs_${u}`;

function loadSettings(userId) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY(userId));
    return raw ? JSON.parse(raw) : { enabled: true, mode: 'queue', currentSongId: DEFAULT_SONGS[0].id };
  } catch { return { enabled: true, mode: 'queue', currentSongId: DEFAULT_SONGS[0].id }; }
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useMusic(userId) {
  const [settings,    setSettingsState] = useState(() => loadSettings(userId));
  const [userSongs,   setUserSongs]     = useState(() => loadUserSongs(userId));
  // Reactive playing state — drives the play/pause button icons
  const [isPlaying,   setIsPlaying]     = useState(false);

  const audioRef = useRef(null);

  const allSongs    = [...DEFAULT_SONGS, ...userSongs];
  const currentSong = allSongs.find(s => s.id === settings.currentSongId) || allSongs[0];

  const updateSettings = useCallback((patch) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      saveSettings(userId, next);
      return next;
    });
  }, [userId]);

  // ── Core playback ──────────────────────────────────────────────────────────
  const startPlayback = useCallback(() => {
    if (!settings.enabled || !currentSong) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new Audio(currentSong.src);
      audio.volume = 0.35;
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        if (settings.mode === 'loop') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          const idx  = allSongs.findIndex(s => s.id === settings.currentSongId);
          const next = allSongs[(idx + 1) % allSongs.length];
          if (next) updateSettings({ currentSongId: next.id });
        }
      });

      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } catch { setIsPlaying(false); }
  }, [settings.enabled, settings.mode, settings.currentSongId, currentSong, allSongs, updateSettings]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  // Pause without destroying the audio element
  const pausePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Resume from pause
  const resumePlayback = useCallback(() => {
    if (audioRef.current && settings.enabled) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else if (settings.enabled) {
      startPlayback();
    }
  }, [settings.enabled, startPlayback]);

  // When currentSongId changes, restart playback if currently playing
  useEffect(() => {
    if (isPlaying) startPlayback();
  }, [settings.currentSongId]); // intentional — only react to song change

  useEffect(() => { return () => { stopPlayback(); }; }, [stopPlayback]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleEnabled = useCallback((val) => {
    updateSettings({ enabled: val });
    if (!val) stopPlayback();
  }, [updateSettings, stopPlayback]);

  const setMode = useCallback((mode) => { updateSettings({ mode }); }, [updateSettings]);

  const selectSong = useCallback((songId) => {
    updateSettings({ currentSongId: songId });
  }, [updateSettings]);

  const playNext = useCallback(() => {
    const idx  = allSongs.findIndex(s => s.id === settings.currentSongId);
    selectSong(allSongs[(idx + 1) % allSongs.length]?.id);
  }, [allSongs, settings.currentSongId, selectSong]);

  const playPrev = useCallback(() => {
    const idx  = allSongs.findIndex(s => s.id === settings.currentSongId);
    selectSong(allSongs[(idx - 1 + allSongs.length) % allSongs.length]?.id);
  }, [allSongs, settings.currentSongId, selectSong]);

  // ── Song management ────────────────────────────────────────────────────────
  const addSong = useCallback(async (file) => {
    try {
      const base64 = await fileToBase64(file);
      const song = {
        id: `user_${Date.now()}`, title: file.name.replace(/\.[^.]+$/, ''),
        artist: 'My Library', src: base64, isDefault: false,
      };
      setUserSongs(prev => { const next = [...prev, song]; saveUserSongs(userId, next); return next; });
      return song;
    } catch (e) { console.error('[AxA] addSong:', e); }
  }, [userId]);

  const deleteSong = useCallback((songId) => {
    setUserSongs(prev => { const next = prev.filter(s => s.id !== songId); saveUserSongs(userId, next); return next; });
    if (settings.currentSongId === songId) updateSettings({ currentSongId: DEFAULT_SONGS[0].id });
  }, [userId, settings.currentSongId, updateSettings]);

  const renameSong = useCallback((songId, title) => {
    setUserSongs(prev => { const next = prev.map(s => s.id === songId ? { ...s, title } : s); saveUserSongs(userId, next); return next; });
  }, [userId]);

  return {
    settings, allSongs, currentSong, isPlaying,
    audioRef, startPlayback, stopPlayback, pausePlayback, resumePlayback,
    toggleEnabled, setMode, selectSong, playNext, playPrev,
    addSong, deleteSong, renameSong,
  };
}
