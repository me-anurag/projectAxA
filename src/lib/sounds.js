// Web Audio API sound effects — no external files needed
const ctx = () => {
  if (!window._audioCtx) window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return window._audioCtx;
};

function playTone(freq, type, duration, gain = 0.3, delay = 0) {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gainNode.gain.setValueAtTime(gain, ac.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  } catch (e) { /* silent fail */ }
}

export function playSuccess() {
  // Arcade success — ascending chime
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => playTone(freq, 'sine', 0.3, 0.4, i * 0.1));
}

export function playMilestone() {
  // Level up fanfare
  [330, 392, 523, 659, 784].forEach((f, i) => playTone(f, 'square', 0.15, 0.25, i * 0.08));
}

export function playClick() {
  playTone(800, 'square', 0.05, 0.1);
}

export function playCheckbox() {
  playTone(1046, 'sine', 0.12, 0.2);
}

export function playMissed() {
  [220, 196, 164].forEach((f, i) => playTone(f, 'sawtooth', 0.2, 0.15, i * 0.1));
}

export function playChallengeReceived() {
  [440, 554, 659, 880].forEach((f, i) => playTone(f, 'triangle', 0.25, 0.3, i * 0.07));
}
