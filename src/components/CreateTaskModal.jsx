import React, { useState, useRef } from 'react';
import { USERS } from '../lib/theme';
import { format } from 'date-fns';
import { playClick } from '../lib/sounds';
import { Icon } from './TaskCard';
import AISubtaskScanner from '../features/ai-subtasks/AISubtaskScanner';

export default function CreateTaskModal({ user, onSubmit, onClose }) {
  const theme = USERS[user];
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [subtasks,    setSubtasks]    = useState([]);
  const [newSubtask,  setNewSubtask]  = useState('');
  const [images,      setImages]      = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [showAI,      setShowAI]      = useState(false);
  const fileRef = useRef();

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    playClick();
    setSubtasks(prev => [...prev, newSubtask.trim()]);
    setNewSubtask('');
  };

  const editSubtask = (i, val) => {
    setSubtasks(prev => prev.map((s, idx) => idx === i ? val : s));
  };

  const removeSubtask = (i) => {
    setSubtasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    setImages(files);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        subtaskLabels: subtasks.filter(s => s.trim()),
        imageFiles: images,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const inp = {
    width: '100%',
    background: theme.surfaceHigh,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  };

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        ...styles.modal,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        animation: 'slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>

        {/* Header */}
        <div style={{ ...styles.header, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.accentBar, background: theme.btnGradient }} />
          <span style={{ ...styles.headerTitle, color: theme.text }}>New Mission</span>
          <button style={{ ...styles.closeBtn, color: theme.textMuted }} onClick={onClose}>
            <Icon name="x" size={16} color={theme.textMuted} />
          </button>
        </div>

        <div style={styles.body}>

          {/* Title */}
          <Field label="MISSION TITLE *" theme={theme}>
            <input
              style={inp}
              placeholder="What must be done?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="DESCRIPTION" theme={theme}>
            <textarea
              style={{ ...inp, minHeight: 64, resize: 'vertical' }}
              placeholder="Add context... (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Field>

          {/* Deadline */}
          <Field label="DEADLINE" theme={theme}>
            <input
              type="datetime-local"
              style={{ ...inp, colorScheme: 'dark' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </Field>

          {/* Subtasks */}
          <Field
            label="SUBTASKS"
            theme={theme}
            action={
              <button
                style={{ ...styles.aiToggleBtn, color: theme.primary, borderColor: `${theme.primary}40`, background: showAI ? `${theme.primary}18` : 'transparent' }}
                onClick={() => { playClick(); setShowAI(!showAI); }}
              >
                <Icon name="sparkles" size={11} color={theme.primary} />
                AI Scan
              </button>
            }
          >
            {/* AI Scanner (Coming Soon) */}
            {showAI && (
              <AISubtaskScanner
                theme={theme}
                onSubtasksGenerated={(items) => {
                  setSubtasks(prev => [...prev, ...items.map(i => i.label)]);
                  setShowAI(false);
                }}
              />
            )}

            {/* Subtask list — editable */}
            {subtasks.map((s, i) => (
              <div key={i} style={{ ...styles.subtaskRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.subtaskBullet, background: theme.primary }} />
                <input
                  style={{ ...styles.subtaskInput, color: theme.text, background: 'transparent' }}
                  value={s}
                  onChange={e => editSubtask(i, e.target.value)}
                />
                <button style={styles.removeBtn} onClick={() => removeSubtask(i)}>
                  <Icon name="x" size={12} color="#ef4444" />
                </button>
              </div>
            ))}

            {/* Add new subtask */}
            <div style={styles.addRow}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
              />
              <button
                style={{ ...styles.addBtn, background: theme.btnGradient }}
                onClick={addSubtask}
              >
                <Icon name="plus" size={16} color="#fff" strokeWidth={2.2} />
              </button>
            </div>
          </Field>

          {/* Images */}
          <Field label="ATTACH IMAGES" theme={theme}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImages}
            />
            <button
              style={{ ...styles.attachBtn, borderColor: theme.border, color: theme.textMuted }}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="image" size={14} color={theme.textMuted} />
              <span>{images.length ? `${images.length} image${images.length > 1 ? 's' : ''} attached` : 'Tap to attach images'}</span>
            </button>
            {images.length > 0 && (
              <div style={styles.thumbRow}>
                {images.map((f, i) => (
                  <div key={i} style={styles.thumbWrap}>
                    <img src={URL.createObjectURL(f)} alt="" style={styles.thumb} />
                    <button
                      style={styles.thumbRemove}
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Icon name="x" size={9} color="#fff" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

        </div>

        {/* Footer */}
        <div style={{ ...styles.footer, borderTop: `1px solid ${theme.border}` }}>
          <button style={{ ...styles.cancelBtn, color: theme.textMuted }} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.submitBtn,
              background: title.trim() ? theme.btnGradient : 'rgba(255,255,255,0.07)',
              color: title.trim() ? '#fff' : theme.textMuted,
              cursor: title.trim() && !submitting ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Launching...' : 'Launch Mission'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, theme, children, action }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldHeader}>
        <span style={{ ...styles.fieldLabel, color: theme.textMuted }}>{label}</span>
        {action && action}
      </div>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 60, backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%', maxWidth: 540, maxHeight: '92vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', padding: '0 16px',
    height: 52, position: 'relative', flexShrink: 0,
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  headerTitle: {
    flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px',
    fontFamily: 'Syne, sans-serif',
  },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', display: 'flex' },
  body: {
    flex: 1, overflowY: 'auto', padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 10, fontFamily: 'Space Mono, monospace', letterSpacing: '1.5px', fontWeight: 700 },
  aiToggleBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', border: '1px solid', cursor: 'pointer',
    fontSize: 10, fontWeight: 700, fontFamily: 'Space Mono, monospace', letterSpacing: '0.5px',
    background: 'transparent', transition: 'all 0.15s',
  },
  subtaskRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
  },
  subtaskBullet: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  subtaskInput: {
    flex: 1, border: 'none', outline: 'none', fontSize: 13,
    fontFamily: 'DM Sans, sans-serif', padding: '2px 0',
  },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex' },
  addRow: { display: 'flex', gap: 8, marginTop: 4 },
  addBtn: {
    width: 38, height: 38, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  attachBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '10px 12px', border: '1px dashed',
    background: 'none', cursor: 'pointer', fontSize: 13,
    fontFamily: 'DM Sans, sans-serif', textAlign: 'left',
    boxSizing: 'border-box',
  },
  thumbRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  thumbWrap: { position: 'relative' },
  thumb: { width: 56, height: 56, objectFit: 'cover' },
  thumbRemove: {
    position: 'absolute', top: -5, right: -5,
    background: '#ef4444', border: 'none', cursor: 'pointer',
    width: 16, height: 16, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    display: 'flex', gap: 8, padding: '12px 16px', flexShrink: 0,
  },
  cancelBtn: {
    padding: '10px 16px', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
  },
  submitBtn: {
    flex: 1, padding: '12px 16px', border: 'none', fontSize: 14,
    fontWeight: 600, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.2px',
    transition: 'all 0.15s',
  },
};
