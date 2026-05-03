import React, { useState, useEffect, useCallback, useRef } from 'react';
import { USERS, VIEWS } from './lib/theme';
import { useChallenges, usePushNotifications, requestNotificationPermission, sendOSNotification } from './hooks/useData';
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

export default function App() {
  const [currentUser,   setCurrentUser]   = useState(() => localStorage.getItem('axa_user'));
  const [activeView,    setActiveView]    = useState(VIEWS.OWN);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [syllabusOpen,  setSyllabusOpen]  = useState(false);
  const [soundOn,  setSoundOn]  = useState(() => isSoundEnabled());
  const [quotesOn, setQuotesOn] = useState(() => localStorage.getItem('axa_quotes') !== 'false');
  // In-app toast state
  const [toast, setToast] = useState(null); // { title, body }
  const toastTimerRef = useRef(null);
  const startupPlayed = useRef(false);

  const otherUser = currentUser === 'anurag' ? 'anshuman' : 'anurag';
  const { challenges, sendChallenge, updateChallengeStatus } = useChallenges(currentUser || 'anurag');
  const music = useMusic(currentUser || 'anurag');

  // Show in-app toast — auto-dismisses after 4 seconds
  const showToast = useCallback(({ title, body }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, body });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Wire notifications — passes showToast so it shows banner when app is focused
  usePushNotifications(currentUser, showToast);

  useEffect(() => {
    if (currentUser && !startupPlayed.current) {
      startupPlayed.current = true;
      preloadSounds();
      requestNotificationPermission();
      setTimeout(() => playStartup(), 400);
      if (music.settings.enabled) {
        setTimeout(() => music.startPlayback(), 2000);
      }
    }
  }, [currentUser]); // intentional

  const toggleSound = useCallback((val) => { setSoundOn(val); setSoundEnabled(val); }, []);
  const toggleQuotes = useCallback((val) => { setQuotesOn(val); localStorage.setItem('axa_quotes', String(val)); }, []);

  const handlePingRef = useRef(null);

  const handleMenuItem = useCallback((id) => {
    if (id === 'logout')   { localStorage.removeItem('axa_user'); setCurrentUser(null); }
    if (id === 'syllabus') { setSyllabusOpen(true); }
    if (id === 'ping')     { handlePingRef.current?.(); } // use ref — avoids stale closure
  }, []);

  // Ping — tests the full notification pipeline end to end
  const handlePing = useCallback(async () => {
    const theme = USERS[currentUser];
    showToast({ title: `🔔 Sending ping...`, body: 'Testing notification pipeline...' });
    try {
      const fnUrl = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/axa-push`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          'x-webhook-secret': process.env.REACT_APP_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({ type: 'ping', user_id: currentUser }),
      });
      const data = await res.json();
      if (data.ok && data.results?.[0]?.sent) {
        showToast({ title: `✅ Ping sent!`, body: 'Lock your screen — OS notification should appear.' });
      } else {
        const reason = data.results?.[0]?.reason || 'Check Edge Function logs in Supabase';
        showToast({ title: `⚠️ Ping failed`, body: reason });
      }
    } catch (e) {
      const title = `🔔 Ping — ${theme?.displayName || 'Test'}`;
      showToast({ title, body: 'Edge Function unreachable. Check deployment.' });
      sendOSNotification(title, 'In-app path works. Server push not reachable.');
    }
  }, [currentUser, showToast]);

  // Keep ref current so handleMenuItem can always call the latest handlePing
  handlePingRef.current = handlePing;

  const handleViewChange = useCallback((view) => { playClick(); setActiveView(view); }, []);

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
        ::-webkit-scrollbar-thumb { background: ${userTheme.borderHigh}; }
        @keyframes axa-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
        .axa-pulse { animation: axa-pulse 1.5s ease-in-out infinite; }
        @keyframes axa-bar1 { from{height:30%} to{height:90%} }
        @keyframes axa-bar2 { from{height:60%} to{height:100%} }
        @keyframes axa-bar3 { from{height:40%} to{height:70%} }
        @keyframes axa-toast-in { from{transform:translateY(-80px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes axa-toast-out { from{opacity:1} to{opacity:0} }
      `}</style>

      {quotesOn && <DailyQuote user={currentUser} />}

      {/* ── In-app toast notification banner ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          padding: '12px 16px',
          background: userTheme.surface,
          borderBottom: `1px solid ${userTheme.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'axa-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
          boxShadow: `0 4px 24px rgba(0,0,0,0.5)`,
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: userTheme.btnGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: userTheme.text, letterSpacing: '-0.2px' }}>
              {toast.title}
            </div>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: userTheme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {toast.body}
            </div>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: userTheme.textMuted, fontSize: 16, flexShrink: 0 }}
            onClick={() => setToast(null)}
          >✕</button>
        </div>
      )}

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
