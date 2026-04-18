import React, { useState, useEffect, useCallback } from 'react';
import { USERS, VIEWS } from './lib/theme';
import { useChallenges } from './hooks/useData';
import { playChallengeReceived, playClick } from './lib/sounds';
import Onboarding from './pages/Onboarding';
import Navbar from './components/Navbar';
import BottomBar from './components/BottomBar';
import SidePanel from './components/SidePanel';
import Workspace from './components/Workspace';
import ChatScreen from './components/ChatScreen';
import './styles/global.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('axa_user'));
  const [activeView, setActiveView] = useState(VIEWS.OWN);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [prevChallengeCount, setPrevChallengeCount] = useState(0);

  const otherUser = currentUser === 'anurag' ? 'anshuman' : 'anurag';
  const theme = currentUser ? USERS[currentUser] : null;

  const { challenges, sendChallenge, updateChallengeStatus } = useChallenges(currentUser || 'anurag');

  // Notify when new challenge arrives
  useEffect(() => {
    const incomingPending = challenges.filter(c => c.to_user === currentUser && c.status === 'pending');
    if (incomingPending.length > prevChallengeCount && prevChallengeCount > 0) {
      playChallengeReceived();
    }
    setPrevChallengeCount(incomingPending.length);
  }, [challenges, currentUser, prevChallengeCount]);

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
  const ownerOfOtherView = otherUser;

  return (
    <div style={{ ...styles.root, background: userTheme.bg }}>
      {/* CSS variables for current user theme */}
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

      {/* Navbar */}
      <Navbar
        user={currentUser}
        onHamburger={() => setSidePanelOpen(true)}
        activeView={activeView}
      />

      {/* View Container — slides between own/other/chat */}
      <div style={styles.viewContainer}>
        {/* OWN workspace */}
        <div style={{
          ...styles.viewPane,
          transform: activeView === VIEWS.OWN ? 'translateX(0)' : activeView === VIEWS.CHAT ? 'translateX(-100%)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: activeView === VIEWS.OWN ? 2 : 1,
        }}>
          <Workspace
            ownerUser={currentUser}
            viewerUser={currentUser}
            challenges={challenges}
            onSendChallenge={(data) => sendChallenge(data)}
            onChallengeAction={(id, status) => updateChallengeStatus(id, status)}
          />
        </div>

        {/* OTHER user workspace — slides from right */}
        <div style={{
          ...styles.viewPane,
          transform: activeView === VIEWS.OTHER ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: activeView === VIEWS.OTHER ? 2 : 1,
        }}>
          <Workspace
            ownerUser={ownerOfOtherView}
            viewerUser={currentUser}
            challenges={challenges}
            onSendChallenge={(data) => sendChallenge(data)}
            onChallengeAction={(id, status) => updateChallengeStatus(id, status)}
          />
        </div>

        {/* CHAT — slides up from bottom */}
        {activeView === VIEWS.CHAT && (
          <ChatScreen
            currentUser={currentUser}
            onClose={() => setActiveView(VIEWS.OWN)}
          />
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
