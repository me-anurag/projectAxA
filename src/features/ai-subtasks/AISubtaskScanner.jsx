// ─────────────────────────────────────────────────────────────────────────────
// FEATURE: AI Subtask Scanner
// Path: src/features/ai-subtasks/
//
// HOW IT WORKS (when implemented):
//   1. User taps the camera/AI button in CreateTaskModal
//   2. They photograph a handwritten list OR upload a text image
//   3. Image is sent to Claude claude-sonnet-4-20250514 vision API
//   4. Claude extracts line items and returns structured JSON
//   5. Subtask checkboxes are auto-populated, user can edit/reorder/delete
//
// FILES IN THIS FOLDER:
//   AISubtaskScanner.jsx  — the UI component (camera + review screen)
//   useAISubtasks.js      — hook: calls Anthropic API, parses response
//   FEATURE_SPEC.md       — full design spec
//
// STATUS: Coming Soon — UI placeholder wired into CreateTaskModal
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { Icon } from '../../components/TaskCard';

// ── Coming Soon placeholder shown inside CreateTaskModal ───────────────────
export default function AISubtaskScanner({ theme, onSubtasksGenerated }) {
  const [state, setState] = useState('idle'); // idle | scanning | done
  const fileRef = useRef();

  // When fully implemented, this calls useAISubtasks hook
  const handleScan = () => {
    setState('scanning');
    // TODO: implement — see useAISubtasks.js
    setTimeout(() => setState('idle'), 1500);
  };

  return (
    <div style={{ ...styles.container, border: `1px dashed ${theme.border}` }}>
      {/* Coming Soon badge */}
      <div style={{ ...styles.badge, background: theme.primary }}>Coming Soon</div>

      <div style={styles.iconRow}>
        <div style={{ ...styles.iconCircle, background: `${theme.primary}18` }}>
          <Icon name="camera" size={22} color={theme.primary} strokeWidth={1.5} />
        </div>
        <div style={{ ...styles.iconCircle, background: `${theme.primary}18` }}>
          <Icon name="sparkles" size={20} color={theme.primary} strokeWidth={1.5} />
        </div>
      </div>

      <div style={{ ...styles.title, color: theme.text }}>AI Task Scanner</div>
      <div style={{ ...styles.desc, color: theme.textMuted }}>
        Photograph a handwritten task list and AI will auto-create all the subtask checkboxes for you.
      </div>

      <button
        style={{ ...styles.btn, background: `${theme.primary}22`, color: theme.primary, border: `1px solid ${theme.primary}40`, cursor: 'not-allowed' }}
        disabled
      >
        <Icon name="camera" size={14} color={theme.primary} />
        Scan with Camera
      </button>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={() => {}} />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 9,
    color: '#fff',
    padding: '2px 7px',
    fontFamily: 'Space Mono, monospace',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  iconRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Syne, sans-serif',
    letterSpacing: '-0.2px',
  },
  desc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'DM Sans, sans-serif',
    maxWidth: 260,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Syne, sans-serif',
    marginTop: 4,
  },
};
