import React, { useState } from 'react';
import { USERS, TASK_STATUS, REACTION_EMOJIS } from '../lib/theme';
import { useTaskSocial } from '../hooks/useData';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

export default function TaskCard({ task, viewerUser, ownerUser, onToggleSubtask, onToggleComplete, readonly }) {
  const theme = USERS[ownerUser];
  const [expanded, setExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { reactions, comments, toggleReaction, addComment } = useTaskSocial(expanded ? task.id : null);

  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;
  const progress = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : (task.status === TASK_STATUS.COMPLETED ? 100 : 0);
  const isMissed = task.status === TASK_STATUS.MISSED;
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const isOwner = viewerUser === ownerUser;
  const canEdit = isOwner && !isMissed;

  const deadlineLabel = () => {
    if (!task.deadline) return null;
    const d = new Date(task.deadline);
    if (isPast(d) && !isCompleted) return `⏰ Missed`;
    if (isToday(d)) return `Today ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Tomorrow ${format(d, 'HH:mm')}`;
    return format(d, 'MMM d, HH:mm');
  };

  const dl = deadlineLabel();

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    await addComment(viewerUser, commentText);
    setCommentText('');
  };

  return (
    <div style={{
      ...styles.card,
      background: theme.surface,
      border: `1px solid ${isMissed ? '#ef444433' : isCompleted ? '#22c55e33' : theme.border}`,
      opacity: isMissed ? 0.7 : 1,
    }}>
      {/* Progress accent top bar */}
      <div style={styles.progressBar}>
        <div style={{
          ...styles.progressFill,
          width: `${progress}%`,
          background: isCompleted ? '#22c55e' : isMissed ? '#ef4444' : theme.btnGradient,
        }} />
      </div>

      {/* Main row */}
      <div style={styles.mainRow} onClick={() => setExpanded(!expanded)}>
        {/* Completion checkbox — only if owner and not missed */}
        {canEdit && subtasks.length === 0 && (
          <button
            style={{
              ...styles.checkbox,
              borderColor: isCompleted ? '#22c55e' : theme.borderHigh,
              background: isCompleted ? '#22c55e' : 'transparent',
            }}
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
          >
            {isCompleted && <span style={styles.checkmark}>✓</span>}
          </button>
        )}

        {/* Task info */}
        <div style={styles.taskInfo}>
          <div style={{ ...styles.taskTitle, color: theme.text, textDecoration: isMissed ? 'line-through' : 'none', fontFamily: 'Syne, sans-serif' }}>
            {task.title}
          </div>
          <div style={styles.metaRow}>
            {dl && (
              <span style={{
                ...styles.deadline,
                color: isMissed ? '#ef4444' : isPast(new Date(task.deadline)) && !isCompleted ? '#f97316' : theme.textMuted,
                fontFamily: 'Space Mono, monospace',
              }}>
                {dl}
              </span>
            )}
            {subtasks.length > 0 && (
              <span style={{ ...styles.subtaskCount, color: theme.textMuted }}>
                {doneCount}/{subtasks.length} tasks
              </span>
            )}
          </div>
        </div>

        {/* Status / expand indicator */}
        <div style={styles.rightCol}>
          {isCompleted && <span style={styles.completedBadge}>✓</span>}
          {isMissed && <span style={styles.missedBadge}>✗</span>}
          <span style={{ ...styles.expandArrow, color: theme.textMuted, transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ ...styles.expandedBody, borderTop: `1px solid ${theme.border}` }}>
          {/* Description */}
          {task.description && (
            <p style={{ ...styles.description, color: theme.textMuted }}>{task.description}</p>
          )}

          {/* Images */}
          {task.image_urls?.length > 0 && (
            <div style={styles.imagesRow}>
              {task.image_urls.map((url, i) => (
                <img key={i} src={url} alt="" style={styles.taskImage} onClick={() => window.open(url)} />
              ))}
            </div>
          )}

          {/* Subtasks */}
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
                    {st.done && <span style={{ fontSize: 9, color: '#fff' }}>✓</span>}
                  </button>
                  <span style={{ ...styles.stLabel, color: theme.text, textDecoration: st.done ? 'line-through' : 'none', opacity: st.done ? 0.5 : 1 }}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Social — Reactions + Comments (visible to both) */}
          <div style={{ ...styles.socialSection, borderTop: `1px solid ${theme.border}` }}>
            {/* Reaction bar */}
            <div style={styles.reactionBar}>
              {REACTION_EMOJIS.map(emoji => {
                const count = reactions.filter(r => r.emoji === emoji).length;
                const myReaction = reactions.find(r => r.reactor === viewerUser && r.emoji === emoji);
                return (
                  <button
                    key={emoji}
                    style={{
                      ...styles.reactionBtn,
                      background: myReaction ? `${theme.primary}33` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${myReaction ? theme.primary : 'transparent'}`,
                    }}
                    onClick={() => toggleReaction(viewerUser, emoji)}
                  >
                    {emoji} {count > 0 && <span style={{ ...styles.reactionCount, color: theme.text }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Comments */}
            {comments.length > 0 && (
              <div style={styles.commentsList}>
                {comments.map(c => {
                  const cTheme = USERS[c.author];
                  return (
                    <div key={c.id} style={styles.commentItem}>
                      <span style={{ ...styles.commentAuthor, color: cTheme.primary }}>{cTheme.emoji}</span>
                      <span style={{ ...styles.commentBody, color: theme.text }}>{c.body}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment */}
            <div style={styles.commentInput}>
              <input
                style={{ ...styles.commentField, background: theme.surfaceHigh, color: theme.text, border: `1px solid ${theme.border}` }}
                placeholder={`Comment as ${USERS[viewerUser].emoji}...`}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              />
              <button
                style={{ ...styles.sendBtn, background: theme.btnGradient, color: '#fff' }}
                onClick={handleSendComment}
              >↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    overflow: 'hidden',
    transition: 'all 0.18s ease',
    animation: 'fadeIn 0.25s ease',
  },
  progressBar: {
    height: 3,
    background: 'rgba(255,255,255,0.04)',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
  },
  mainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    cursor: 'pointer',
  },
  checkbox: {
    width: 22,
    height: 22,
    border: '2px solid',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  checkmark: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 700,
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '-0.2px',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaRow: {
    display: 'flex',
    gap: 12,
    marginTop: 3,
    alignItems: 'center',
  },
  deadline: {
    fontSize: 10,
    letterSpacing: '0.5px',
  },
  subtaskCount: {
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
  },
  rightCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  completedBadge: {
    fontSize: 14,
    color: '#22c55e',
  },
  missedBadge: {
    fontSize: 14,
    color: '#ef4444',
  },
  expandArrow: {
    fontSize: 14,
    transition: 'transform 0.2s ease',
  },
  expandedBody: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 1.6,
  },
  imagesRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  taskImage: {
    width: 72,
    height: 72,
    objectFit: 'cover',
    cursor: 'pointer',
  },
  subtaskList: {
    display: 'flex',
    flexDirection: 'column',
  },
  subtaskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
  },
  stCheckbox: {
    width: 18,
    height: 18,
    border: '1.5px solid',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  stLabel: {
    fontSize: 13,
    flex: 1,
    transition: 'all 0.15s',
  },
  socialSection: {
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  reactionBar: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  reactionBtn: {
    padding: '4px 8px',
    cursor: 'pointer',
    border: 'none',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    transition: 'all 0.15s',
  },
  reactionCount: {
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    fontWeight: 700,
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  commentItem: {
    display: 'flex',
    gap: 6,
    alignItems: 'flex-start',
  },
  commentAuthor: {
    fontSize: 14,
    flexShrink: 0,
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 1.4,
  },
  commentInput: {
    display: 'flex',
    gap: 6,
  },
  commentField: {
    flex: 1,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
  },
  sendBtn: {
    width: 34,
    height: 34,
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
