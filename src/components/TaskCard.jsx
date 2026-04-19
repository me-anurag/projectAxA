import React, { useState } from 'react';
import { USERS, TASK_STATUS, REACTION_EMOJIS } from '../lib/theme';
import { useTaskSocial } from '../hooks/useData';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { playClick } from '../lib/sounds';

// ── SVG Icon library — modern Feather-style, no emoji ──────────────────────
export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.7 }) {
  const icons = {
    check:        <polyline points="4,12 9,17 20,7" />,
    x:            <><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></>,
    chevronDown:  <polyline points="5,8 12,15 19,8" />,
    chevronUp:    <polyline points="5,15 12,8 19,15" />,
    trash:        <><polyline points="3,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" fill="none"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" fill="none"/></>,
    clock:        <><circle cx="12" cy="12" r="9" fill="none"/><polyline points="12,6 12,12 16,14"/></>,
    send:         <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill={color}/></>,
    sword:        <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" fill="none"/><path d="m13 19 6-6" fill="none"/><path d="m16 16 4 4" fill="none"/><path d="m19 21 2-2" fill="none"/></>,
    settings:     <><circle cx="12" cy="12" r="3" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none"/></>,
    book:         <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/></>,
    wind:         <><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" fill="none"/></>,
    logOut:       <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    alert:        <><circle cx="12" cy="12" r="9" fill="none"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={3}/></>,
    plus:         <><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></>,
    menu:         <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    chat:         <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none"/>,
    target:       <><circle cx="12" cy="12" r="9" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></>,
    calendar:     <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    trophy:       <><path d="M6 9H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5" fill="none"/><path d="M18 9h2a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5" fill="none"/><path d="M6 2h12v7a6 6 0 0 1-12 0V2z" fill="none"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></>,
    history:      <><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5" fill="none"/></>,
    zap:          <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={color} stroke="none"/>,
    image:        <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/><polyline points="21,15 16,10 5,21"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {icons[name] || null}
    </svg>
  );
}

