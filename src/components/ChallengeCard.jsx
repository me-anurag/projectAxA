import React from 'react';
import { USERS } from '../lib/theme';
import { format } from 'date-fns';
import { playClick } from '../lib/sounds';

export default function ChallengeCard({ challenge, viewerUser, ownerUser, onAction, compact }) {
  const fromTheme = USERS[challenge.from_user];
  const toTheme = USERS[challenge.to_user];
  const isReceiver = viewerUser === challenge.to_user;
  const isPending = challenge.status === 'pending';

  const statusColor = {
    pending: '#f97316',
    accepted: '#22c55e',
    completed: '#22c55e',
    missed: '#ef4444',
    declined: '#6b7280',
  }[challenge.status];

  return (
    <div style={{
      ...styles.card,
      background: `${fromTheme.primary}10`,
      border: `1px solid ${fromTheme.primary}30`,
      padding: compact ? '8px 10px' : '12px',
    }}>
      <div style={styles.top}>
        <span style={styles.icon}>⚔️</span>
        <div style={styles.info}>
          <div style={styles.from}>
            <span style={{ color: fromTheme.primary }}>{fromTheme.emoji} {fromTheme.displayName}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px', fontSize: 11 }}>challenges</span>
            <span style={{ color: toTheme.primary }}>{toTheme.emoji} {toTheme.displayName}</span>
          </div>
          <div style={styles.title}>{challenge.title}</div>
          {!compact && challenge.description && (
            <div style={styles.desc}>{challenge.description}</div>
          )}
          {challenge.deadline && (
            <div style={styles.deadline}>⏰ {format(new Date(challenge.deadline), 'MMM d, HH:mm')}</div>
          )}
        </div>
        <span style={{ ...styles.status, color: statusColor, fontSize: 10 }}>
          {challenge.status.toUpperCase()}
        </span>
      </div>

      {isPending && isReceiver && (
        <div style={styles.actions}>
          <button
            style={{ ...styles.btn, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}
            onClick={() => { playClick(); onAction(challenge.id, 'accepted'); }}
          >
            Accept
          </button>
          <button
            style={{ ...styles.btn, background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
            onClick={() => { playClick(); onAction(challenge.id, 'declined'); }}
          >
            Decline
          </button>
        </div>
      )}

      {challenge.status === 'accepted' && viewerUser === challenge.to_user && (
        <div style={styles.actions}>
          <button
            style={{ ...styles.btn, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}
            onClick={() => { playClick(); onAction(challenge.id, 'completed'); }}
          >
            ✓ Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    animation: 'fadeIn 0.2s ease',
  },
  top: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 18,
    flexShrink: 0,
    marginTop: 1,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  from: {
    fontSize: 11,
    fontFamily: 'Space Mono, monospace',
    marginBottom: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Syne, sans-serif',
  },
  desc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  deadline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Space Mono, monospace',
    marginTop: 3,
  },
  status: {
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '1px',
    flexShrink: 0,
    marginTop: 2,
  },
  actions: {
    display: 'flex',
    gap: 8,
    paddingLeft: 26,
  },
  btn: {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Syne, sans-serif',
  },
};
