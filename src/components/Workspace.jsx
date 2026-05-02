import React, { useState, useMemo, useRef, useCallback } from 'react';
import { USERS } from '../lib/theme';
import { useTasks } from '../hooks/useData';
import TaskCard, { Icon } from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import ChallengeCard from './ChallengeCard';
import {
  format, startOfDay, isToday, isPast,
  addDays, subDays, parseISO, isSameDay,
} from 'date-fns';
import { playClick, playCheckbox } from '../lib/sounds';

function dk(d)      { return format(d, 'yyyy-MM-dd'); }
function todayKey() { return dk(new Date()); }
function toDate(k)  { return parseISO(k); }

export default function Workspace({ ownerUser, viewerUser, challenges = [], onSendChallenge, onChallengeAction }) {
  const theme   = USERS[ownerUser];
  const isOwner = ownerUser === viewerUser;

  const [mainView,        setMainView]        = useState('tasks');
  const [currentDate,     setCurrentDate]     = useState(todayKey());
  const [challengeFilter, setChallengeFilter] = useState('all');
  const [showCreate,      setShowCreate]      = useState(false);
  const [showCalendar,    setShowCalendar]    = useState(false);
  const [showChallenge,   setShowChallenge]   = useState(false);
  const [slideDir,        setSlideDir]        = useState(null);
  const [quickText,       setQuickText]       = useState('');
  const [adding,          setAdding]          = useState(false);

  const touchStartX   = useRef(null);
  const quickInputRef = useRef(null);

  const { tasks, loading, createTask, toggleSubtask, toggleTaskComplete, deleteTask } = useTasks(ownerUser);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const k = dk(startOfDay(new Date(t.created_at)));
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [tasks]);

  const currentTasks   = tasksByDate[currentDate] || [];
  const currentDateObj = toDate(currentDate);
  const isCurrentToday  = currentDate === todayKey();
  const isCurrentPast   = !isCurrentToday && isPast(startOfDay(currentDateObj));
  const editable        = isOwner && isCurrentToday;

  const stats = useMemo(() => ({
    total:  currentTasks.length,
    done:   currentTasks.filter(t => t.status === 'completed').length,
    missed: currentTasks.filter(t => t.status === 'missed').length,
    active: currentTasks.filter(t => t.status === 'active').length,
  }), [currentTasks]);

  const goTo = useCallback((dir) => {
    playClick();
    setSlideDir(dir);
    setTimeout(() => {
      setCurrentDate(prev => dk(dir === 'next' ? addDays(toDate(prev), 1) : subDays(toDate(prev), 1)));
      setSlideDir(null);
    }, 150);
  }, []);

  const jumpTo = useCallback((key) => { setCurrentDate(key); setShowCalendar(false); }, []);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 52) return;
    goTo(dx < 0 ? 'next' : 'prev');
  };

  const handleQuickAdd = useCallback(async () => {
    const title = quickText.trim();
    if (!title || adding) return;
    setAdding(true);
    setQuickText('');
    playCheckbox();
    try {
      await createTask({ title, description: null, deadline: null, subtaskLabels: [], imageFiles: [] });
    } catch {
      setQuickText(title);
    } finally {
      setAdding(false);
      setTimeout(() => quickInputRef.current?.focus(), 50);
    }
  }, [quickText, adding, createTask]);

  const handleQuickKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickAdd(); }
  };

  const dateLabel = () => {
    if (isCurrentToday) return 'Today';
    if (isSameDay(currentDateObj, addDays(new Date(), 1))) return 'Tomorrow';
    if (isSameDay(currentDateObj, subDays(new Date(), 1))) return 'Yesterday';
    return format(currentDateObj, 'EEE, MMM d');
  };

  const handleCreate = async (data) => { await createTask({ ...data, userTheme: theme }); };

  const allMyChallenges = useMemo(() =>
    challenges.filter(c => c.from_user === ownerUser || c.to_user === ownerUser),
  [challenges, ownerUser]);
  const pendingIncoming = challenges.filter(c => c.to_user === ownerUser && c.status === 'pending');

  const filteredChallenges = useMemo(() => {
    if (challengeFilter === 'sent')     return allMyChallenges.filter(c => c.from_user === ownerUser);
    if (challengeFilter === 'received') return allMyChallenges.filter(c => c.to_user   === ownerUser);
    if (challengeFilter === 'history')  return allMyChallenges.filter(c => ['completed','missed','declined'].includes(c.status));
    return allMyChallenges;
  }, [allMyChallenges, challengeFilter, ownerUser]);

  return (
    <div style={{ ...S.root, background: theme.bg }}>

      {/* Header */}
      <div style={{ ...S.header, borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <div style={{ ...S.wsLabel, color: theme.textMuted }}>
            {isOwner ? 'MY WORKSPACE' : `${theme.emoji} SPECTATING`}
          </div>
          <div style={{ ...S.wsName, color: theme.text }}>
            {theme.displayName}'s Missions
          </div>
        </div>
        <div style={S.headerActions}>
          {mainView === 'tasks' && (
            <>
              {isOwner && (
                <button style={{ ...S.iconBtn, borderColor: theme.border }}
                  onClick={() => { playClick(); setShowChallenge(v => !v); }}
                >
                  <Icon name="sword" size={15} color={showChallenge ? theme.primary : theme.textMuted} />
                </button>
              )}
              <button style={{ ...S.iconBtn, borderColor: theme.border }}
                onClick={() => { playClick(); setShowCalendar(v => !v); }}
              >
                <Icon name="calendar" size={15} color={showCalendar ? theme.primary : theme.textMuted} />
              </button>
            </>
          )}
        </div>
      </div>

      {showCalendar && (
        <CalendarPicker theme={theme} tasksByDate={tasksByDate} currentKey={currentDate}
          onSelect={jumpTo} onClose={() => setShowCalendar(false)} />
      )}

      {showChallenge && isOwner && (
        <SendChallengePanel
          from={ownerUser} to={ownerUser === 'anurag' ? 'anshuman' : 'anurag'}
          theme={theme}
          onSend={(data) => { onSendChallenge(data); setShowChallenge(false); }}
          onClose={() => setShowChallenge(false)}
        />
      )}

      {pendingIncoming.length > 0 && mainView === 'tasks' && (
        <div style={{ ...S.alertBar, background: `${theme.primary}14`, borderBottom: `1px solid ${theme.border}` }}>
          <Icon name="sword" size={14} color={theme.primary} />
          <span style={{ ...S.alertText, color: theme.primary }}>
            {pendingIncoming.length} challenge{pendingIncoming.length > 1 ? 's' : ''} waiting
          </span>
          <button style={{ ...S.alertBtn, color: theme.primary, borderColor: `${theme.primary}44` }}
            onClick={() => { playClick(); setMainView('challenges'); setChallengeFilter('received'); }}>
            View
          </button>
        </div>
      )}

      {/* Tasks / Challenges toggle */}
      <div style={{ ...S.tabToggle, borderBottom: `1px solid ${theme.border}` }}>
        {['tasks', 'challenges'].map(v => (
          <button key={v}
            style={{ ...S.tabBtn,
              color: mainView === v ? theme.primary : theme.textMuted,
              borderBottom: mainView === v ? `2px solid ${theme.primary}` : '2px solid transparent',
            }}
            onClick={() => { playClick(); setMainView(v); }}
          >
            {v === 'tasks'
              ? <><Icon name="target" size={13} color={mainView === v ? theme.primary : theme.textMuted} /> Tasks</>
              : <><Icon name="sword"  size={13} color={mainView === v ? theme.primary : theme.textMuted} /> Challenges
                  {pendingIncoming.length > 0 && <span style={{ ...S.badge, background: theme.primary }}>{pendingIncoming.length}</span>}
                </>
            }
          </button>
        ))}
      </div>

      {/* ══ TASKS ══ */}
      {mainView === 'tasks' && (
        <>
          {/* Date navigator */}
          <div style={{ ...S.dateNav, borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
            <button style={S.navArrow} onClick={() => goTo('prev')}>
              <Icon name="chevronDown" size={20} color={theme.textMuted} strokeWidth={2}
                style={{ transform: 'rotate(90deg)', display: 'block' }} />
            </button>
            <div style={S.dateNavCenter}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ ...S.dateNavLabel, color: isCurrentToday ? theme.primary : theme.text }}>
                  {dateLabel()}
                </span>
                {isCurrentToday && <span style={{ ...S.todayPulse, background: theme.primary }} className="axa-pulse" />}
                {isCurrentPast  && <Icon name="lock" size={11} color={theme.textMuted} />}
              </div>
              <div style={{ ...S.dateNavSub, color: theme.textMuted }}>
                {format(currentDateObj, 'EEEE · MMMM d, yyyy')}
              </div>
              {stats.total > 0 && (
                <div style={S.statsRow}>
                  <span style={{ ...S.statChip, color: theme.textMuted, background: 'rgba(255,255,255,0.06)' }}>{stats.total}</span>
                  {stats.done   > 0 && <span style={{ ...S.statChip, color: '#22c55e', background: '#22c55e18' }}>✓ {stats.done}</span>}
                  {stats.missed > 0 && <span style={{ ...S.statChip, color: '#ef4444', background: '#ef444418' }}>✗ {stats.missed}</span>}
                  {stats.active > 0 && <span style={{ ...S.statChip, color: theme.primary, background: `${theme.primary}18` }}>· {stats.active}</span>}
                </div>
              )}
            </div>
            <button style={S.navArrow} onClick={() => goTo('next')}>
              <Icon name="chevronDown" size={20} color={theme.textMuted} strokeWidth={2}
                style={{ transform: 'rotate(-90deg)', display: 'block' }} />
            </button>
          </div>

          {/* Task list */}
          <div
            style={{
              ...S.taskPane,
              animation: slideDir
                ? `${slideDir === 'next' ? 'slideOutLeft' : 'slideOutRight'} 0.15s ease forwards`
                : 'slideInFade 0.18s ease forwards',
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {loading
              ? <SkeletonLoader theme={theme} />
              : currentTasks.length === 0
                ? <EmptyDate theme={theme} isOwner={isOwner} isPast={isCurrentPast} isToday={isCurrentToday} />
                : <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {currentTasks.map((task, i) => (
                      <div key={task.id} style={{ animation: `taskPop 0.2s ease ${i * 0.04}s both` }}>
                        <TaskCard
                          task={task}
                          viewerUser={editable ? viewerUser : ownerUser}
                          ownerUser={ownerUser}
                          onToggleSubtask={(sid, done) => editable && toggleSubtask(sid, done, task, theme)}
                          onToggleComplete={() => editable && toggleTaskComplete(task, theme)}
                          onDelete={() => editable && deleteTask(task.id)}
                        />
                      </div>
                    ))}
                    <div style={{ height: 8 }} />
                  </div>
            }
          </div>

          {/* Quick-add bar — only for owner on non-past dates */}
          {isOwner && !isCurrentPast && (
            <div style={{
              ...S.quickBar,
              background: theme.surface,
              borderTop: `1px solid ${theme.border}`,
              paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
            }}>
              <div style={S.quickRow}>
                {/* Input */}
                <div style={{ ...S.quickWrap, background: theme.surfaceHigh, border: `1px solid ${theme.border}` }}>
                  <input
                    ref={quickInputRef}
                    style={{ ...S.quickInput, color: theme.text }}
                    placeholder={isCurrentToday ? 'Add a mission...' : `Plan for ${dateLabel()}...`}
                    value={quickText}
                    onChange={e => setQuickText(e.target.value)}
                    onKeyDown={handleQuickKey}
                    disabled={adding}
                  />
                </div>

                {/* + button — instant add */}
                <button
                  style={{
                    ...S.quickAddBtn,
                    background: quickText.trim() ? theme.btnGradient : 'rgba(255,255,255,0.07)',
                  }}
                  onClick={handleQuickAdd}
                  disabled={adding || !quickText.trim()}
                >
                  <Icon name="plus" size={18} color={quickText.trim() ? '#fff' : theme.textMuted} strokeWidth={2.5} />
                </button>

                {/* Mission button — full modal */}
                <button
                  style={{ ...S.missionBtn, background: theme.btnGradient }}
                  onClick={() => { playClick(); setShowCreate(true); }}
                >
                  <Icon name="target" size={14} color="#fff" />
                  <span>Mission</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ CHALLENGES ══ */}
      {mainView === 'challenges' && (
        <>
          <div style={{ ...S.filterRow, borderBottom: `1px solid ${theme.border}` }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'received', label: 'Received' },
              { id: 'sent', label: 'Sent' },
              { id: 'history', label: 'History' },
            ].map(f => {
              const count =
                f.id === 'all'      ? allMyChallenges.length :
                f.id === 'received' ? allMyChallenges.filter(c => c.to_user === ownerUser).length :
                f.id === 'sent'     ? allMyChallenges.filter(c => c.from_user === ownerUser).length :
                allMyChallenges.filter(c => ['completed','missed','declined'].includes(c.status)).length;
              return (
                <button key={f.id}
                  style={{ ...S.filterTab,
                    color: challengeFilter === f.id ? theme.primary : theme.textMuted,
                    borderBottom: challengeFilter === f.id ? `2px solid ${theme.primary}` : '2px solid transparent',
                  }}
                  onClick={() => { playClick(); setChallengeFilter(f.id); }}
                >
                  {f.label}
                  {count > 0 && <span style={{ ...S.filterCount, background: challengeFilter === f.id ? theme.primary : 'rgba(255,255,255,0.08)' }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div style={S.challengeArea}>
            {filteredChallenges.length === 0
              ? <EmptyChallenges theme={theme} filter={challengeFilter} />
              : filteredChallenges.map(c => (
                  <div key={c.id} style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
                    <ChallengeCard challenge={c} viewerUser={viewerUser} ownerUser={ownerUser} onAction={onChallengeAction} />
                  </div>
                ))
            }
          </div>
        </>
      )}

      {showCreate && (
        <CreateTaskModal
          user={ownerUser}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          prefillDate={currentDateObj}
        />
      )}
    </div>
  );
}

function EmptyDate({ theme, isOwner, isPast, isToday }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 12, textAlign: 'center' }}>
      <Icon name={isPast ? 'lock' : 'target'} size={40} color={theme.textMuted} strokeWidth={1.1} />
      <p style={{ color: theme.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>
        {isPast ? 'No missions this day' : isToday ? 'No missions yet' : 'Nothing planned yet'}
      </p>
      <p style={{ color: theme.textMuted, fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.4px', lineHeight: 1.8, maxWidth: 240 }}>
        {isPast
          ? 'This day has passed and cannot be edited.'
          : isToday
          ? 'Type below and press + to add instantly.\nOr tap Mission for deadline & notes.'
          : 'Type below to plan a mission for this day.'}
      </p>
    </div>
  );
}

function CalendarPicker({ theme, tasksByDate, currentKey, onSelect, onClose }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const year = viewMonth.getFullYear(), month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div style={{ ...S.calBox, background: theme.surface, border: `1px solid ${theme.border}` }}>
      <div style={S.calHead}>
        <button style={S.calNav} onClick={() => setViewMonth(new Date(year, month - 1))}>
          <Icon name="chevronDown" size={14} color={theme.textMuted} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <span style={{ ...S.calMonth, color: theme.text }}>{format(viewMonth, 'MMMM yyyy')}</span>
        <button style={S.calNav} onClick={() => setViewMonth(new Date(year, month + 1))}>
          <Icon name="chevronDown" size={14} color={theme.textMuted} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button style={{ ...S.calNav, marginLeft: 8 }} onClick={onClose}>
          <Icon name="x" size={14} color={theme.textMuted} />
        </button>
      </div>
      <div style={S.calDayNames}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ ...S.calDayName, color: theme.textMuted }}>{d}</div>
        ))}
      </div>
      <div style={S.calGrid}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const k = format(new Date(year, month, day), 'yyyy-MM-dd');
          const hasTask = !!(tasksByDate[k] || []).length;
          const isT  = isToday(new Date(year, month, day));
          const isCur = k === currentKey;
          return (
            <button key={k}
              style={{ ...S.calDay,
                background: isT ? theme.primary : isCur ? `${theme.primary}28` : 'transparent',
                color: isT ? '#fff' : theme.text,
                fontWeight: isT || isCur ? 700 : 400,
                outline: isCur && !isT ? `1.5px solid ${theme.primary}` : 'none',
              }}
              onClick={() => onSelect(k)}
            >
              {day}
              {hasTask && !isT && <div style={{ ...S.calDot, background: theme.primary }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyChallenges({ theme, filter }) {
  const msg = { all: 'No challenges yet.', sent: 'No challenges sent.', received: 'No challenges received.', history: 'No history yet.' };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
      <Icon name="sword" size={32} color={theme.textMuted} strokeWidth={1.2} />
      <p style={{ color: theme.textMuted, fontFamily: 'Space Mono, monospace', fontSize: 11, textAlign: 'center' }}>
        {msg[filter] || msg.all}
      </p>
    </div>
  );
}

function SkeletonLoader({ theme }) {
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 56, opacity: 1 - (i - 1) * 0.25 }} />
      ))}
    </div>
  );
}

function SendChallengePanel({ from, to, theme, onSend, onClose }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc]   = useState('');
  const [dl, setDl]       = useState('');
  const toT = USERS[to];
  const inp = { padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, width: '100%', boxSizing: 'border-box' };
  return (
    <div style={{ ...S.challengePanel, background: theme.surfaceHigh, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="sword" size={15} color={theme.primary} />
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: theme.text }}>
          Challenge {toT.emoji} {toT.displayName}
        </span>
        <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
          <Icon name="x" size={16} color={theme.textMuted} />
        </button>
      </div>
      <input style={inp} placeholder="Challenge title..." value={title} onChange={e => setTitle(e.target.value)} />
      <input style={{ ...inp, marginTop: 6 }} placeholder="Description (optional)..." value={desc} onChange={e => setDesc(e.target.value)} />
      <input type="datetime-local" style={{ ...inp, marginTop: 6, colorScheme: 'dark' }} value={dl} onChange={e => setDl(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button style={S.cBtn} onClick={onClose}>Cancel</button>
        <button
          style={{ ...S.cBtn, flex: 1, background: title ? theme.btnGradient : 'rgba(255,255,255,0.06)', color: title ? '#fff' : theme.textMuted }}
          onClick={() => title && onSend({ from, to, title, description: desc, deadline: dl ? new Date(dl).toISOString() : null })}
        >
          <Icon name="sword" size={13} color={title ? '#fff' : theme.textMuted} />
          Send Challenge
        </button>
      </div>
    </div>
  );
}

const S = {
  root:           { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', position: 'relative' },
  header:         { padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  wsLabel:        { fontSize: 9, fontFamily: 'Space Mono, monospace', letterSpacing: '2px', marginBottom: 2 },
  wsName:         { fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px', fontFamily: 'Syne, sans-serif' },
  headerActions:  { display: 'flex', gap: 8 },
  iconBtn:        { width: 34, height: 34, background: 'none', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  alertBar:       { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', flexShrink: 0 },
  alertText:      { flex: 1, fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 600 },
  alertBtn:       { padding: '3px 10px', background: 'none', border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif' },
  tabToggle:      { display: 'flex', flexShrink: 0 },
  tabBtn:         { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' },
  badge:          { fontSize: 9, color: '#fff', padding: '1px 5px', borderRadius: 99, fontFamily: 'Space Mono, monospace', fontWeight: 700 },
  dateNav:        { display: 'flex', alignItems: 'center', padding: '6px 0', flexShrink: 0 },
  navArrow:       { width: 44, minHeight: 48, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dateNavCenter:  { flex: 1, textAlign: 'center' },
  dateNavLabel:   { fontSize: 17, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.3px' },
  dateNavSub:     { fontSize: 10, fontFamily: 'Space Mono, monospace', marginTop: 2 },
  todayPulse:     { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  statsRow:       { display: 'flex', gap: 5, justifyContent: 'center', marginTop: 5, flexWrap: 'wrap' },
  statChip:       { fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700, padding: '2px 7px' },
  taskPane:       { flex: 1, overflowY: 'auto' },
  // Quick-add bar
  quickBar:       { flexShrink: 0, padding: '8px 10px' },
  quickRow:       { display: 'flex', alignItems: 'center', gap: 7 },
  quickWrap:      { flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 2 },
  quickInput:     { flex: 1, fontSize: 14, fontFamily: 'DM Sans, sans-serif', padding: '10px 0', background: 'none', border: 'none', outline: 'none' },
  quickAddBtn:    { width: 40, height: 40, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' },
  missionBtn:     { display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 40, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#fff', flexShrink: 0, whiteSpace: 'nowrap' },
  // Calendar
  calBox:         { position: 'absolute', top: 60, right: 8, zIndex: 30, padding: 12, width: 258, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeIn 0.15s ease' },
  calHead:        { display: 'flex', alignItems: 'center', marginBottom: 10 },
  calNav:         { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  calMonth:       { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif' },
  calDayNames:    { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 },
  calDayName:     { textAlign: 'center', fontSize: 9, fontFamily: 'Space Mono, monospace', padding: '2px 0' },
  calGrid:        { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
  calDay:         { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif', borderRadius: 4 },
  calDot:         { position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%' },
  filterRow:      { display: 'flex', flexShrink: 0, overflowX: 'auto' },
  filterTab:      { padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all 0.15s' },
  filterCount:    { fontSize: 10, padding: '1px 5px', borderRadius: 99, color: '#fff', fontFamily: 'Space Mono, monospace', fontWeight: 700 },
  challengeArea:  { flex: 1, overflowY: 'auto' },
  challengePanel: { padding: 14, display: 'flex', flexDirection: 'column', flexShrink: 0, animation: 'fadeIn 0.2s ease' },
  cBtn:           { padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 },
};
