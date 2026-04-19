import React from 'react';
import { USERS } from '../lib/theme';
import { Icon } from './TaskCard';
import { format, isPast } from 'date-fns';
import { playClick } from '../lib/sounds';

const STATUS_CONFIG = {
  pending:   { color: '#f97316', label: 'PENDING'   },
  accepted:  { color: '#22c55e', label: 'ACTIVE'    },
  completed: { color: '#22c55e', label: 'COMPLETED' },
  missed:    { color: '#ef4444', label: 'MISSED'    },
  declined:  { color: '#6b7280', label: 'DECLINED'  },
};

export default function ChallengeCard({ challenge, viewerUser, ownerUser, onAction, compact }) {
  const fromTheme = USERS[challenge.from_user];
  const toTheme   = USERS[challenge.to_user];
  const isReceiver = viewerUser === challenge.to_user;
  const isPending  = challenge.status === 'pending';
  const isAccepted = challenge.status === 'accepted';
  const statusCfg  = STATUS_CONFIG[challenge.status] || STATUS_CONFIG.pending;
  const isHistory  = ['completed', 'missed', 'declined'].includes(challenge.status);

  const dlPast = challenge.deadline && isPast(new Date(challenge.deadline));

  return (
    <div style={{
      ...styles.card,
      background: isHistory ? 'rgba(255,255,255,0.03)' : `${fromTheme.primary}0c`,
      border: `1px solid ${isHistory ? 'rgba(255,255,255,0.07)' : `${fromTheme.primary}28`}`,
      padding: compact ? '9px 11px' : '13px',
      opacity: ['declined', 'missed'].includes(challenge.status) ? 0.65 : 1,
    }}>

      {/* Top: icon + meta + status pill */}
      <div style={styles.top}>
        {/* Sword icon in themed tint */}
        <div style={{ ...styles.iconWrap, background: `${fromTheme.primary}18` }}>
          <Icon name="sword" size={14} color={fromTheme.primary} strokeWidth={1.8} />
        </div>

        <div style={styles.info}>
          {/* From → To line */}
          <div style={styles.fromLine}>
            <span style={{ color: fromTheme.primary, fontWeight: 700, fontSize: 11, fontFamily: 'Syne, sans-serif' }}>
              {fromTheme.displayName}
            </span>
            <Icon name="chevronDown" size={9} color="rgba(255,255,255,0.25)" strokeWidth={2} />
            <span style={{ color: toTheme.primary, fontWeight: 700, fontSize: 11, fontFamily: 'Syne, sans-serif' }}>
              {toTheme.displayName}
            </span>
          </div>

          {/* Title */}
          <div style={styles.title}>{challenge.title}</div>

          {/* Description — only when not compact */}
          {!compact && challenge.description && (
            <div style={styles.desc}>{challenge.description}</div>
          )}

          {/* Deadline */}
          {challenge.deadline && (
            <div style={{ ...styles.deadline, color: dlPast && !isHistory ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
              <Icon name="clock" size={9} color={dlPast && !isHistory ? '#f97316' : 'rgba(255,255,255,0.3)'} strokeWidth={2} />
              {format(new Date(challenge.deadline), 'MMM d, HH:mm')}
            </div>
          )}
        </div>

        {/* Status pill */}
        <div style={{ ...styles.statusPill, color: statusCfg.color, borderColor: `${statusCfg.color}30`, background: `${statusCfg.color}10` }}>
          {statusCfg.label}
        </div>
      </div>

      {/* Actions */}
      {isPending && isReceiver && (
        <div style={styles.actions}>
          <button
            style={{ ...styles.actionBtn, color: '#22c55e', background: '#22c55e14', border: '1px solid #22c55e30' }}
            onClick={() => { playClick(); onAction(challenge.id, 'accepted'); }}
          >
            <Icon name="check" size={13} color="#22c55e" strokeWidth={2.5} />
            Accept
          </button>
          <button
            style={{ ...styles.actionBtn, color: '#ef4444', background: '#ef444414', border: '1px solid #ef444430' }}
            onClick={() => { playClick(); onAction(challenge.id, 'declined'); }}
          >
            <Icon name="x" size={13} color="#ef4444" strokeWidth={2.5} />
            Decline
          </button>
        </div>
      )}

      {isAccepted && isReceiver && (
        <div style={styles.actions}>
          <button
            style={{ ...styles.actionBtn, color: '#22c55e', background: '#22c55e14', border: '1px solid #22c55e30' }}
            onClick={() => { playClick(); onAction(challenge.id, 'completed'); }}
          >
            <Icon name="trophy" size={13} color="#22c55e" strokeWidth={1.8} />
            Mark Complete
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
    gap: 10,
    animation: 'fadeIn 0.2s ease',
    transition: 'opacity 0.2s',
  },
  top: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  fromLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Syne, sans-serif',
    letterSpacing: '-0.2px',
    lineHeight: 1.3,
  },
  desc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'DM Sans, sans-serif',
    lineHeight: 1.5,
  },
  deadline: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontFamily: 'Space Mono, monospace',
    marginTop: 1,
  },
  statusPill: {
    fontSize: 9,
    fontFamily: 'Space Mono, monospace',
    fontWeight: 700,
    letterSpacing: '0.8px',
    padding: '3px 7px',
    border: '1px solid',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    gap: 8,
    paddingLeft: 38,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Syne, sans-serif',
    border: 'none',
    transition: 'all 0.15s',
  },
};