// ── TaskCard component ────────────────────────────────────────────────────────
export default function TaskCard({ task, viewerUser, ownerUser, onToggleSubtask, onToggleComplete, onDelete, readonly }) {
  const theme = USERS[ownerUser];
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { reactions, comments, toggleReaction, addComment } = useTaskSocial(expanded ? task.id : null);

  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;
  const progress = subtasks.length > 0
    ? Math.round((doneCount / subtasks.length) * 100)
    : (task.status === TASK_STATUS.COMPLETED ? 100 : 0);
  const isMissed = task.status === TASK_STATUS.MISSED;
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const isOwner = viewerUser === ownerUser;
  const canEdit = isOwner && !isMissed;

  const deadlineLabel = () => {
    if (!task.deadline) return null;
    const d = new Date(task.deadline);
    if (isPast(d) && !isCompleted) return 'Missed';
    if (isToday(d)) return `Today ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Tomorrow ${format(d, 'HH:mm')}`;
    return format(d, 'MMM d, HH:mm');
  };

  const dl = deadlineLabel();
  const dlPast = task.deadline && isPast(new Date(task.deadline)) && !isCompleted;

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    await addComment(viewerUser, commentText);
    setCommentText('');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(task.id); } catch { setDeleting(false); }
  };

  return (
    <div style={{
      ...styles.card,
      background: theme.surface,
      border: `1px solid ${isMissed ? '#ef444428' : isCompleted ? '#22c55e28' : theme.border}`,
      opacity: deleting ? 0.35 : isMissed ? 0.72 : 1,
    }}>
      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{
          ...styles.progressFill,
          width: `${progress}%`,
          background: isCompleted ? '#22c55e' : isMissed ? '#ef4444' : theme.btnGradient,
        }} />
      </div>

      {/* Main row */}
      <div style={styles.mainRow}>
        {canEdit && subtasks.length === 0 && (
          <button
            style={{
              ...styles.checkbox,
              borderColor: isCompleted ? '#22c55e' : theme.borderHigh,
              background: isCompleted ? '#22c55e' : 'transparent',
            }}
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
          >
            {isCompleted && <Icon name="check" size={11} color="#fff" strokeWidth={2.8} />}
          </button>
        )}

        <div style={styles.taskInfo} onClick={() => setExpanded(!expanded)}>
          <div style={{ ...styles.taskTitle, color: theme.text, textDecoration: isMissed ? 'line-through' : 'none' }}>
            {task.title}
          </div>
          <div style={styles.metaRow}>
            {dl && (
              <span style={{ ...styles.deadlineMeta, color: isMissed ? '#ef4444' : dlPast ? '#f97316' : theme.textMuted }}>
                <Icon name="clock" size={9} color={isMissed ? '#ef4444' : dlPast ? '#f97316' : theme.textMuted} strokeWidth={2} />
                {dl}
              </span>
            )}
            {subtasks.length > 0 && (
              <span style={{ ...styles.subtaskMeta, color: theme.textMuted }}>
                {doneCount}/{subtasks.length} steps
              </span>
            )}
          </div>
        </div>

        <div style={styles.rightCol}>
          {isCompleted && <Icon name="check" size={14} color="#22c55e" strokeWidth={2.5} />}
          {isMissed && <Icon name="alert" size={14} color="#ef4444" />}

          {isOwner && !confirmDelete && (
            <button
              style={styles.iconBtn}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); playClick(); }}
            >
              <Icon name="trash" size={14} color={theme.textMuted} />
            </button>
          )}

          {isOwner && confirmDelete && (
            <div style={styles.confirmRow} onClick={e => e.stopPropagation()}>
              <button
                style={{ ...styles.cfBtn, color: '#ef4444', background: '#ef444418', border: '1px solid #ef444436' }}
                onClick={handleDelete}
              >Delete</button>
              <button
                style={{ ...styles.cfBtn, color: theme.textMuted, background: 'rgba(255,255,255,0.05)' }}
                onClick={() => setConfirmDelete(false)}
              >No</button>
            </div>
          )}

          <button style={styles.iconBtn} onClick={() => setExpanded(!expanded)}>
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} color={theme.textMuted} />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ ...styles.expandedBody, borderTop: `1px solid ${theme.border}` }}>
          {task.description && (
            <p style={{ ...styles.description, color: theme.textMuted }}>{task.description}</p>
          )}

          {task.image_urls?.length > 0 && (
            <div style={styles.imagesRow}>
              {task.image_urls.map((url, i) => (
                <img key={i} src={url} alt="" style={styles.taskImage} onClick={() => window.open(url)} />
              ))}
            </div>
          )}

          {subtasks.length > 0 && (
            <div style={styles.subtaskList}>
              {subtasks.sort((a, b) => a.position - b.position).map(st => (
                <div key={st.id} style={{ ...styles.subtaskItem, borderBottom: `1px solid ${theme.border}` }}>
                  <button
                    style={{
                      ...styles.stCheckbox,
                      borderColor: st.done ? '#22c55e' : theme.borderHigh,
                      background: st.done ? '#22c55e' : 'transparent',
                    }}
                    onClick={() => canEdit && onToggleSubtask(st.id, !st.done, task)}
                    disabled={!canEdit}
                  >
                    {st.done && <Icon name="check" size={9} color="#fff" strokeWidth={2.8} />}
                  </button>
                  <span style={{ ...styles.stLabel, color: theme.text, textDecoration: st.done ? 'line-through' : 'none', opacity: st.done ? 0.42 : 1 }}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Social */}
          <div style={{ ...styles.socialSection, borderTop: `1px solid ${theme.border}` }}>
            <div style={styles.reactionBar}>
              {REACTION_EMOJIS.map(emoji => {
                const count = reactions.filter(r => r.emoji === emoji).length;
                const mine = reactions.find(r => r.reactor === viewerUser && r.emoji === emoji);
                return (
                  <button key={emoji} style={{
                    ...styles.reactionBtn,
                    background: mine ? `${theme.primary}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${mine ? theme.primary : 'transparent'}`,
                  }} onClick={() => toggleReaction(viewerUser, emoji)}>
                    {emoji}
                    {count > 0 && <span style={{ ...styles.reactionCount, color: theme.text }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {comments.length > 0 && (
              <div style={styles.commentsList}>
                {comments.map(c => {
                  const cT = USERS[c.author];
                  return (
                    <div key={c.id} style={styles.commentItem}>
                      <div style={{ ...styles.commentDot, background: cT.primary }} />
                      <span style={{ ...styles.commentName, color: cT.primary }}>{cT.displayName}</span>
                      <span style={{ ...styles.commentBody, color: theme.text }}>{c.body}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={styles.commentInput}>
              <input
                style={{ ...styles.commentField, background: theme.surfaceHigh, color: theme.text, border: `1px solid ${theme.border}` }}
                placeholder={`Reply as ${USERS[viewerUser].displayName}...`}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              />
              <button style={{ ...styles.sendBtn, background: commentText.trim() ? theme.btnGradient : 'rgba(255,255,255,0.06)' }} onClick={handleSendComment}>
                <Icon name="send" size={13} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { overflow: 'hidden', animation: 'fadeIn 0.22s ease', transition: 'opacity 0.2s' },
  progressBar: { height: 2, background: 'rgba(255,255,255,0.04)' },
  progressFill: { height: '100%', transition: 'width 0.45s cubic-bezier(0.34,1.56,0.64,1)' },
  mainRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px' },
  checkbox: { width: 20, height: 20, border: '1.5px solid', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  taskInfo: { flex: 1, minWidth: 0, cursor: 'pointer' },
  taskTitle: { fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px', lineHeight: 1.35, fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  metaRow: { display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' },
  deadlineMeta: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'Space Mono, monospace' },
  subtaskMeta: { fontSize: 10, fontFamily: 'Space Mono, monospace' },
  rightCol: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.65, transition: 'opacity 0.15s' },
  confirmRow: { display: 'flex', gap: 4 },
  cfBtn: { padding: '4px 7px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' },
  expandedBody: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 },
  description: { fontSize: 13, lineHeight: 1.65, fontFamily: 'DM Sans, sans-serif' },
  imagesRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  taskImage: { width: 72, height: 72, objectFit: 'cover', cursor: 'pointer' },
  subtaskList: { display: 'flex', flexDirection: 'column' },
  subtaskItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  stCheckbox: { width: 16, height: 16, border: '1.5px solid', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  stLabel: { fontSize: 13, flex: 1, transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif' },
  socialSection: { paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  reactionBar: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  reactionBtn: { padding: '4px 7px', cursor: 'pointer', border: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.15s' },
  reactionCount: { fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700 },
  commentsList: { display: 'flex', flexDirection: 'column', gap: 5 },
  commentItem: { display: 'flex', gap: 6, alignItems: 'baseline' },
  commentDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 2 },
  commentName: { fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', flexShrink: 0 },
  commentBody: { fontSize: 13, lineHeight: 1.45, fontFamily: 'DM Sans, sans-serif' },
  commentInput: { display: 'flex', gap: 6 },
  commentField: { flex: 1, padding: '8px 10px', fontSize: 13, fontFamily: 'DM Sans, sans-serif' },
  sendBtn: { width: 34, height: 34, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' },
};
