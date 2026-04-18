import React, { useState, useRef } from 'react';
import { USERS } from '../lib/theme';
import { format } from 'date-fns';
import { playClick } from '../lib/sounds';

export default function CreateTaskModal({ user, onSubmit, onClose }) {
  const theme = USERS[user];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    playClick();
    setSubtasks(prev => [...prev, newSubtask.trim()]);
    setNewSubtask('');
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
        subtaskLabels: subtasks,
        imageFiles: images,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: theme.surfaceHigh,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        ...styles.modal,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        animation: 'slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>
        {/* Header */}
        <div style={{ ...styles.header, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.headerAccent, background: theme.btnGradient }} />
          <span style={{ ...styles.headerTitle, color: theme.text, fontFamily: 'Syne, sans-serif' }}>
            New Mission {theme.emoji}
          </span>
          <button style={{ ...styles.closeBtn, color: theme.textMuted }} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Title */}
          <div style={styles.field}>
            <label style={{ ...styles.label, color: theme.textMuted }}>MISSION TITLE *</label>
            <input
              style={inputStyle}
              placeholder="What must be done?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={{ ...styles.label, color: theme.textMuted }}>DESCRIPTION</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              placeholder="Add context... (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Deadline */}
          <div style={styles.field}>
            <label style={{ ...styles.label, color: theme.textMuted }}>DEADLINE</label>
            <input
              type="datetime-local"
              style={{ ...inputStyle, colorScheme: 'dark' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>

          {/* Subtasks */}
          <div style={styles.field}>
            <label style={{ ...styles.label, color: theme.textMuted }}>SUBTASKS</label>
            {subtasks.map((s, i) => (
              <div key={i} style={{ ...styles.subtaskRow, borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.primary, fontSize: 12 }}>▸</span>
                <span style={{ ...styles.subtaskLabel, color: theme.text }}>{s}</span>
                <button
                  style={{ ...styles.removeBtn, color: '#ef4444' }}
                  onClick={() => removeSubtask(i)}
                >✕</button>
              </div>
            ))}
            <div style={styles.addSubtaskRow}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Add subtask..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
              />
              <button
                style={{ ...styles.addBtn, background: theme.btnGradient, color: '#fff' }}
                onClick={addSubtask}
              >+</button>
            </div>
          </div>

          {/* Images */}
          <div style={styles.field}>
            <label style={{ ...styles.label, color: theme.textMuted }}>ATTACH IMAGES</label>
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
              📎 {images.length ? `${images.length} file(s) selected` : 'Tap to attach images'}
            </button>
            {images.length > 0 && (
              <div style={styles.imagePreviewRow}>
                {images.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt="" style={styles.imageThumb} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ ...styles.footer, borderTop: `1px solid ${theme.border}` }}>
          <button style={{ ...styles.cancelBtn, color: theme.textMuted }} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.submitBtn,
              background: title.trim() ? theme.btnGradient : 'rgba(255,255,255,0.08)',
              color: title.trim() ? '#fff' : theme.textMuted,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Launching...' : `Launch Mission ${theme.emoji}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 60,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    height: 52,
    position: 'relative',
    flexShrink: 0,
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '1.5px',
    fontWeight: 700,
  },
  subtaskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
  },
  subtaskLabel: {
    flex: 1,
    fontSize: 14,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 12,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  addSubtaskRow: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  addBtn: {
    width: 38,
    height: 38,
    border: 'none',
    cursor: 'pointer',
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachBtn: {
    width: '100%',
    padding: '10px 12px',
    border: '1px dashed',
    background: 'none',
    cursor: 'pointer',
    fontSize: 13,
    textAlign: 'left',
    fontFamily: 'DM Sans, sans-serif',
  },
  imagePreviewRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  imageThumb: {
    width: 56,
    height: 56,
    objectFit: 'cover',
  },
  footer: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    flexShrink: 0,
  },
  cancelBtn: {
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
  },
  submitBtn: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    letterSpacing: '-0.2px',
    transition: 'all 0.15s',
  },
};
