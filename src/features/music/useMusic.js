import { useState, useCallback, useEffect, useRef } from 'react';

// export const DEFAULT_SONGS = [
//   { id: 'default_tibetan', title: 'Tibetan Meditation',  artist: 'Default', src: '/sounds/song_tibetan.mp3',  isDefault: true },
//   { id: 'default_bandeya', title: 'Bandeya Rey Bandeya', artist: 'Default', src: '/sounds/song_bandeya.mp3', isDefault: true },
//   { id: 'default_aagaaz',  title: 'Aagaaz',              artist: 'Default', src: '/sounds/song_aagaaz.mp3',  isDefault: true },
// ];
export const DEFAULT_SONGS = [
  { id: 'default_silent_ember',    title: 'Silent Ember',        artist: 'AxA Soundtrack', src: '/sounds/silent_ember.mp3',    isDefault: true },
  { id: 'default_tibetan',         title: 'Tibetan Meditation',  artist: 'Default',        src: '/sounds/song_tibetan.mp3',    isDefault: true },
  { id: 'default_bandeya',         title: 'Bandeya Rey Bandeya', artist: 'Default',        src: '/sounds/song_bandeya.mp3',    isDefault: true },
  { id: 'default_aagaaz',          title: 'Aagaaz',              artist: 'Default',        src: '/sounds/song_aagaaz.mp3',     isDefault: true },
  { id: 'default_song_time',       title: 'Time',                artist: 'AxA Soundtrack', src: '/sounds/song_time.mp3',       isDefault: true },
  { id: 'default_rise_from_within',title: 'Rise From Within',    artist: 'AxA Soundtrack', src: '/sounds/rise_from_within.mp3',isDefault: true },
  { id: 'default_inspire',         title: 'Inspire',             artist: 'AxA Soundtrack', src: '/sounds/Inspire.mp3',         isDefault: true },
  { id: 'default_zen_garden',      title: 'Zen Garden',          artist: 'AxA Soundtrack', src: '/sounds/Zen_garden.mp3',      isDefault: true },
  { id: 'default_awaken_yourself', title: 'Awaken Yourself',     artist: 'AxA Soundtrack', src: '/sounds/Awaken_yourself.mp3', isDefault: true },
  { id: 'default_positive_aura',   title: 'Positive Aura',       artist: 'AxA Soundtrack', src: '/sounds/positive_aura.mp3',   isDefault: true },
  { id: 'default_calm_yourself',   title: 'Calm Yourself',       artist: 'AxA Soundtrack', src: '/sounds/calm_yourself.mp3',   isDefault: true },
  { id: 'default_wind_chimes',     title: 'Wind Chimes',         artist: 'AxA Soundtrack', src: '/sounds/wind_chimes.mp3',     isDefault: true },
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
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useMusic(userId) {
  const [settings,  setSettingsState] = useState(() => loadSettings(userId));
  const [userSongs, setUserSongs]     = useState(() => loadUserSongs(userId));
  // Reactive playing state — drives the play/pause button icons
  const [isPlaying, setIsPlaying]     = useState(false);

  const audioRef = useRef(null);

  // FIX #1 + #3: Keep a always-current ref to settings and allSongs so
  // callbacks (especially the 'ended' listener) never close over stale values.
  const settingsRef  = useRef(settings);
  const userSongsRef = useRef(userSongs);
  useEffect(() => { settingsRef.current  = settings;  }, [settings]);
  useEffect(() => { userSongsRef.current = userSongs; }, [userSongs]);

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

  // FIX #3: Accept the song to play as an explicit argument so the caller
  // always passes the correct, freshly-resolved song — no stale closure risk.
  const startPlayback = useCallback((songOverride) => {
    // Resolve the song to play: explicit arg → current settings → first song
    const liveSettings = settingsRef.current;
    if (!liveSettings.enabled) return;

    const liveSongs = [...DEFAULT_SONGS, ...userSongsRef.current];
    const song =
      songOverride ||
      liveSongs.find(s => s.id === liveSettings.currentSongId) ||
      liveSongs[0];

    if (!song) return;

    try {
      // FIX #4: Remove the old 'ended' listener before replacing the element.
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current._endedHandler && audioRef.current.removeEventListener('ended', audioRef.current._endedHandler);
        audioRef.current.src = '';
      }

      const audio = new Audio(song.src);
      audio.volume = 0.35;

      // FIX #1: The 'ended' handler reads from live refs — never stale.
      const endedHandler = () => {
        const s  = settingsRef.current;
        const songs = [...DEFAULT_SONGS, ...userSongsRef.current];
        if (s.mode === 'loop') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          const idx  = songs.findIndex(s2 => s2.id === s.currentSongId);
          const next = songs[(idx + 1) % songs.length];
          if (next) updateSettings({ currentSongId: next.id });
        }
      };

      // Store the handler on the element so we can remove it later (FIX #4)
      audio._endedHandler = endedHandler;
      audio.addEventListener('ended', endedHandler);

      audioRef.current = audio;
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } catch { setIsPlaying(false); }
  }, [updateSettings]); // stable — reads live state through refs

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current._endedHandler && audioRef.current.removeEventListener('ended', audioRef.current._endedHandler);
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
    if (!settingsRef.current.enabled) return;
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      startPlayback();
    }
  }, [startPlayback]);

  // FIX #2: React to song-id changes properly.
  // We use a ref to track the previous song id so we only act on genuine
  // changes, and we read isPlaying via a ref to avoid a stale closure.
  const isPlayingRef    = useRef(isPlaying);
  const prevSongIdRef   = useRef(settings.currentSongId);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (settings.currentSongId === prevSongIdRef.current) return;
    prevSongIdRef.current = settings.currentSongId;

    // Only restart if we were already playing
    if (isPlayingRef.current) {
      // Resolve the new song right now — the ref is already up to date
      const liveSongs = [...DEFAULT_SONGS, ...userSongsRef.current];
      const song = liveSongs.find(s => s.id === settings.currentSongId) || liveSongs[0];
      startPlayback(song); // FIX #3: pass song explicitly
    }
  }, [settings.currentSongId, startPlayback]);

  useEffect(() => { return () => { stopPlayback(); }; }, [stopPlayback]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleEnabled = useCallback((val) => {
    updateSettings({ enabled: val });
    if (!val) stopPlayback();
    // Note: startPlayback on enable is now handled in MusicPanel without setTimeout
  }, [updateSettings, stopPlayback]);

  const setMode = useCallback((mode) => { updateSettings({ mode }); }, [updateSettings]);

  const selectSong = useCallback((songId) => {
    updateSettings({ currentSongId: songId });
  }, [updateSettings]);

  // FIX #5: playNext / playPrev now also trigger playback (start or continue)
  const playNext = useCallback(() => {
    const liveSongs = [...DEFAULT_SONGS, ...userSongsRef.current];
    const idx  = liveSongs.findIndex(s => s.id === settingsRef.current.currentSongId);
    const next = liveSongs[(idx + 1) % liveSongs.length];
    if (!next) return;
    updateSettings({ currentSongId: next.id });
    // startPlayback will be triggered by the currentSongId useEffect above
    // but we also set isPlayingRef so it fires even if currently paused
    isPlayingRef.current = true;
    setIsPlaying(true); // optimistic — actual play confirmation comes from audio.play().then
  }, [updateSettings]);

  const playPrev = useCallback(() => {
    const liveSongs = [...DEFAULT_SONGS, ...userSongsRef.current];
    const idx  = liveSongs.findIndex(s => s.id === settingsRef.current.currentSongId);
    const prev = liveSongs[(idx - 1 + liveSongs.length) % liveSongs.length];
    if (!prev) return;
    updateSettings({ currentSongId: prev.id });
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [updateSettings]);

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
    // FIX #10 (panel-side): clear renaming state is handled in MusicPanel;
    // here we just guard against deleting the active song.
    setUserSongs(prev => { const next = prev.filter(s => s.id !== songId); saveUserSongs(userId, next); return next; });
    if (settingsRef.current.currentSongId === songId) {
      updateSettings({ currentSongId: DEFAULT_SONGS[0].id });
    }
  }, [userId, updateSettings]);

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