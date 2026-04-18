// User themes — Anurag⚡ Thunder/Lightning Blue, Anshuman🔥 Fire/Ember
export const USERS = {
  anurag: {
    id: 'anurag',
    displayName: 'Anurag',
    emoji: '⚡',
    label: 'Anurag⚡',
    // Deep storm blue with electric accents
    primary: '#1a6fff',
    accent: '#4da6ff',
    glow: 'rgba(26, 111, 255, 0.5)',
    bg: '#0a0f1e',
    surface: '#0d1628',
    surfaceHigh: '#111e3a',
    border: 'rgba(26, 111, 255, 0.2)',
    borderHigh: 'rgba(26, 111, 255, 0.5)',
    text: '#e8f4ff',
    textMuted: 'rgba(232, 244, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a3d 100%)',
    btnGradient: 'linear-gradient(135deg, #1a6fff, #0040cc)',
    navGradient: 'linear-gradient(180deg, #0a0f1e 0%, #0d1628 100%)',
    sparkle: '⚡',
    sound: 'thunder',
  },
  anshuman: {
    id: 'anshuman',
    displayName: 'Anshuman',
    emoji: '🔥',
    label: 'Anshuman🔥',
    // Deep ember with fire-orange accents
    primary: '#ff4d1a',
    accent: '#ff8c42',
    glow: 'rgba(255, 77, 26, 0.5)',
    bg: '#1a0a05',
    surface: '#241008',
    surfaceHigh: '#33180a',
    border: 'rgba(255, 77, 26, 0.2)',
    borderHigh: 'rgba(255, 77, 26, 0.5)',
    text: '#fff0e8',
    textMuted: 'rgba(255, 240, 232, 0.5)',
    gradient: 'linear-gradient(135deg, #1a0a05 0%, #3d1505 100%)',
    btnGradient: 'linear-gradient(135deg, #ff4d1a, #cc2200)',
    navGradient: 'linear-gradient(180deg, #1a0a05 0%, #241008 100%)',
    sparkle: '🔥',
    sound: 'fire',
  },
};

export const TASK_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  MISSED: 'missed',
};

export const CHALLENGE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  MISSED: 'missed',
  DECLINED: 'declined',
};

export const REACTION_EMOJIS = ['🔥', '⚡', '💪', '👏', '🎯', '🚀', '❤️', '😮'];

export const VIEWS = {
  OWN: 'own',
  OTHER: 'other',
  CHAT: 'chat',
};
