import React, { useState } from 'react';
import { USERS, TASK_STATUS, REACTION_EMOJIS } from '../lib/theme';
import { useTaskSocial } from '../hooks/useData';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { playClick } from '../lib/sounds';

// ── SVG Icon library ──────────────────────────────────────────────────────────
export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.7 }) {
  const icons = {
    check:      <polyline points="4,12 9,17 20,7" />,
    x:          <><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></>,
    chevronDown:<polyline points="5,8 12,15 19,8" />,
    chevronUp:  <polyline points="5,15 12,8 19,15" />,
    trash:      <><polyline points="3,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" fill="none"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" fill="none"/></>,
    clock:      <><circle cx="12" cy="12" r="9" fill="none"/><polyline points="12,6 12,12 16,14"/></>,
    send:       <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill={color}/></>,
    sword:      <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" fill="none"/><path d="m13 19 6-6" fill="none"/><path d="m16 16 4 4" fill="none"/><path d="m19 21 2-2" fill="none"/></>,
    settings:   <><circle cx="12" cy="12" r="3" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none"/></>,
    book:       <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/></>,
    wind:       <><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" fill="none"/></>,
    logOut:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    alert:      <><circle cx="12" cy="12" r="9" fill="none"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={3}/></>,
    plus:       <><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></>,
    menu:       <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    chat:       <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none"/>,
    target:     <><circle cx="12" cy="12" r="9" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></>,
    calendar:   <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    trophy:     <><path d="M6 9H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5" fill="none"/><path d="M18 9h2a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5" fill="none"/><path d="M6 2h12v7a6 6 0 0 1-12 0V2z" fill="none"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></>,
    history:    <><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5" fill="none"/></>,
    zap:        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={color} stroke="none"/>,
    fire:       <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0C17 7 12 2 12 2zM9.5 14.5c-.5-1.5.5-3 .5-3s1 2 2.5 2.5c0-1 .5-2.5.5-2.5s2 2 1 4a3 3 0 0 1-4.5-1z" fill={color} stroke="none"/>,
    image:      <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/><polyline points="21,15 16,10 5,21"/></>,
    volume:     <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={color} stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none"/></>,
    volumeOff:  <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={color} stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>,
    quote:      <><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" fill="none"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="none"/></>,
    camera:     <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="none"/><circle cx="12" cy="13" r="4" fill="none"/></>,
    sparkles:   <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill={color} stroke="none"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z" fill={color} stroke="none"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {icons[name] || null}
    </svg>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
export default function TaskCard({ task, viewerUser, ownerUser, onToggleSubtask, onToggleComplete, onDelete }) {
  const theme    = USERS[ownerUser];
  const subtasks = task.subtasks || [];
  const hasSubtasks = subtasks.length > 0;

  // KEY UX DECISION: expand by default if task has subtasks so user sees them instantly
  const [expanded,      setExpanded]      = useState(hasSubtasks);
  const [commentText,   setCommentText]   = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Only load social data when expanded
  const { reactions, comments, toggleReaction, addComment } = useTaskSocial(expanded ? task.id : null);

  const doneCount = subtasks.filter(s => s.done).length;
  const progress  = hasSubtasks
    ? Math.round((doneCount / subtasks.length) * 100)
    : (task.status === TASK_STATUS.COMPLETED ? 100 : 0);

  const isMissed    = task.status === TASK_STATUS.MISSED;
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const isOwner     = viewerUser === ownerUser;
  const canEdit     = isOwner && !isMissed;

  const deadlineLabel = () => {
    if (!task.deadline) return null;
    const d = new Date(task.deadline);
    if (isPast(d) && !isCompleted) return 'Missed';
    if (isToday(d))    return `Today ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Tomorrow ${format(d, 'HH:mm')}`;
    return format(d, 'MMM d, HH:mm');
  };

  const dl     = deadlineLabel();
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
      ...S.card,
      background: theme.surface,
      border: `1px solid ${isMissed ? '#ef444428' : isCompleted ? '#22c55e28' : theme.border}`,
      opacity: deleting ? 0.3 : isMissed ? 0.7 : 1,
    }}>
      {/* Top progress stripe */}
      <div style={S.stripe}>
        <div style={{
          ...S.stripeFill,
          width: `${progress}%`,
          background: isCompleted ? '#22c55e' : isMissed ? '#ef4444' : theme.btnGradient,
        }} />
      </div>

      {/* ── Main row ── */}
      <div style={S.row}>
        {/* Checkbox — only for tasks without subtasks (owner only) */}
        {canEdit && !hasSubtasks && (
          <button
            style={{
              ...S.checkbox,
              borderColor:  isCompleted ? '#22c55e' : theme.borderHigh,
              background:   isCompleted ? '#22c55e' : 'transparent',
            }}
            onClick={e => { e.stopPropagation(); onToggleComplete(task); }}
          >
            {isCompleted && <Icon name="check" size={11} color="#fff" strokeWidth={2.8} />}
          </button>
        )}

        {/* Title + meta — tap to toggle expand */}
        <div style={S.info} onClick={() => setExpanded(v => !v)}>
          <div style={{
            ...S.title,
            color: theme.text,
            textDecoration: isMissed ? 'line-through' : 'none',
            opacity: isCompleted ? 0.6 : 1,
          }}>
            {task.title}
          </div>

          <div style={S.meta}>
            {dl && (
              <span style={{ ...S.deadlineTag, color: isMissed ? '#ef4444' : dlPast ? '#f97316' : theme.textMuted }}>
                <Icon name="clock" size={9} color={isMissed ? '#ef4444' : dlPast ? '#f97316' : theme.textMuted} strokeWidth={2} />
                {dl}
              </span>
            )}
            {hasSubtasks && (
              <span style={{ ...S.subtaskTag, color: isCompleted ? '#22c55e' : theme.textMuted }}>
                {doneCount}/{subtasks.length}
              </span>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div style={S.right}>
          {isCompleted && !hasSubtasks && (
            <Icon name="check" size={14} color="#22c55e" strokeWidth={2.5} />
          )}
          {isMissed && <Icon name="alert" size={14} color="#ef4444" />}

          {isOwner && !confirmDelete && (
            <button style={S.iconBtn}
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); playClick(); }}>
              <Icon name="trash" size={14} color={theme.textMuted} />
            </button>
          )}
          {isOwner && confirmDelete && (
            <div style={S.confirmRow} onClick={e => e.stopPropagation()}>
              <button style={{ ...S.cfBtn, color: '#ef4444', background: '#ef444418', border: '1px solid #ef444430' }}
                onClick={handleDelete}>Delete</button>
              <button style={{ ...S.cfBtn, color: theme.textMuted, background: 'rgba(255,255,255,0.05)' }}
                onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          )}

          <button style={S.iconBtn} onClick={() => setExpanded(v => !v)}>
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={15} color={theme.textMuted} />
          </button>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ ...S.body, borderTop: `1px solid ${theme.border}` }}>

          {/* Description */}
          {task.description && (
            <p style={{ ...S.desc, color: theme.textMuted }}>{task.description}</p>
          )}

          {/* Attached images */}
          {task.image_urls?.length > 0 && (
            <div style={S.imgRow}>
              {task.image_urls.map((url, i) => (
                <img key={i} src={url} alt="" style={S.img} onClick={() => window.open(url)} />
              ))}
            </div>
          )}

          {/* Subtasks — shown expanded by default */}
          {hasSubtasks && (
            <div style={S.subtaskList}>
              {subtasks
                .slice()
                .sort((a, b) => a.position - b.position)
                .map(st => (
                  <div key={st.id} style={{ ...S.stRow, borderBottom: `1px solid ${theme.border}` }}>
                    <button
                      style={{
                        ...S.stBox,
                        borderColor: st.done ? '#22c55e' : theme.borderHigh,
                        background:  st.done ? '#22c55e' : 'transparent',
                      }}
                      onClick={() => canEdit && onToggleSubtask(st.id, !st.done, task)}
                      disabled={!canEdit}
                    >
                      {st.done && <Icon name="check" size={9} color="#fff" strokeWidth={2.8} />}
                    </button>
                    <span style={{
                      ...S.stLabel, color: theme.text,
                      textDecoration: st.done ? 'line-through' : 'none',
                      opacity: st.done ? 0.4 : 1,
                    }}>
                      {st.label}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Social: reactions + comments */}
          <div style={{ ...S.social, borderTop: `1px solid ${theme.border}` }}>
            {/* Reactions */}
            <div style={S.reactions}>
              {REACTION_EMOJIS.map(emoji => {
                const count = reactions.filter(r => r.emoji === emoji).length;
                const mine  = reactions.find(r => r.reactor === viewerUser && r.emoji === emoji);
                return (
                  <button key={emoji} style={{
                    ...S.rxBtn,
                    background: mine ? `${theme.primary}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${mine ? theme.primary : 'transparent'}`,
                  }} onClick={() => toggleReaction(viewerUser, emoji)}>
                    {emoji}
                    {count > 0 && <span style={{ ...S.rxCount, color: theme.text }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Comments */}
            {comments.length > 0 && (
              <div style={S.commentList}>
                {comments.map(c => {
                  const ct = USERS[c.author];
                  return (
                    <div key={c.id} style={S.commentRow}>
                      <div style={{ ...S.commentDot, background: ct.primary }} />
                      <span style={{ ...S.commentName, color: ct.primary }}>{ct.displayName}</span>
                      <span style={{ ...S.commentBody, color: theme.text }}>{c.body}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment */}
            <div style={S.commentInput}>
              <input
                style={{ ...S.commentField, background: theme.surfaceHigh, color: theme.text, border: `1px solid ${theme.border}` }}
                placeholder={`Reply as ${USERS[viewerUser].displayName}...`}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              />
              <button
                style={{ ...S.sendBtn, background: commentText.trim() ? theme.btnGradient : 'rgba(255,255,255,0.07)' }}
                onClick={handleSendComment}
              >
                <Icon name="send" size={13} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  card:        { overflow: 'hidden', animation: 'fadeIn 0.2s ease', transition: 'opacity 0.18s' },
  stripe:      { height: 2, background: 'rgba(255,255,255,0.04)' },
  stripeFill:  { height: '100%', transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)' },
  row:         { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px' },
  checkbox:    { width: 20, height: 20, border: '1.5px solid', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  info:        { flex: 1, minWidth: 0, cursor: 'pointer' },
  title:       { fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px', lineHeight: 1.35, fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'opacity 0.2s' },
  meta:        { display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' },
  deadlineTag: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'Space Mono, monospace' },
  subtaskTag:  { fontSize: 10, fontFamily: 'Space Mono, monospace', transition: 'color 0.2s' },
  right:       { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  iconBtn:     { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 0.65 },
  confirmRow:  { display: 'flex', gap: 4 },
  cfBtn:       { padding: '4px 7px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' },
  body:        { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 },
  desc:        { fontSize: 13, lineHeight: 1.65, fontFamily: 'DM Sans, sans-serif' },
  imgRow:      { display: 'flex', gap: 8, flexWrap: 'wrap' },
  img:         { width: 72, height: 72, objectFit: 'cover', cursor: 'pointer' },
  subtaskList: { display: 'flex', flexDirection: 'column' },
  stRow:       { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' },
  stBox:       { width: 17, height: 17, border: '1.5px solid', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  stLabel:     { fontSize: 13, flex: 1, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.18s', lineHeight: 1.4 },
  social:      { paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  reactions:   { display: 'flex', gap: 4, flexWrap: 'wrap' },
  rxBtn:       { padding: '4px 7px', cursor: 'pointer', border: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.15s' },
  rxCount:     { fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700 },
  commentList: { display: 'flex', flexDirection: 'column', gap: 5 },
  commentRow:  { display: 'flex', gap: 6, alignItems: 'baseline' },
  commentDot:  { width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 2 },
  commentName: { fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', flexShrink: 0 },
  commentBody: { fontSize: 13, lineHeight: 1.45, fontFamily: 'DM Sans, sans-serif' },
  commentInput:{ display: 'flex', gap: 6 },
  commentField:{ flex: 1, padding: '8px 10px', fontSize: 13, fontFamily: 'DM Sans, sans-serif' },
  sendBtn:     { width: 34, height: 34, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' },
};
