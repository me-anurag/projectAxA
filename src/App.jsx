import React, { useState, useEffect, useCallback, useRef } from 'react';
import { USERS, VIEWS } from './lib/theme';
import { useChallenges, usePushNotifications } from './hooks/useData';
import { playStartup, playClick, isSoundEnabled, setSoundEnabled, preloadSounds } from './lib/sounds';
import Onboarding from './pages/Onboarding';
import Navbar from './components/Navbar';
import BottomBar from './components/BottomBar';
import SidePanel from './components/SidePanel';
import Workspace from './components/Workspace';
import ChatScreen from './components/ChatScreen';
import DailyQuote from './features/daily-quotes/DailyQuote';
import './styles/global.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('axa_user'));
  const [activeView,  setActiveView]  = useState(VIEWS.OWN);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [soundOn,  setSoundOn]  = useState(() => isSoundEnabled());
  const [quotesOn, setQuotesOn] = useState(() => localStorage.getItem('axa_quotes') !== 'false');
  const startupPlayed = useRef(false);

  const otherUser = currentUser === 'anurag' ? 'anshuman' : 'anurag';
  const { challenges, sendChallenge, updateChallengeStatus } = useChallenges(currentUser || 'anurag');

  // Push notifications
  usePushNotifications(currentUser);

  // Startup sound — plays once per session after user is identified
  useEffect(() => {
    if (currentUser && !startupPlayed.current) {
      startupPlayed.current = true;
      preloadSounds();
      // Short delay so browser allows autoplay after user interaction on onboarding
      setTimeout(() => playStartup(), 400);
    }
  }, [currentUser]);

  // Sync sound setting to localStorage
  const toggleSound = useCallback((val) => {
    setSoundOn(val);
    setSoundEnabled(val);
  }, []);

  // Sync quotes setting to localStorage
  const toggleQuotes = useCallback((val) => {
    setQuotesOn(val);
    localStorage.setItem('axa_quotes', String(val));
  }, []);

  const handleMenuItem = useCallback((id) => {
    if (id === 'logout') {
      localStorage.removeItem('axa_user');
      setCurrentUser(null);
    }
  }, []);

  const handleViewChange = useCallback((view) => {
    playClick();
    setActiveView(view);
  }, []);

  if (!currentUser) {
    return <Onboarding onSelect={setCurrentUser} />;
  }

  const userTheme = USERS[currentUser];

  return (
    <div style={{ ...styles.root, background: userTheme.bg }}>
      {/* Per-user CSS variables */}
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
      `}</style>

      {/* Daily Quote overlay (6am, if enabled) */}
      {quotesOn && <DailyQuote user={currentUser} />}

      {/* Navbar */}
      <Navbar user={currentUser} onHamburger={() => setSidePanelOpen(true)} />

      {/* View container */}
      <div style={styles.viewContainer}>
        {/* OWN workspace */}
        <div style={{
          ...styles.viewPane,
          transform: activeView === VIEWS.OWN ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: activeView === VIEWS.OWN ? 2 : 1,
        }}>
          <Workspace
            ownerUser={currentUser}
            viewerUser={currentUser}
            challenges={challenges}
            onSendChallenge={sendChallenge}
            onChallengeAction={updateChallengeStatus}
          />
        </div>

        {/* OTHER workspace */}
        <div style={{
          ...styles.viewPane,
          transform: activeView === VIEWS.OTHER ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: activeView === VIEWS.OTHER ? 2 : 1,
        }}>
          <Workspace
            ownerUser={otherUser}
            viewerUser={currentUser}
            challenges={challenges}
            onSendChallenge={sendChallenge}
            onChallengeAction={updateChallengeStatus}
          />
        </div>

        {/* CHAT */}
        {activeView === VIEWS.CHAT && (
          <ChatScreen currentUser={currentUser} onClose={() => setActiveView(VIEWS.OWN)} />
        )}
      </div>

      {/* Bottom Bar */}
      <BottomBar
        currentUser={currentUser}
        activeView={activeView}
        onViewChange={handleViewChange}
        unreadCount={0}
      />

      {/* Side Panel */}
      <SidePanel
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        user={currentUser}
        onMenuItem={handleMenuItem}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        quotesOn={quotesOn}
        onToggleQuotes={toggleQuotes}
      />
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  viewContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
  },
  viewPane: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    willChange: 'transform',
  },
};
