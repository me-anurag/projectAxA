import React, { useState, useEffect, useCallback, useRef } from 'react';
import { USERS, VIEWS } from './lib/theme';
import { useChallenges, usePushNotifications, savePushSubscription } from './hooks/useData';
import { playStartup, playClick, isSoundEnabled, setSoundEnabled, preloadSounds } from './lib/sounds';
import { useMusic } from './features/music/useMusic';
import Onboarding from './pages/Onboarding';
import Navbar from './components/Navbar';
import BottomBar from './components/BottomBar';
import SidePanel from './components/SidePanel';
import Workspace from './components/Workspace';
import ChatScreen from './components/ChatScreen';
import DailyQuote from './features/daily-quotes/DailyQuote';
import SyllabusScreen from './features/syllabus/SyllabusScreen';
import './styles/global.css';

// VAPID public key — paste your public key here after running:
// npx web-push generate-vapid-keys
// Then add private key to Supabase secrets (never in frontend code)
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

export default function App() {
  const [currentUser,   setCurrentUser]   = useState(() => localStorage.getItem('axa_user'));
  const [activeView,    setActiveView]    = useState(VIEWS.OWN);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [syllabusOpen,  setSyllabusOpen]  = useState(false);
  const [soundOn,  setSoundOn]  = useState(() => isSoundEnabled());
  const [quotesOn, setQuotesOn] = useState(() => localStorage.getItem('axa_quotes') !== 'false');
  const startupPlayed = useRef(false);

  const otherUser = currentUser === 'anurag' ? 'anshuman' : 'anurag';
  const { challenges, sendChallenge, updateChallengeStatus } = useChallenges(currentUser || 'anurag');

  // Music — instantiated per user
  const music = useMusic(currentUser || 'anurag');

  usePushNotifications(currentUser);

  // Startup sequence: startup sound → then background music
  useEffect(() => {
    if (currentUser && !startupPlayed.current) {
      startupPlayed.current = true;
      preloadSounds();
      setTimeout(() => playStartup(), 400);
      // Save push subscription so Edge Function can push when app is closed
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted' && VAPID_PUBLIC_KEY) {
            savePushSubscription(currentUser, VAPID_PUBLIC_KEY);
          }
        });
      }
      // Start background music after startup sound (~2s delay)
      if (music.settings.enabled) {
        setTimeout(() => music.startPlayback(), 2000);
      }
    }
  }, [currentUser]); // intentional — only fire once

  const toggleSound = useCallback((val) => {
    setSoundOn(val);
    setSoundEnabled(val);
  }, []);

  const toggleQuotes = useCallback((val) => {
    setQuotesOn(val);
    localStorage.setItem('axa_quotes', String(val));
  }, []);

  const handleMenuItem = useCallback((id) => {
    if (id === 'logout')   { localStorage.removeItem('axa_user'); setCurrentUser(null); }
    if (id === 'syllabus') { setSyllabusOpen(true); }
  }, []);

  const handleViewChange = useCallback((view) => {
    playClick();
    setActiveView(view);
  }, []);

  if (!currentUser) return <Onboarding onSelect={setCurrentUser} />;

  const userTheme = USERS[currentUser];

  return (
    <div style={{ ...styles.root, background: userTheme.bg }}>
      <style>{`
        :root {
          --user-primary: ${userTheme.primary};
          --user-glow: ${userTheme.glow};
          --user-bg: ${userTheme.bg};
          --user-surface: ${userTheme.surface};
          --user-text: ${userTheme.text};
        }
        body { background: ${userTheme.bg}; }
        input::placeholder, textarea::placeholder { color: ${userTheme.textMuted}; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        .skeleton { background: linear-gradient(90deg, ${userTheme.surfaceHigh} 25%, ${userTheme.border} 50%, ${userTheme.surfaceHigh} 75%); background-size: 200% 100%; }
        ::-webkit-scrollbar-thumb { background: ${userTheme.borderHigh}; }
        @keyframes axa-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
        .axa-pulse { animation: axa-pulse 1.5s ease-in-out infinite; }
        @keyframes axa-bar1 { from{height:30%} to{height:90%} }
        @keyframes axa-bar2 { from{height:60%} to{height:100%} }
        @keyframes axa-bar3 { from{height:40%} to{height:70%} }
      `}</style>

      {quotesOn && <DailyQuote user={currentUser} />}

      <Navbar user={currentUser} onHamburger={() => setSidePanelOpen(true)} />

      <div style={styles.viewContainer}>
        <div style={{
          ...styles.viewPane,
          transform: activeView === VIEWS.OWN ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: activeView === VIEWS.OWN ? 2 : 1,
        }}>
          <Workspace ownerUser={currentUser} viewerUser={currentUser} challenges={challenges}
            onSendChallenge={sendChallenge} onChallengeAction={updateChallengeStatus} />
        </div>

        <div style={{
          ...styles.viewPane,
          transform: activeView === VIEWS.OTHER ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: activeView === VIEWS.OTHER ? 2 : 1,
        }}>
          <Workspace ownerUser={otherUser} viewerUser={currentUser} challenges={challenges}
            onSendChallenge={sendChallenge} onChallengeAction={updateChallengeStatus} />
        </div>

        {activeView === VIEWS.CHAT && (
          <ChatScreen currentUser={currentUser} onClose={() => setActiveView(VIEWS.OWN)} />
        )}

        {syllabusOpen && (
          <SyllabusScreen user={currentUser} onClose={() => setSyllabusOpen(false)} />
        )}
      </div>

      <BottomBar currentUser={currentUser} activeView={activeView}
        onViewChange={handleViewChange} unreadCount={0} />

      <SidePanel
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        user={currentUser}
        onMenuItem={handleMenuItem}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        quotesOn={quotesOn}
        onToggleQuotes={toggleQuotes}
        music={music}
      />
    </div>
  );
}

const styles = {
  root:          { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  viewContainer: { flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' },
  viewPane:      { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', willChange: 'transform' },
};
