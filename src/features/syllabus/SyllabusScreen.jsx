import React, { useState } from 'react';
import { USERS } from '../../lib/theme';
import { Icon } from '../../components/TaskCard';
import { useSyllabus } from './useSyllabus';
import { playClick } from '../../lib/sounds';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Syllabus Screen — slides in over the main view (same pattern as ChatScreen)
// Two tabs:
//   1. MY SYLLABUS  — add/edit/delete headings + subtopics, tick off when done
//   2. COVERAGE     — per-heading log of missions completed under it
// ─────────────────────────────────────────────────────────────────────────────

export default function SyllabusScreen({ user, onClose }) {
  const theme = USERS[user];
  const [tab, setTab] = useState('syllabus'); // 'syllabus' | 'coverage'
  const {
    syllabus, coverage,
    addHeading, editHeading, deleteHeading,
    addSubtopic, toggleSubtopic, deleteSubtopic,
    deleteCoverageEntry,
  } = useSyllabus(user);

  return (
    <div style={{ ...S.root, background: theme.bg, animation: 'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1) forwards' }}>

      {/* ── Header ── */}
      <div style={{ ...S.header, background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <button style={S.backBtn} onClick={() => { playClick(); onClose(); }}>
          <Icon name="chevronDown" size={20} color={theme.textMuted} strokeWidth={2} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <div style={S.headerCenter}>
          <div style={{ ...S.headerTitle, color: theme.text }}>Syllabus</div>
          <div style={{ ...S.headerSub, color: theme.textMuted }}>
            {theme.displayName} {theme.emoji}
          </div>
        </div>
        {/* Accent line */}
        <div style={{ ...S.accentLine, background: theme.btnGradient }} />
      </div>

      {/* ── Tab bar ── */}
      <div style={{ ...S.tabBar, borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
        {[
          { id: 'syllabus', label: 'My Syllabus', icon: 'book' },
          { id: 'coverage', label: 'Coverage',    icon: 'trophy' },
        ].map(t => (
          <button
            key={t.id}
            style={{
              ...S.tabBtn,
              color:        tab === t.id ? theme.primary : theme.textMuted,
              borderBottom: tab === t.id ? `2px solid ${theme.primary}` : '2px solid transparent',
            }}
            onClick={() => { playClick(); setTab(t.id); }}
          >
            <Icon name={t.icon} size={13} color={tab === t.id ? theme.primary : theme.textMuted} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={S.content}>
        {tab === 'syllabus' && (
          <SyllabusTab
            theme={theme}
            syllabus={syllabus}
            onAddHeading={addHeading}
            onEditHeading={editHeading}
            onDeleteHeading={deleteHeading}
            onAddSubtopic={addSubtopic}
            onToggleSubtopic={toggleSubtopic}
            onDeleteSubtopic={deleteSubtopic}
          />
        )}
        {tab === 'coverage' && (
          <CoverageTab
            theme={theme}
            syllabus={syllabus}
            coverage={coverage}
            onDeleteEntry={deleteCoverageEntry}
          />
        )}
      </div>
    </div>
  );
}

// ── TAB 1: My Syllabus ────────────────────────────────────────────────────────
function SyllabusTab({ theme, syllabus, onAddHeading, onEditHeading, onDeleteHeading, onAddSubtopic, onToggleSubtopic, onDeleteSubtopic }) {
  const [newHeading, setNewHeading] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [editingHeadingId, setEditingHeadingId] = useState(null);
  const [editingHeadingVal, setEditingHeadingVal] = useState('');
  const [newSubtopic, setNewSubtopic] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddHeading = () => {
    if (!newHeading.trim()) return;
    onAddHeading(newHeading.trim());
    setNewHeading('');
    playClick();
  };

  const startEditHeading = (h) => {
    setEditingHeadingId(h.id);
    setEditingHeadingVal(h.title);
  };

  const commitEditHeading = (id) => {
    if (editingHeadingVal.trim()) onEditHeading(id, editingHeadingVal.trim());
    setEditingHeadingId(null);
  };

  const handleAddSubtopic = (headingId) => {
    const val = (newSubtopic[headingId] || '').trim();
    if (!val) return;
    onAddSubtopic(headingId, val);
    setNewSubtopic(prev => ({ ...prev, [headingId]: '' }));
    playClick();
  };

  if (syllabus.headings.length === 0) {
    return (
      <div style={S.emptyWrap}>
        <Icon name="book" size={36} color={theme.textMuted} strokeWidth={1.2} />
        <p style={{ ...S.emptyTitle, color: theme.text }}>No syllabus yet</p>
        <p style={{ ...S.emptyDesc, color: theme.textMuted }}>Add headings like "Physics", "Maths Chapter 3" to track what you need to cover.</p>
        <AddHeadingInput theme={theme} value={newHeading} onChange={setNewHeading} onAdd={handleAddHeading} />
      </div>
    );
  }

  return (
    <div style={S.listWrap}>
      {/* Headings list */}
      {syllabus.headings.map(heading => {
        const expanded   = expandedIds[heading.id] !== false; // default expanded
        const doneCount  = heading.subtopics.filter(s => s.done).length;
        const totalCount = heading.subtopics.length;
        const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const allDone    = totalCount > 0 && doneCount === totalCount;

        return (
          <div key={heading.id} style={{ ...S.headingCard, background: theme.surface, border: `1px solid ${allDone ? '#22c55e30' : theme.border}` }}>
            {/* Progress stripe */}
            <div style={S.stripe}>
              <div style={{ ...S.stripeFill, width: `${pct}%`, background: allDone ? '#22c55e' : theme.btnGradient }} />
            </div>

            {/* Heading row */}
            <div style={S.headingRow}>
              {editingHeadingId === heading.id ? (
                <input
                  style={{ ...S.headingEditInput, color: theme.text, background: theme.surfaceHigh, border: `1px solid ${theme.borderHigh}` }}
                  value={editingHeadingVal}
                  autoFocus
                  onChange={e => setEditingHeadingVal(e.target.value)}
                  onBlur={() => commitEditHeading(heading.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEditHeading(heading.id); if (e.key === 'Escape') setEditingHeadingId(null); }}
                />
              ) : (
                <button style={S.headingTitle} onClick={() => toggleExpand(heading.id)}>
                  <span style={{ ...S.headingText, color: allDone ? '#22c55e' : theme.text }}>
                    {heading.title}
                  </span>
                  {totalCount > 0 && (
                    <span style={{ ...S.headingCount, color: allDone ? '#22c55e' : theme.textMuted }}>
                      {doneCount}/{totalCount}
                    </span>
                  )}
                  <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={14} color={theme.textMuted} />
                </button>
              )}

              <div style={S.headingActions}>
                {confirmDeleteId === heading.id ? (
                  <>
                    <button style={{ ...S.smallBtn, color: '#ef4444' }} onClick={() => { onDeleteHeading(heading.id); setConfirmDeleteId(null); }}>Delete</button>
                    <button style={{ ...S.smallBtn, color: theme.textMuted }} onClick={() => setConfirmDeleteId(null)}>No</button>
                  </>
                ) : (
                  <>
                    <button style={S.iconBtn} onClick={() => startEditHeading(heading)}>
                      <Icon name="settings" size={13} color={theme.textMuted} />
                    </button>
                    <button style={S.iconBtn} onClick={() => setConfirmDeleteId(heading.id)}>
                      <Icon name="trash" size={13} color={theme.textMuted} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Subtopics */}
            {expanded && (
              <div style={{ borderTop: `1px solid ${theme.border}` }}>
                {heading.subtopics.length === 0 && (
                  <p style={{ ...S.noSubtopics, color: theme.textMuted }}>No subtopics yet.</p>
                )}
                {heading.subtopics.map(sub => (
                  <div key={sub.id} style={{ ...S.subtopicRow, borderBottom: `1px solid ${theme.border}` }}>
                    <button
                      style={{ ...S.checkbox, borderColor: sub.done ? '#22c55e' : theme.borderHigh, background: sub.done ? '#22c55e' : 'transparent' }}
                      onClick={() => onToggleSubtopic(heading.id, sub.id)}
                    >
                      {sub.done && <Icon name="check" size={9} color="#fff" strokeWidth={2.8} />}
                    </button>
                    <span style={{ ...S.subtopicText, color: theme.text, textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.45 : 1 }}>
                      {sub.title}
                    </span>
                    <button style={S.iconBtn} onClick={() => onDeleteSubtopic(heading.id, sub.id)}>
                      <Icon name="x" size={12} color={theme.textMuted} />
                    </button>
                  </div>
                ))}

                {/* Add subtopic */}
                <div style={S.addSubRow}>
                  <input
                    style={{ ...S.addSubInput, color: theme.text, background: 'transparent', borderBottom: `1px solid ${theme.border}` }}
                    placeholder="Add subtopic..."
                    value={newSubtopic[heading.id] || ''}
                    onChange={e => setNewSubtopic(prev => ({ ...prev, [heading.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtopic(heading.id)}
                  />
                  <button
                    style={{ ...S.addSubBtn, background: theme.btnGradient }}
                    onClick={() => handleAddSubtopic(heading.id)}
                  >
                    <Icon name="plus" size={14} color="#fff" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add new heading */}
      <AddHeadingInput theme={theme} value={newHeading} onChange={setNewHeading} onAdd={handleAddHeading} />
    </div>
  );
}

function AddHeadingInput({ theme, value, onChange, onAdd }) {
  return (
    <div style={{ ...S.addHeadingRow, background: theme.surface, border: `1px solid ${theme.border}` }}>
      <input
        style={{ ...S.addHeadingInput, color: theme.text, background: 'transparent' }}
        placeholder="Add heading (e.g. Physics, Chapter 3)..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
      />
      <button
        style={{ ...S.addHeadingBtn, background: value.trim() ? theme.btnGradient : 'rgba(255,255,255,0.06)', cursor: value.trim() ? 'pointer' : 'default' }}
        onClick={onAdd}
        disabled={!value.trim()}
      >
        <Icon name="plus" size={15} color="#fff" strokeWidth={2.2} />
        <span style={{ color: '#fff', fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>Add Heading</span>
      </button>
    </div>
  );
}

// ── TAB 2: Mission Coverage ───────────────────────────────────────────────────
// Shows ALL headings (including those with 0 missions so user sees the full picture)
// + a "Custom" section at bottom for missions with no heading selected
function CoverageTab({ theme, syllabus, coverage, onDeleteEntry }) {
  const [expandedIds, setExpandedIds] = useState({});
  // Default all to expanded so user sees content immediately
  const isExpanded = (id) => expandedIds[id] !== false;
  const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !isExpanded(id) }));

  const totalMissions = Object.values(coverage).reduce((acc, arr) => acc + arr.length, 0);

  if (syllabus.headings.length === 0 && totalMissions === 0) {
    return (
      <div style={S.emptyWrap}>
        <Icon name="target" size={36} color={theme.textMuted} strokeWidth={1.2} />
        <p style={{ ...S.emptyTitle, color: theme.text }}>No coverage yet</p>
        <p style={{ ...S.emptyDesc, color: theme.textMuted }}>
          Every mission you launch gets recorded here automatically — whether you pick a syllabus topic or use a custom title.
        </p>
      </div>
    );
  }

  const customEntries = coverage['custom'] || [];

  return (
    <div style={S.listWrap}>
      {/* All syllabus headings — shown even if 0 missions */}
      {syllabus.headings.map(heading => {
        const entries = coverage[heading.id] || [];
        const expanded = isExpanded(heading.id);

        return (
          <div key={heading.id} style={{ ...S.headingCard, background: theme.surface, border: `1px solid ${entries.length > 0 ? theme.borderHigh : theme.border}` }}>
            <button style={S.coverageHeadingRow} onClick={() => toggleExpand(heading.id)}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ ...S.coverageHeadingText, color: theme.text }}>{heading.title}</div>
                {entries.length === 0 && (
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: theme.textMuted, marginTop: 2 }}>
                    No missions yet
                  </div>
                )}
              </div>
              {entries.length > 0 && (
                <span style={{ ...S.coverageCount, color: theme.primary, background: `${theme.primary}18` }}>
                  {entries.length} mission{entries.length > 1 ? 's' : ''}
                </span>
              )}
              <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={14} color={theme.textMuted} />
            </button>

            {expanded && entries.length > 0 && (
              <div style={{ borderTop: `1px solid ${theme.border}` }}>
                {entries.map((entry, idx) => (
                  <CoverageEntry key={idx} entry={entry} idx={idx} headingId={heading.id} theme={theme} onDelete={onDeleteEntry} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom / free-form missions */}
      {customEntries.length > 0 && (
        <div style={{ ...S.headingCard, background: theme.surface, border: `1px solid ${theme.borderHigh}` }}>
          <button style={S.coverageHeadingRow} onClick={() => toggleExpand('custom')}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ ...S.coverageHeadingText, color: theme.text }}>Custom Missions</div>
              <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: theme.textMuted, marginTop: 2 }}>
                Missions without a syllabus topic
              </div>
            </div>
            <span style={{ ...S.coverageCount, color: theme.primary, background: `${theme.primary}18` }}>
              {customEntries.length}
            </span>
            <Icon name={isExpanded('custom') ? 'chevronUp' : 'chevronDown'} size={14} color={theme.textMuted} />
          </button>
          {isExpanded('custom') && (
            <div style={{ borderTop: `1px solid ${theme.border}` }}>
              {customEntries.map((entry, idx) => (
                <CoverageEntry key={idx} entry={entry} idx={idx} headingId="custom" theme={theme} onDelete={onDeleteEntry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty hint when headings exist but no missions yet */}
      {totalMissions === 0 && syllabus.headings.length > 0 && (
        <div style={{ padding: '16px 12px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: theme.textMuted, letterSpacing: '0.3px', lineHeight: 1.7 }}>
            Launch a mission and pick a syllabus topic — it will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function CoverageEntry({ entry, idx, headingId, theme, onDelete }) {
  return (
    <div style={{ ...S.coverageEntry, borderBottom: `1px solid ${theme.border}` }}>
      <div style={S.coverageEntryTop}>
        <div style={{ flex: 1 }}>
          <div style={{ ...S.coverageTaskTitle, color: theme.text }}>{entry.taskTitle}</div>
          {entry.description && (
            <div style={{ ...S.coverageDesc, color: theme.textMuted }}>{entry.description}</div>
          )}
          {entry.subtasks?.length > 0 && (
            <div style={S.coverageSubtasks}>
              {entry.subtasks.map((s, si) => (
                <span key={si} style={{ ...S.coverageSubtaskPill, color: theme.primary, background: `${theme.primary}14`, border: `1px solid ${theme.primary}28` }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          <div style={{ ...S.coverageDate, color: theme.textMuted }}>
            <Icon name="clock" size={9} color={theme.textMuted} strokeWidth={2} />
            {format(new Date(entry.date), 'MMM d, yyyy · HH:mm')}
          </div>
        </div>
        <button style={S.iconBtn} onClick={() => onDelete(headingId, idx)}>
          <Icon name="trash" size={13} color={theme.textMuted} />
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root:     { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 20, overflow: 'hidden' },
  header:   { flexShrink: 0, height: 60, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12, position: 'relative' },
  accentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  backBtn:  { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', transform: 'rotate(90deg)' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.3px' },
  headerSub:    { fontSize: 10, fontFamily: 'Space Mono, monospace', marginTop: 1 },
  tabBar:   { display: 'flex', flexShrink: 0 },
  tabBtn:   { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s', letterSpacing: '0.2px' },
  content:  { flex: 1, overflowY: 'auto' },
  listWrap: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  emptyWrap:{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 12, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginTop: 8 },
  emptyDesc:  { fontSize: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, maxWidth: 280 },
  headingCard:   { overflow: 'hidden', animation: 'fadeIn 0.2s ease' },
  stripe:        { height: 2, background: 'rgba(255,255,255,0.04)' },
  stripeFill:    { height: '100%', transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)' },
  headingRow:    { display: 'flex', alignItems: 'center', padding: '11px 12px', gap: 8 },
  headingTitle:  { flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 },
  headingText:   { fontSize: 14, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.2px', flex: 1 },
  headingCount:  { fontSize: 10, fontFamily: 'Space Mono, monospace' },
  headingEditInput: { flex: 1, padding: '6px 8px', fontSize: 14, fontFamily: 'Syne, sans-serif', fontWeight: 700 },
  headingActions:{ display: 'flex', gap: 2, alignItems: 'center' },
  smallBtn:  { padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif' },
  iconBtn:   { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 0.65 },
  subtopicRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' },
  checkbox:      { width: 16, height: 16, border: '1.5px solid', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  subtopicText:  { flex: 1, fontSize: 13, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.18s' },
  noSubtopics:   { padding: '10px 12px', fontSize: 12, fontFamily: 'Space Mono, monospace', letterSpacing: '0.3px' },
  addSubRow:     { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' },
  addSubInput:   { flex: 1, fontSize: 13, fontFamily: 'DM Sans, sans-serif', padding: '5px 0', outline: 'none', border: 'none' },
  addSubBtn:     { width: 30, height: 30, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addHeadingRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginTop: 4 },
  addHeadingInput: { flex: 1, fontSize: 13, fontFamily: 'DM Sans, sans-serif', padding: '6px 0', outline: 'none', border: 'none' },
  addHeadingBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', flexShrink: 0 },
  coverageHeadingRow:  { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' },
  coverageHeadingText: { flex: 1, fontSize: 14, fontWeight: 700, fontFamily: 'Syne, sans-serif' },
  coverageCount:       { fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700, padding: '2px 7px' },
  coverageEntry:       { padding: '10px 12px' },
  coverageEntryTop:    { display: 'flex', gap: 8, alignItems: 'flex-start' },
  coverageTaskTitle:   { fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.2px', marginBottom: 3 },
  coverageDesc:        { fontSize: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, marginBottom: 5 },
  coverageSubtasks:    { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 },
  coverageSubtaskPill: { fontSize: 10, fontFamily: 'Space Mono, monospace', padding: '2px 7px', letterSpacing: '0.3px' },
  coverageDate:        { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'Space Mono, monospace' },
};
