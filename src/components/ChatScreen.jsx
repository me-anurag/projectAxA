import React, { useEffect, useRef, useState } from 'react';
import { USERS } from '../lib/theme';
import { useMessages } from '../hooks/useData';
import { format, isToday, isYesterday } from 'date-fns';
import { playClick } from '../lib/sounds';
import { uploadImage } from '../lib/supabase';

export default function ChatScreen({ currentUser, onClose }) {
  const { messages, sendMessage } = useMessages();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const bottomRef = useRef();
  const fileRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !imageFile) return;
    setSending(true);
    try {
      await sendMessage(currentUser, text, imageFile);
      setText('');
      setImageFile(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach(msg => {
    const msgDate = new Date(msg.created_at);
    const dateKey = format(msgDate, 'yyyy-MM-dd');
    if (dateKey !== lastDate) {
      groupedMessages.push({ type: 'dateSep', date: msgDate, key: `sep-${dateKey}` });
      lastDate = dateKey;
    }
    groupedMessages.push({ type: 'msg', msg, key: msg.id });
  });

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.dualAvatar}>
            <span style={{ ...styles.avatarHalf, background: 'linear-gradient(135deg, #0a0f1e, #1a6fff)' }}>⚡</span>
            <span style={{ ...styles.avatarHalf, background: 'linear-gradient(135deg, #ff4d1a, #1a0a05)' }}>🔥</span>
          </div>
          <div>
            <div style={styles.chatTitle}>Anurag & Anshuman</div>
            <div style={styles.chatSub}>Private Chat</div>
          </div>
        </div>
        <button style={styles.closeBtn} onClick={() => { playClick(); onClose(); }}>
          ✕
        </button>
      </div>

      {/* Coming soon banner */}
      <div style={styles.comingSoonBanner}>
        <span style={styles.csEmoji}>🚀</span>
        <div>
          <div style={styles.csTitle}>Chat — Coming Soon</div>
          <div style={styles.csSub}>Real-time messaging is live. More features dropping soon.</div>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messageList}>
        {groupedMessages.length === 0 && (
          <div style={styles.emptyChat}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p style={styles.emptyChatText}>Start the conversation.</p>
            <p style={styles.emptyChatSub}>Only you two can see this.</p>
          </div>
        )}
        {groupedMessages.map(item => {
          if (item.type === 'dateSep') {
            return (
              <div key={item.key} style={styles.dateSep}>
                <div style={styles.dateSepLine} />
                <span style={styles.dateSepText}>
                  {isToday(item.date) ? 'Today' : isYesterday(item.date) ? 'Yesterday' : format(item.date, 'MMM d, yyyy')}
                </span>
                <div style={styles.dateSepLine} />
              </div>
            );
          }
          const { msg } = item;
          const isMe = msg.sender === currentUser;
          const theme = USERS[msg.sender];
          return (
            <div key={item.key} style={{ ...styles.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <span style={styles.senderEmoji}>{theme.emoji}</span>}
              <div style={{
                ...styles.bubble,
                background: isMe ? theme.btnGradient : theme.surface,
                border: isMe ? 'none' : `1px solid ${theme.border}`,
                borderBottomRightRadius: isMe ? 0 : 8,
                borderBottomLeftRadius: isMe ? 8 : 0,
                maxWidth: '72%',
              }}>
                {msg.image_url && (
                  <img src={msg.image_url} alt="" style={styles.msgImage} onClick={() => window.open(msg.image_url)} />
                )}
                {msg.body && (
                  <p style={{ ...styles.msgText, color: isMe ? '#fff' : theme.text }}>{msg.body}</p>
                )}
                <span style={{ ...styles.msgTime, color: isMe ? 'rgba(255,255,255,0.5)' : theme.textMuted }}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ ...styles.inputArea, background: USERS[currentUser].surface, borderTop: `1px solid ${USERS[currentUser].border}` }}>
        {imageFile && (
          <div style={styles.imgPreview}>
            <img src={URL.createObjectURL(imageFile)} alt="" style={styles.imgThumb} />
            <button style={styles.removeImg} onClick={() => setImageFile(null)}>✕</button>
          </div>
        )}
        <div style={styles.inputRow}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
          <button style={{ ...styles.attachBtn, color: USERS[currentUser].textMuted }} onClick={() => fileRef.current?.click()}>
            📎
          </button>
          <textarea
            ref={inputRef}
            style={{ ...styles.input, background: USERS[currentUser].surfaceHigh, color: USERS[currentUser].text, border: `1px solid ${USERS[currentUser].border}` }}
            placeholder="Message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            style={{
              ...styles.sendBtn,
              background: (text.trim() || imageFile) ? USERS[currentUser].btnGradient : 'rgba(255,255,255,0.06)',
              color: (text.trim() || imageFile) ? '#fff' : USERS[currentUser].textMuted,
            }}
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageFile)}
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    background: '#0c0c0c',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
    zIndex: 20,
  },
  header: {
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#111',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dualAvatar: {
    display: 'flex',
    width: 38,
    height: 38,
    overflow: 'hidden',
  },
  avatarHalf: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'Syne, sans-serif',
    letterSpacing: '-0.3px',
  },
  chatSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.5px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  comingSoonBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    background: 'linear-gradient(90deg, rgba(26,111,255,0.12), rgba(255,77,26,0.12))',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  csEmoji: { fontSize: 22 },
  csTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Syne, sans-serif',
  },
  csSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Space Mono, monospace',
    marginTop: 2,
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px 4px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    margin: 'auto',
  },
  emptyChatText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
  },
  emptyChatSub: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontFamily: 'Space Mono, monospace',
    marginTop: 6,
  },
  dateSep: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
  },
  dateSepLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.06)',
  },
  dateSepText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
  },
  senderEmoji: {
    fontSize: 18,
    flexShrink: 0,
    marginBottom: 4,
  },
  bubble: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    borderRadius: 8,
  },
  msgImage: {
    maxWidth: '100%',
    maxHeight: 200,
    objectFit: 'cover',
    cursor: 'pointer',
    borderRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: 'DM Sans, sans-serif',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  msgTime: {
    fontSize: 9,
    fontFamily: 'Space Mono, monospace',
    alignSelf: 'flex-end',
  },
  inputArea: {
    padding: '8px 12px',
    flexShrink: 0,
    paddingBottom: 'max(8px, var(--safe-bottom))',
  },
  imgPreview: {
    position: 'relative',
    display: 'inline-flex',
    marginBottom: 8,
  },
  imgThumb: {
    width: 56,
    height: 56,
    objectFit: 'cover',
    borderRadius: 4,
  },
  removeImg: {
    position: 'absolute',
    top: -6,
    right: -6,
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 18,
    height: 18,
    fontSize: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  attachBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    padding: '6px 4px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '9px 12px',
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
    resize: 'none',
    borderRadius: 0,
    lineHeight: 1.4,
    maxHeight: 100,
    overflowY: 'auto',
  },
  sendBtn: {
    width: 40,
    height: 40,
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
    borderRadius: 0,
  },
};
