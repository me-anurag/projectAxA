import React, { useEffect, useRef, useState, useCallback } from 'react';
import { USERS } from '../lib/theme';
import { useMessages } from '../hooks/useData';
import { Icon } from './TaskCard';
import { format, isToday, isYesterday } from 'date-fns';
import { playClick } from '../lib/sounds';

export default function ChatScreen({ currentUser, onClose }) {
  const { messages, sendMessage } = useMessages();
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const listRef   = useRef();   // the scrollable container
  const bottomRef = useRef();   // anchor at the very bottom
  const fileRef   = useRef();
  const inputRef  = useRef();
  const theme     = USERS[currentUser];

  // Track whether user is near the bottom of the list
  // "near bottom" = within 120px of the bottom edge
  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Track the message count from the last render so we can detect NEW messages
  const prevMsgCountRef = useRef(0);
  // Track whether WE just sent a message (force scroll down regardless of position)
  const justSentRef = useRef(false);

  // Smart scroll — only scroll when appropriate
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;

    if (newCount === 0) return;

    // const shouldScroll =
    //   justSentRef.current ||   // we just sent — always scroll
    //   newCount > prevCount ||  // new message arrived — scroll only if near bottom
    //     (newCount > prevCount && isNearBottom());

    // For incoming new messages from other user, only scroll if near bottom
    const reallyNewMessages = newCount > prevCount;
    const weJustSent = justSentRef.current;

    if (weJustSent || (reallyNewMessages && isNearBottom())) {
      bottomRef.current?.scrollIntoView({ behavior: weJustSent ? 'auto' : 'smooth' });
      justSentRef.current = false;
    }
  }, [messages, isNearBottom]);

  // Track first-load scroll (fires when messages first arrive, not on empty mount)
  const hasScrolledInitially = useRef(false);
  useEffect(() => {
    if (!hasScrolledInitially.current && messages.length > 0) {
      hasScrolledInitially.current = true;
      // Use setTimeout to ensure DOM has rendered the messages
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        inputRef.current?.focus();
      }, 50);
    }
  }, [messages]);

  // Also focus input on open regardless
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;

    const body    = trimmed;
    const imgFile = imageFile;
    setText('');
    setImageFile(null);
    justSentRef.current = true; // mark that WE sent so scroll fires immediately

    setSending(true);
    try {
      await sendMessage(currentUser, body, imgFile);
    } catch (e) {
      setText(body);
      justSentRef.current = false;
      console.error('[AxA] sendMessage error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    const d   = new Date(msg.created_at);
    const key = format(d, 'yyyy-MM-dd');
    if (key !== lastDate) {
      grouped.push({ type: 'sep', date: d, key: `sep-${key}` });
      lastDate = key;
    }
    grouped.push({ type: 'msg', msg, key: msg.id });
  });

  return (
    <div style={{ ...S.root, background: '#0a0a0a', animation: 'slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>

      {/* Header — unchanged */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.avatarPair}>
            <div style={{ ...S.avatarHalf, background: 'linear-gradient(135deg, #0a0f1e 0%, #1a6fff 100%)' }}>
              <Icon name="zap" size={14} color="#fff" />
            </div>
            <div style={{ ...S.avatarHalf, background: 'linear-gradient(135deg, #ff4d1a 0%, #1a0a05 100%)' }}>
              <Icon name="fire" size={14} color="#fff" />
            </div>
          </div>
          <div>
            <div style={S.chatTitle}>Anurag & Anshuman</div>
            <div style={S.chatSub}>Private · End-to-end</div>
          </div>
        </div>
        <button style={S.closeBtn} onClick={() => { playClick(); onClose(); }}>
          <Icon name="chevronDown" size={22} color="rgba(255,255,255,0.5)" strokeWidth={2} />
        </button>
      </div>

      {/* Message list */}
      <div ref={listRef} style={S.list}>
        {grouped.length === 0 && (
          <div style={S.empty}>
            <Icon name="chat" size={32} color="rgba(255,255,255,0.15)" />
            <p style={S.emptyText}>No messages yet.</p>
            <p style={S.emptySub}>Say something.</p>
          </div>
        )}

        {grouped.map(item => {
          if (item.type === 'sep') {
            const label = isToday(item.date)
              ? 'Today'
              : isYesterday(item.date)
              ? 'Yesterday'
              : format(item.date, 'MMM d, yyyy');
            return (
              <div key={item.key} style={S.dateSep}>
                <div style={S.sepLine} />
                <span style={S.sepLabel}>{label}</span>
                <div style={S.sepLine} />
              </div>
            );
          }

          const { msg }   = item;
          const isMe      = msg.sender === currentUser;
          const sender    = USERS[msg.sender];
          const isSending = msg._sending;

          return (
            <div key={item.key} style={{ ...S.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <div style={{ ...S.senderIcon, background: sender.btnGradient }}>
                  <Icon name={sender.id === 'anurag' ? 'zap' : 'fire'} size={11} color="#fff" />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%', gap: 2 }}>
                {/* Name label with emoji — only for received messages */}
                {!isMe && (
                  <div style={{ ...S.senderLabel, color: sender.primary }}>
                    {sender.id === 'anurag' ? '⚡' : '🔥'} {sender.displayName}
                  </div>
                )}

              <div style={{
                ...S.bubble,
                maxWidth: '100%',
                background:              isMe ? theme.btnGradient : sender.surface,
                border:                  isMe ? 'none' : `1px solid ${sender.border}`,
                borderBottomRightRadius: isMe ? 2 : 12,
                borderBottomLeftRadius:  isMe ? 12 : 2,
                opacity:    isSending ? 0.7 : 1,
                transition: 'opacity 0.2s',
                boxShadow: isMe ? 'none' : `0 2px 8px ${sender.glow}22`,
              }}>
                {msg.image_url && (
                  <img src={msg.image_url} alt="" style={S.bubbleImg} onClick={() => window.open(msg.image_url)} />
                )}
                {msg.body && (
                  <p style={{ ...S.bubbleText, color: isMe ? '#fff' : sender.text }}>{msg.body}</p>
                )}
                <div style={S.bubbleMeta}>
                  <span style={{ ...S.bubbleTime, color: isMe ? 'rgba(255,255,255,0.55)' : sender.textMuted }}>
                    {isSending ? 'Sending...' : format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {isMe && !isSending && (
                    <Icon name="check" size={10} color="rgba(255,255,255,0.55)" strokeWidth={2.5} />
                  )}
                </div>
              </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* Input bar — unchanged */}
      <div style={{ ...S.inputBar, background: theme.surface, borderTop: `1px solid ${theme.border}` }}>
        {imageFile && (
          <div style={S.imgPreview}>
            <img src={URL.createObjectURL(imageFile)} alt="" style={S.imgThumb} />
            <button style={S.imgRemove} onClick={() => setImageFile(null)}>
              <Icon name="x" size={9} color="#fff" strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div style={S.inputRow}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => setImageFile(e.target.files[0] || null)}
          />
          <button style={{ ...S.attachBtn, color: theme.textMuted }} onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={20} color={theme.textMuted} strokeWidth={1.5} />
          </button>

          <textarea
            ref={inputRef}
            style={{ ...S.textInput, background: theme.surfaceHigh, color: theme.text, border: `1px solid ${theme.border}` }}
            placeholder="Message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <button
            style={{
              ...S.sendBtn,
              background: (text.trim() || imageFile) ? theme.btnGradient : 'rgba(255,255,255,0.06)',
              cursor: (text.trim() || imageFile) ? 'pointer' : 'default',
            }}
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageFile)}
          >
            <Icon name="send" size={15} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  root:       { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 20 },
  header:     { height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  avatarPair: { display: 'flex', width: 38, height: 38, overflow: 'hidden' },
  avatarHalf: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chatTitle:  { fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.3px' },
  chatSub:    { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono, monospace', marginTop: 1 },
  closeBtn:   { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', display: 'flex' },
  list:       { flex: 1, overflowY: 'auto', padding: '12px 12px 6px', display: 'flex', flexDirection: 'column', gap: 4 },
  empty:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, margin: 'auto' },
  emptyText:  { color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 },
  emptySub:   { color: 'rgba(255,255,255,0.18)', fontFamily: 'Space Mono, monospace', fontSize: 11 },
  dateSep:    { display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' },
  sepLine:    { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' },
  sepLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' },
  msgRow:     { display: 'flex', alignItems: 'flex-end', gap: 6 },
  senderIcon: { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 },
  bubble:     { maxWidth: '72%', padding: '8px 11px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  bubbleImg:  { maxWidth: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' },
  bubbleText: { fontSize: 14, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif', wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
  bubbleMeta: { display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  bubbleTime: { fontSize: 9, fontFamily: 'Space Mono, monospace' },
  inputBar:   { flexShrink: 0, padding: '8px 10px', paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' },
  imgPreview: { position: 'relative', display: 'inline-flex', marginBottom: 8 },
  imgThumb:   { width: 52, height: 52, objectFit: 'cover', borderRadius: 6 },
  imgRemove:  { position: 'absolute', top: -5, right: -5, background: '#ef4444', border: 'none', borderRadius: '50%', width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  inputRow:   { display: 'flex', gap: 8, alignItems: 'flex-end' },
  attachBtn:  { background: 'none', border: 'none', cursor: 'pointer', padding: '6px 2px', display: 'flex', flexShrink: 0 },
  textInput:  { flex: 1, padding: '9px 11px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', resize: 'none', maxHeight: 100, overflowY: 'auto', lineHeight: 1.4 },
  sendBtn:    { width: 40, height: 40, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' },
  senderLabel:{ fontSize: 10, fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.3px', paddingLeft: 2, marginBottom: 1 },
};
