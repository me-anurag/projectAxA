// AxA Sound System
// MP3 files: startup, notification, levelup
// Web Audio API: click, checkbox, missed, challenge
// All sounds respect the 'axa_sound' localStorage setting

const SOUND_KEY = 'axa_sound';

export function isSoundEnabled() {
  const v = localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === 'true'; // default ON
}

export function setSoundEnabled(val) {
  localStorage.setItem(SOUND_KEY, String(val));
}

// ── MP3 player (preload on first call) ───────────────────────────────────────
const _audio = {};

function getAudio(name) {
  if (!_audio[name]) {
    const a = new Audio(`/sounds/${name}.mp3`);
    a.preload = 'auto';
    _audio[name] = a;
  }
  return _audio[name];
}

function playMP3(name, volume = 0.85) {
  if (!isSoundEnabled()) return;
  try {
    const a = getAudio(name);
    a.currentTime = 0;
    a.volume = volume;
    a.play().catch(() => {});
  } catch (e) { /* silent */ }
}

// ── Preload all MP3s on app start ────────────────────────────────────────────
export function preloadSounds() {
  ['startup', 'notification', 'levelup'].forEach(name => getAudio(name));
}

// ── Web Audio API (UI sounds — no files needed) ──────────────────────────────
function getCtx() {
  if (!window._axaAudioCtx) {
    window._axaAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._axaAudioCtx;
}

function tone(freq, type, duration, gain = 0.28, delay = 0) {
  if (!isSoundEnabled()) return;
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    g.gain.setValueAtTime(gain, ac.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  } catch (e) { /* silent */ }
}

// ── Named exports ─────────────────────────────────────────────────────────────

// App startup — plays the uploaded startup.mp3
export function playStartup() {
  playMP3('startup', 0.7);
}

// Task completed 100% — level up MP3
export function playSuccess() {
  playMP3('levelup', 0.9);
}

// New message / challenge notification — notification.mp3
export function playNotification() {
  playMP3('notification', 0.8);
}

// Alias used in challenge received
export function playChallengeReceived() {
  playMP3('notification', 0.8);
}

// Checkbox tick — short tone
export function playCheckbox() {
  tone(1046, 'sine', 0.1, 0.18);
}

// Button click — very short
export function playClick() {
  tone(820, 'square', 0.045, 0.08);
}

// Deadline missed — descending tones
export function playMissed() {
  [220, 196, 164].forEach((f, i) => tone(f, 'sawtooth', 0.18, 0.14, i * 0.1));
}

// Milestone — ascending fanfare (fallback if levelup.mp3 fails)
export function playMilestone() {
  [330, 392, 523, 659, 784].forEach((f, i) => tone(f, 'square', 0.14, 0.22, i * 0.08));
}
