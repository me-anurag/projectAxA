import React, { useState, useMemo } from 'react';
import { USERS, TASK_STATUS } from '../lib/theme';
import { useTasks } from '../hooks/useData';
import TaskCard, { Icon } from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import ChallengeCard from './ChallengeCard';
import { format, startOfDay, isToday } from 'date-fns';
import { playClick } from '../lib/sounds';

// Task filters — like WhatsApp tabs
const TASK_FILTERS = [
  { id: 'active',    label: 'Active'   },
  { id: 'completed', label: 'Done'     },
  { id: 'missed',    label: 'Missed'   },
  { id: 'history',   label: 'History'  },
];

// Workspace-level view tabs (tasks vs challenges)
const VIEWS = ['tasks', 'challenges'];

export default function Workspace({ ownerUser, viewerUser, challenges = [], onSendChallenge, onChallengeAction }) {
  const theme = USERS[ownerUser];
  const isOwner = ownerUser === viewerUser;
  const [mainView, setMainView] = useState('tasks');       // 'tasks' | 'challenges'
  const [filter, setFilter]     = useState('active');
  const [challengeFilter, setChallengeFilter] = useState('all'); // 'all' | 'sent' | 'received' | 'history'
  const [showCreate, setShowCreate] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  const { tasks, loading, createTask, toggleSubtask, toggleTaskComplete, deleteTask } = useTasks(ownerUser);

  // ── Task grouping ─────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    if (filter === 'history') return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  const groupedByDay = useMemo(() => {
    if (filter !== 'history') return null;
    const groups = {};
    filteredTasks.forEach(task => {
      const day = format(startOfDay(new Date(task.created_at)), 'yyyy-MM-dd');
      if (!groups[day]) groups[day] = [];
      groups[day].push(task);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTasks, filter]);

  // ── Challenge grouping ────────────────────────────────────────────────────
  const allMyChallenges = useMemo(() =>
    challenges.filter(c => c.from_user === ownerUser || c.to_user === ownerUser),
  [challenges, ownerUser]);

  const pendingIncoming = challenges.filter(c => c.to_user === ownerUser && c.status === 'pending');
  const activeAccepted  = allMyChallenges.filter(c => c.status === 'accepted');

  const filteredChallenges = useMemo(() => {
    if (challengeFilter === 'sent')     return allMyChallenges.filter(c => c.from_user === ownerUser);
    if (challengeFilter === 'received') return allMyChallenges.filter(c => c.to_user   === ownerUser);
    if (challengeFilter === 'history')  return allMyChallenges.filter(c => ['completed','missed','declined'].includes(c.status));
    return allMyChallenges; // 'all'
  }, [allMyChallenges, challengeFilter]);

  const handleCreate = async (data) => {
    await createTask({ ...data, userTheme: theme });
  };

  const taskCountFor = (s) => tasks.filter(t => t.status === s).length;

  return (
    <div style={{ ...styles.root, background: theme.bg }}>
      {/* ── Header ── */}
      <div style={{ ...styles.header, borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <div style={{ ...styles.workspaceLabel, color: theme.textMuted }}>
            {isOwner ? 'MY WORKSPACE' : `${theme.emoji} SPECTATING`}
          </div>
          <div style={{ ...styles.workspaceName, color: theme.text }}>
            {theme.displayName}'s Missions
          </div>
        </div>

        {isOwner && (
          <div style={styles.headerActions}>
            {mainView === 'tasks' ? (
              <>
                {/* Challenge button */}
                <button
                  style={{ ...styles.iconActionBtn, borderColor: theme.border, color: theme.textMuted }}
                  onClick={() => { playClick(); setShowChallenge(!showChallenge); setMainView('tasks'); }}
                  title="Send a challenge"
                >
                  <Icon name="sword" size={16} color={showChallenge ? theme.primary : theme.textMuted} />
                </button>
                {/* New task */}
                <button
                  style={{ ...styles.createBtn, background: theme.btnGradient }}
                  onClick={() => { playClick(); setShowCreate(true); }}
                >
                  <Icon name="plus" size={14} color="#fff" />
                  <span>Mission</span>
                </button>
              </>
            ) : (
              <button
                style={{ ...styles.createBtn, background: theme.btnGradient }}
                onClick={() => { playClick(); setShowChallenge(true); setMainView('tasks'); }}
              >
                <Icon name="sword" size={14} color="#fff" />
                <span>Challenge</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Pending challenge notification ── */}
      {pendingIncoming.length > 0 && mainView === 'tasks' && (
        <div style={{ ...styles.alertBar, background: `${theme.primary}14`, borderBottom: `1px solid ${theme.border}` }}>
          <Icon name="sword" size={14} color={theme.primary} />
          <span style={{ ...styles.alertText, color: theme.primary }}>
            {pendingIncoming.length} challenge{pendingIncoming.length > 1 ? 's' : ''} waiting for you
          </span>
          <button
            style={{ ...styles.alertBtn, color: theme.primary, borderColor: `${theme.primary}44` }}
            onClick={() => { playClick(); setMainView('challenges'); setChallengeFilter('received'); }}
          >
            View
          </button>
        </div>
      )}

      {/* ── Send Challenge Panel ── */}
      {showChallenge && isOwner && (
        <SendChallengePanel
          from={ownerUser}
          to={ownerUser === 'anurag' ? 'anshuman' : 'anurag'}
          theme={theme}
          onSend={(data) => { onSendChallenge(data); setShowChallenge(false); }}
          onClose={() => setShowChallenge(false)}
        />
      )}

      {/* ── Main view toggle: Tasks / Challenges ── */}
      <div style={{ ...styles.mainViewToggle, borderBottom: `1px solid ${theme.border}` }}>
        {VIEWS.map(v => (
          <button
            key={v}
            style={{
              ...styles.mainViewBtn,
              color: mainView === v ? theme.primary : theme.textMuted,
              borderBottom: mainView === v ? `2px solid ${theme.primary}` : '2px solid transparent',
            }}
            onClick={() => { playClick(); setMainView(v); }}
          >
            {v === 'tasks'
              ? <><Icon name="target" size={13} color={mainView === v ? theme.primary : theme.textMuted} /> Tasks</>
              : <>
                  <Icon name="sword" size={13} color={mainView === v ? theme.primary : theme.textMuted} />
                  Challenges
                  {pendingIncoming.length > 0 && (
                    <span style={{ ...styles.badge, background: theme.primary }}>{pendingIncoming.length}</span>
                  )}
                </>
            }
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TASKS VIEW
      ══════════════════════════════════════════════════════ */}
      {mainView === 'tasks' && (
        <>
          {/* Active accepted challenges shown in tasks view */}
          {filter === 'active' && activeAccepted.length > 0 && (
            <div style={{ padding: '8px 12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeAccepted.map(c => (
                <ChallengeCard key={c.id} challenge={c} viewerUser={viewerUser} ownerUser={ownerUser} onAction={onChallengeAction} compact />
              ))}
            </div>
          )}

          {/* Task filter tabs */}
          <div style={{ ...styles.filterRow, borderBottom: `1px solid ${theme.border}` }}>
            {TASK_FILTERS.map(f => (
              <button
                key={f.id}
                style={{
                  ...styles.filterTab,
                  color: filter === f.id ? theme.primary : theme.textMuted,
                  borderBottom: filter === f.id ? `2px solid ${theme.primary}` : '2px solid transparent',
                }}
                onClick={() => { playClick(); setFilter(f.id); }}
              >
                {f.label}
                {f.id !== 'history' && taskCountFor(f.id) > 0 && (
                  <span style={{ ...styles.filterCount, background: filter === f.id ? theme.primary : 'rgba(255,255,255,0.08)' }}>
                    {taskCountFor(f.id)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div style={styles.scrollArea}>
            {loading ? (
              <SkeletonLoader theme={theme} />
            ) : filter === 'history' ? (
              groupedByDay && groupedByDay.length > 0
                ? groupedByDay.map(([day, dayTasks]) => (
                    <div key={day}>
                      <div style={{ ...styles.dateHeader, color: theme.textMuted, background: theme.surfaceHigh }}>
                        <Icon name="calendar" size={10} color={theme.textMuted} />
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '1.5px' }}>
                          {isToday(new Date(day)) ? 'TODAY' : format(new Date(day), 'EEE, MMM d yyyy').toUpperCase()}
                        </span>
                        <span style={{ opacity: 0.4, marginLeft: 4 }}>{dayTasks.length}</span>
                      </div>
                      {dayTasks.map(task => (
                        <TaskCard key={task.id} task={task} viewerUser={viewerUser} ownerUser={ownerUser}
                          onToggleSubtask={(id, done, t) => toggleSubtask(id, done, t, theme)}
                          onToggleComplete={(t) => toggleTaskComplete(t, theme)}
                          onDelete={deleteTask} />
                      ))}
                    </div>
                  ))
                : <EmptyState filter={filter} theme={theme} isOwner={isOwner} />
            ) : (
              filteredTasks.length > 0
                ? <div style={styles.taskItems}>
                    {filteredTasks.map(task => (
                      <TaskCard key={task.id} task={task} viewerUser={viewerUser} ownerUser={ownerUser}
                        onToggleSubtask={(id, done, t) => toggleSubtask(id, done, t, theme)}
                        onToggleComplete={(t) => toggleTaskComplete(t, theme)}
                        onDelete={deleteTask} />
                    ))}
                  </div>
                : <EmptyState filter={filter} theme={theme} isOwner={isOwner} />
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          CHALLENGES VIEW
      ══════════════════════════════════════════════════════ */}
      {mainView === 'challenges' && (
        <>
          {/* Challenge sub-filters */}
          <div style={{ ...styles.filterRow, borderBottom: `1px solid ${theme.border}` }}>
            {[
              { id: 'all',      label: 'All'      },
              { id: 'received', label: 'Received' },
              { id: 'sent',     label: 'Sent'     },
              { id: 'history',  label: 'History'  },
            ].map(f => {
              const count = f.id === 'all'      ? allMyChallenges.length
                          : f.id === 'received' ? allMyChallenges.filter(c => c.to_user === ownerUser).length
                          : f.id === 'sent'     ? allMyChallenges.filter(c => c.from_user === ownerUser).length
                          : allMyChallenges.filter(c => ['completed','missed','declined'].includes(c.status)).length;
              return (
                <button
                  key={f.id}
                  style={{
                    ...styles.filterTab,
                    color: challengeFilter === f.id ? theme.primary : theme.textMuted,
                    borderBottom: challengeFilter === f.id ? `2px solid ${theme.primary}` : '2px solid transparent',
                  }}
                  onClick={() => { playClick(); setChallengeFilter(f.id); }}
                >
                  {f.label}
                  {count > 0 && (
                    <span style={{ ...styles.filterCount, background: challengeFilter === f.id ? theme.primary : 'rgba(255,255,255,0.08)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Challenge list */}
          <div style={styles.scrollArea}>
            {filteredChallenges.length === 0 ? (
              <EmptyChallenges theme={theme} filter={challengeFilter} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredChallenges.map(c => (
                  <div key={c.id} style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
                    <ChallengeCard challenge={c} viewerUser={viewerUser} ownerUser={ownerUser} onAction={onChallengeAction} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showCreate && (
        <CreateTaskModal user={ownerUser} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ filter, theme, isOwner }) {
  const cfg = {
    active:    { icon: 'target',   msg: isOwner ? 'No active missions. Launch one!' : 'No active missions.' },
    completed: { icon: 'trophy',   msg: 'No completed missions yet.'  },
    missed:    { icon: 'alert',    msg: 'No missed missions. Keep it up.'           },
    history:   { icon: 'history',  msg: 'No history yet.'             },
  };
  const { icon, msg } = cfg[filter] || cfg.active;
  return (
    <div style={styles.emptyState}>
      <Icon name={icon} size={32} color={theme.textMuted} strokeWidth={1.2} />
      <p style={{ color: theme.textMuted, fontFamily: 'Space Mono, monospace', fontSize: 11, textAlign: 'center', letterSpacing: '0.5px', marginTop: 14 }}>
        {msg}
      </p>
    </div>
  );
}

function EmptyChallenges({ theme, filter }) {
  const msgs = {
    all:      'No challenges yet. Dare someone.',
    sent:     'You haven\'t sent any challenges.',
    received: 'No challenges received.',
    history:  'No challenge history yet.',
  };
  return (
    <div style={styles.emptyState}>
      <Icon name="sword" size={32} color={theme.textMuted} strokeWidth={1.2} />
      <p style={{ color: theme.textMuted, fontFamily: 'Space Mono, monospace', fontSize: 11, textAlign: 'center', letterSpacing: '0.5px', marginTop: 14 }}>
        {msgs[filter] || msgs.all}
      </p>
    </div>
  );
}

function SkeletonLoader({ theme }) {
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 58, background: theme.surfaceHigh, opacity: 1 - (i - 1) * 0.25 }} />
      ))}
    </div>
  );
}

function SendChallengePanel({ from, to, theme, onSend, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const toTheme = USERS[to];

  const inputStyle = { padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ ...styles.challengePanel, background: theme.surfaceHigh, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="sword" size={15} color={theme.primary} />
        <span style={{ ...styles.challengePanelHeader, color: theme.text }}>
          Challenge {toTheme.emoji} {toTheme.displayName}
        </span>
        <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }} onClick={onClose}>
          <Icon name="x" size={16} color={theme.textMuted} />
        </button>
      </div>
      <input style={inputStyle} placeholder="Challenge title..." value={title} onChange={e => setTitle(e.target.value)} />
      <input style={{ ...inputStyle, marginTop: 6 }} placeholder="Description (optional)..." value={description} onChange={e => setDescription(e.target.value)} />
      <input type="datetime-local" style={{ ...inputStyle, marginTop: 6, colorScheme: 'dark' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button style={styles.cBtn} onClick={onClose}>Cancel</button>
        <button
          style={{ ...styles.cBtn, flex: 1, background: title ? theme.btnGradient : 'rgba(255,255,255,0.06)', color: title ? '#fff' : theme.textMuted }}
          onClick={() => title && onSend({ from, to, title, description, deadline: deadline ? new Date(deadline).toISOString() : null })}
        >
          <Icon name="sword" size={13} color={title ? '#fff' : theme.textMuted} />
          Send Challenge
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' },
  header: { padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  workspaceLabel: { fontSize: 9, fontFamily: 'Space Mono, monospace', letterSpacing: '2px', marginBottom: 3 },
  workspaceName: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.4px', fontFamily: 'Syne, sans-serif' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center' },
  createBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#fff', whiteSpace: 'nowrap' },
  iconActionBtn: { width: 34, height: 34, background: 'none', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  alertBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', flexShrink: 0 },
  alertText: { flex: 1, fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 600 },
  alertBtn: { padding: '4px 10px', background: 'none', border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif' },
  mainViewToggle: { display: 'flex', flexShrink: 0 },
  mainViewBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s', position: 'relative' },
  badge: { fontSize: 9, color: '#fff', padding: '1px 5px', borderRadius: 99, fontFamily: 'Space Mono, monospace', fontWeight: 700 },
  filterRow: { display: 'flex', flexShrink: 0, overflowX: 'auto' },
  filterTab: { padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif', letterSpacing: '0.3px', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' },
  filterCount: { fontSize: 10, padding: '1px 5px', borderRadius: 99, color: '#fff', fontFamily: 'Space Mono, monospace', fontWeight: 700 },
  scrollArea: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  taskItems: { display: 'flex', flexDirection: 'column', gap: 1 },
  dateHeader: { padding: '5px 14px', fontSize: 10, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', top: 0, zIndex: 2 },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 },
  challengePanel: { padding: 14, display: 'flex', flexDirection: 'column', flexShrink: 0, animation: 'fadeIn 0.2s ease' },
  challengePanelHeader: { fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif' },
  cBtn: { padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 },
};
