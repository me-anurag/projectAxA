import React, { useState, useMemo } from 'react';
import { USERS, TASK_STATUS } from '../lib/theme';
import { useTasks } from '../hooks/useData';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import ChallengeCard from './ChallengeCard';
import { format, startOfDay, isToday } from 'date-fns';
import { playClick } from '../lib/sounds';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Done' },
  { id: 'missed', label: 'Missed' },
  { id: 'history', label: 'History' },
];

export default function Workspace({ ownerUser, viewerUser, challenges = [], onSendChallenge, onChallengeAction }) {
  const theme = USERS[ownerUser];
  const viewerTheme = USERS[viewerUser];
  const isOwner = ownerUser === viewerUser;
  const [filter, setFilter] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  const { tasks, loading, createTask, toggleSubtask, toggleTaskComplete } = useTasks(ownerUser);

  const filteredTasks = useMemo(() => {
    if (filter === 'history') return tasks; // Show all, grouped by date
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  // Group tasks by day for history view
  const grouped = useMemo(() => {
    if (filter !== 'history') return null;
    const groups = {};
    filteredTasks.forEach(task => {
      const day = format(startOfDay(new Date(task.created_at)), 'yyyy-MM-dd');
      if (!groups[day]) groups[day] = [];
      groups[day].push(task);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTasks, filter]);

  const handleCreate = async (data) => {
    await createTask({ ...data, userTheme: theme });
  };

  const myChallenges = challenges.filter(c => c.to_user === ownerUser && c.status === 'pending');

  return (
    <div style={{ ...styles.root, background: theme.bg }}>
      {/* Header */}
      <div style={{ ...styles.header, borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <div style={{ ...styles.workspaceLabel, color: theme.textMuted }}>
            {isOwner ? 'MY WORKSPACE' : `${theme.emoji} WATCHING`}
          </div>
          <div style={{ ...styles.workspaceName, color: theme.text, fontFamily: 'Syne, sans-serif' }}>
            {theme.displayName}'s Missions
          </div>
        </div>
        {isOwner && (
          <div style={styles.headerActions}>
            <button
              style={{ ...styles.challengeBtn, borderColor: theme.border, color: theme.textMuted }}
              onClick={() => { playClick(); setShowChallenge(!showChallenge); }}
            >
              ⚔️
            </button>
            <button
              style={{ ...styles.createBtn, background: theme.btnGradient, color: '#fff' }}
              onClick={() => { playClick(); setShowCreate(true); }}
            >
              + Mission
            </button>
          </div>
        )}
      </div>

      {/* Challenge notification bar */}
      {myChallenges.length > 0 && (
        <div style={{ ...styles.challengeBar, background: `${theme.primary}18`, borderBottom: `1px solid ${theme.border}` }}>
          {myChallenges.map(c => (
            <ChallengeCard key={c.id} challenge={c} viewerUser={viewerUser} ownerUser={ownerUser} onAction={onChallengeAction} />
          ))}
        </div>
      )}

      {/* Outgoing challenges from owner */}
      {showChallenge && isOwner && (
        <SendChallengePanel
          from={ownerUser}
          to={ownerUser === 'anurag' ? 'anshuman' : 'anurag'}
          theme={theme}
          onSend={(data) => { onSendChallenge(data); setShowChallenge(false); }}
          onClose={() => setShowChallenge(false)}
        />
      )}

      {/* All challenges sent to/by owner */}
      {filter === 'active' && challenges.filter(c => (c.from_user === ownerUser || c.to_user === ownerUser) && c.status === 'accepted').length > 0 && (
        <div style={{ padding: '8px 12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {challenges
            .filter(c => (c.from_user === ownerUser || c.to_user === ownerUser) && c.status === 'accepted')
            .map(c => (
              <ChallengeCard key={c.id} challenge={c} viewerUser={viewerUser} ownerUser={ownerUser} onAction={onChallengeAction} compact />
            ))
          }
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ ...styles.filterRow, borderBottom: `1px solid ${theme.border}` }}>
        {FILTERS.map(f => (
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
            {f.id !== 'history' && (
              <span style={{ ...styles.filterCount, background: filter === f.id ? theme.primary : 'rgba(255,255,255,0.08)' }}>
                {tasks.filter(t => t.status === f.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={styles.taskList}>
        {loading ? (
          <div style={styles.loadingState}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...styles.skeleton, background: theme.surfaceHigh, opacity: 1 - (i - 1) * 0.2 }} className="skeleton" />
            ))}
          </div>
        ) : filter === 'history' ? (
          // History — grouped by date
          grouped && grouped.length > 0 ? grouped.map(([day, dayTasks]) => (
            <div key={day}>
              <div style={{ ...styles.dateHeader, color: theme.textMuted, background: theme.surfaceHigh }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '1.5px' }}>
                  {isToday(new Date(day)) ? 'TODAY' : format(new Date(day), 'EEE, MMM d yyyy').toUpperCase()}
                </span>
                <span style={{ marginLeft: 8, opacity: 0.5 }}>{dayTasks.length} missions</span>
              </div>
              {dayTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewerUser={viewerUser}
                  ownerUser={ownerUser}
                  onToggleSubtask={(stId, done, t) => toggleSubtask(stId, done, t, theme)}
                  onToggleComplete={(t) => toggleTaskComplete(t, theme)}
                  readonly={!isOwner}
                />
              ))}
            </div>
          )) : <EmptyState filter={filter} theme={theme} isOwner={isOwner} />
        ) : (
          filteredTasks.length > 0 ? (
            <div style={styles.taskItems}>
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewerUser={viewerUser}
                  ownerUser={ownerUser}
                  onToggleSubtask={(stId, done, t) => toggleSubtask(stId, done, t, theme)}
                  onToggleComplete={(t) => toggleTaskComplete(t, theme)}
                  readonly={!isOwner}
                />
              ))}
            </div>
          ) : <EmptyState filter={filter} theme={theme} isOwner={isOwner} />
        )}
      </div>

      {showCreate && (
        <CreateTaskModal
          user={ownerUser}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ filter, theme, isOwner }) {
  const messages = {
    active: isOwner ? 'No active missions. Launch one!' : 'No active missions right now.',
    completed: 'No completed missions yet.',
    missed: 'No missed missions. 🎯',
    history: 'No history yet.',
  };
  return (
    <div style={styles.emptyState}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>
        {filter === 'active' ? '🎯' : filter === 'completed' ? '✅' : filter === 'missed' ? '💪' : '📅'}
      </div>
      <p style={{ color: theme.textMuted, fontFamily: 'Space Mono, monospace', fontSize: 11, textAlign: 'center', letterSpacing: '0.5px' }}>
        {messages[filter]}
      </p>
    </div>
  );
}

function SendChallengePanel({ from, to, theme, onSend, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const toTheme = USERS[to];

  return (
    <div style={{ ...styles.challengePanel, background: theme.surfaceHigh, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ ...styles.challengePanelHeader, color: theme.text }}>
        Challenge {toTheme.emoji} {toTheme.displayName}
      </div>
      <input
        style={{ ...styles.cInput, background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
        placeholder="Challenge title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <input
        style={{ ...styles.cInput, background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
        placeholder="Description (optional)..."
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <input
        type="datetime-local"
        style={{ ...styles.cInput, background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, colorScheme: 'dark' }}
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...styles.cBtn, background: 'rgba(255,255,255,0.06)', color: theme.textMuted }} onClick={onClose}>
          Cancel
        </button>
        <button
          style={{ ...styles.cBtn, flex: 1, background: theme.btnGradient, color: '#fff' }}
          onClick={() => title && onSend({ from, to, title, description, deadline: deadline ? new Date(deadline).toISOString() : null })}
        >
          ⚔️ Send Challenge
        </button>
      </div>
    </div>
  );
}

const styles = {
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  workspaceLabel: {
    fontSize: 9,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '2px',
    marginBottom: 3,
  },
  workspaceName: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  createBtn: {
    padding: '8px 14px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Syne, sans-serif',
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
  },
  challengeBtn: {
    padding: '8px 10px',
    background: 'none',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 16,
  },
  challengeBar: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  filterRow: {
    display: 'flex',
    flexShrink: 0,
    overflowX: 'auto',
  },
  filterTab: {
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Syne, sans-serif',
    letterSpacing: '0.3px',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  },
  filterCount: {
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 99,
    color: '#fff',
    fontFamily: 'Space Mono, monospace',
    fontWeight: 700,
  },
  taskList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  taskItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  loadingState: {
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  skeleton: {
    height: 64,
    width: '100%',
  },
  dateHeader: {
    padding: '6px 16px',
    fontSize: 10,
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  challengePanel: {
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
    animation: 'fadeIn 0.2s ease',
  },
  challengePanelHeader: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'Syne, sans-serif',
    marginBottom: 4,
  },
  cInput: {
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
  },
  cBtn: {
    padding: '10px 14px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Syne, sans-serif',
  },
};
