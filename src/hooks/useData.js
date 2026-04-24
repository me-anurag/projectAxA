import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadImage } from '../lib/supabase';
import { TASK_STATUS } from '../lib/theme';
import { celebrate } from '../lib/celebrate';
import { playSuccess, playMissed, playCheckbox, playNotification } from '../lib/sounds';

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE: Short polling (primary) + Realtime WebSocket (bonus)
//
// Polling intervals:
//   Tasks, challenges: every 3 seconds
//   Messages: every 2 seconds
//
// Key principle: fetchMessages only calls setMessages when the actual content
// has changed. This prevents re-renders (and scroll hijacking) on every poll
// tick when no new messages arrived.
// ─────────────────────────────────────────────────────────────────────────────


// ── Core polling hook ─────────────────────────────────────────────────────────
function usePolling(fetchFn, ms) {
  const fnRef  = useRef(fetchFn);
  const timRef = useRef(null);

  fnRef.current = fetchFn;

  const stop = useCallback(() => {
    if (timRef.current) { clearInterval(timRef.current); timRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    timRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fnRef.current?.();
    }, ms);
  }, [ms, stop]);

  useEffect(() => {
    fnRef.current?.();
    start();

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        fnRef.current?.();
        start();
      } else {
        stop();
      }
    }

    function onFocus() {
      fnRef.current?.();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [start, stop]);
}


// ─── TASKS HOOK ──────────────────────────────────────────────────────────────
export function useTasks(owner) {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('owner', owner)
      .order('created_at', { ascending: false });
    if (!error) {
      setTasks(data || []);
      setLoading(false);
    }
  }, [owner]);

  usePolling(fetchTasks, 3000);

  useEffect(() => {
    const ch = supabase
      .channel(`tasks_rt_${owner}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `owner=eq.${owner}` },
        () => fetchTasks())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'subtasks' },
        () => fetchTasks())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [owner, fetchTasks]);

  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      tasks.forEach(async (task) => {
        if (task.status === TASK_STATUS.ACTIVE && task.deadline && new Date(task.deadline) < now) {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: TASK_STATUS.MISSED } : t));
          await supabase.from('tasks').update({ status: TASK_STATUS.MISSED }).eq('id', task.id);
          playMissed();
        }
      });
    }, 60000);
    return () => clearInterval(iv);
  }, [tasks]);

  const createTask = useCallback(async ({ title, description, deadline, subtaskLabels, imageFiles }) => {
    let imageUrls = [];
    if (imageFiles?.length) {
      imageUrls = await Promise.all(imageFiles.map(f => uploadImage(f)));
    }
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId, owner, title,
      description: description || null,
      deadline: deadline || null,
      status: TASK_STATUS.ACTIVE,
      image_urls: imageUrls,
      created_at: new Date().toISOString(),
      subtasks: (subtaskLabels || []).map((label, i) => ({
        id: `temp_st_${i}`, task_id: tempId, label, done: false, position: i,
      })),
    };
    setTasks(prev => [optimistic, ...prev]);

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ owner, title, description, deadline, image_urls: imageUrls })
      .select().single();

    if (error) { setTasks(prev => prev.filter(t => t.id !== tempId)); throw error; }

    let subs = [];
    if (subtaskLabels?.length) {
      const { data: inserted } = await supabase.from('subtasks')
        .insert(subtaskLabels.map((label, i) => ({ task_id: task.id, label, done: false, position: i })))
        .select();
      subs = inserted || [];
    }
    setTasks(prev => prev.map(t => t.id === tempId ? { ...task, subtasks: subs } : t));
    return task;
  }, [owner]);

  const toggleSubtask = useCallback(async (subtaskId, done, task, userTheme) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== task.id) return t;
      const updated = t.subtasks.map(s => s.id === subtaskId ? { ...s, done } : s);
      const allDone = updated.length > 0 && updated.every(s => s.done);
      return { ...t, subtasks: updated, status: allDone ? TASK_STATUS.COMPLETED : t.status };
    }));
    playCheckbox();
    await supabase.from('subtasks').update({ done }).eq('id', subtaskId);
    const { data: fresh } = await supabase.from('subtasks').select('*').eq('task_id', task.id);
    const allDone = fresh?.length > 0 && fresh.every(s => s.done);
    if (allDone) {
      await supabase.from('tasks').update({ status: TASK_STATUS.COMPLETED }).eq('id', task.id);
      celebrate(userTheme);
      playSuccess();
    }
  }, []);

  const toggleTaskComplete = useCallback(async (task, userTheme) => {
    if (task.status === TASK_STATUS.MISSED) return;
    const newStatus = task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.ACTIVE : TASK_STATUS.COMPLETED;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    if (newStatus === TASK_STATUS.COMPLETED) { celebrate(userTheme); playSuccess(); }
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from('comments').delete().eq('task_id', taskId);
    await supabase.from('reactions').delete().eq('task_id', taskId);
    await supabase.from('subtasks').delete().eq('task_id', taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { fetchTasks(); throw error; }
  }, [fetchTasks]);

  return { tasks, loading, createTask, toggleSubtask, toggleTaskComplete, deleteTask };
}


// ─── TASK SOCIAL ──────────────────────────────────────────────────────────────
export function useTaskSocial(taskId) {
  const [reactions, setReactions] = useState([]);
  const [comments,  setComments]  = useState([]);

  const fetchAll = useCallback(async () => {
    if (!taskId) return;
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('reactions').select('*').eq('task_id', taskId),
      supabase.from('comments').select('*').eq('task_id', taskId).order('created_at'),
    ]);
    setReactions(r || []);
    setComments(c || []);
  }, [taskId]);

  usePolling(taskId ? fetchAll : () => {}, 5000);

  useEffect(() => {
    if (!taskId) return;
    const sub = supabase
      .channel(`social_rt_${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `task_id=eq.${taskId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments',  filter: `task_id=eq.${taskId}` }, () => fetchAll())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [taskId, fetchAll]);

  const toggleReaction = useCallback(async (reactor, emoji) => {
    const existing = reactions.find(r => r.reactor === reactor && r.emoji === emoji);
    if (existing) {
      setReactions(prev => prev.filter(r => r.id !== existing.id));
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      const temp = { id: `temp_r_${Date.now()}`, task_id: taskId, reactor, emoji };
      setReactions(prev => [...prev, temp]);
      const { data } = await supabase.from('reactions')
        .insert({ task_id: taskId, reactor, emoji }).select().single();
      if (data) setReactions(prev => prev.map(r => r.id === temp.id ? data : r));
    }
  }, [taskId, reactions]);

  const addComment = useCallback(async (author, body) => {
    if (!body.trim()) return;
    const temp = { id: `temp_c_${Date.now()}`, task_id: taskId, author, body: body.trim(), created_at: new Date().toISOString() };
    setComments(prev => [...prev, temp]);
    const { data } = await supabase.from('comments')
      .insert({ task_id: taskId, author, body: body.trim() }).select().single();
    if (data) setComments(prev => prev.map(c => c.id === temp.id ? data : c));
  }, [taskId]);

  return { reactions, comments, toggleReaction, addComment };
}


// ─── CHALLENGES HOOK ──────────────────────────────────────────────────────────
export function useChallenges(userId) {
  const [challenges, setChallenges] = useState([]);

  const fetchChallenges = useCallback(async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (!error) setChallenges(data || []);
  }, [userId]);

  usePolling(fetchChallenges, 3000);

  useEffect(() => {
    const sub = supabase
      .channel(`challenges_rt_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallenges())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [userId, fetchChallenges]);

  const sendChallenge = useCallback(async ({ from, to, title, description, deadline }) => {
    const temp = {
      id: `temp_ch_${Date.now()}`,
      from_user: from, to_user: to, title,
      description: description || null,
      deadline: deadline || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setChallenges(prev => [temp, ...prev]);
    const { data, error } = await supabase
      .from('challenges')
      .insert({ from_user: from, to_user: to, title, description, deadline })
      .select().single();
    if (error) { setChallenges(prev => prev.filter(c => c.id !== temp.id)); throw error; }
    setChallenges(prev => prev.map(c => c.id === temp.id ? data : c));
  }, []);

  const updateChallengeStatus = useCallback(async (id, status) => {
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    await supabase.from('challenges').update({ status }).eq('id', id);
  }, []);

  return { challenges, sendChallenge, updateChallengeStatus };
}


// ─── MESSAGES HOOK ────────────────────────────────────────────────────────────
export function useMessages() {
  const [messages, setMessages] = useState([]);
  // Track the last confirmed message ID so we only update state when content changes
  const lastConfirmedIdRef = useRef(null);
  const lastCountRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);

    if (error || !data) return;

    // ── KEY: Only update state if something actually changed ──────────────
    // Compare the last message ID and total count.
    // If identical to previous fetch → skip setMessages entirely.
    // This prevents unnecessary re-renders (and scroll hijacking) on idle polls.
    const lastId    = data.length > 0 ? data[data.length - 1].id : null;
    const count     = data.length;
    const unchanged = lastId === lastConfirmedIdRef.current && count === lastCountRef.current;

    if (unchanged) return; // nothing new — don't touch state

    lastConfirmedIdRef.current = lastId;
    lastCountRef.current       = count;

    setMessages(prev => {
      // Keep any temp (optimistic) messages that haven't been confirmed yet
      const confirmedIds = new Set(data.map(m => m.id));
      const stillPending = prev.filter(m =>
        String(m.id).startsWith('temp_') && !confirmedIds.has(m.id)
      );
      return [...data, ...stillPending];
    });
  }, []);

  usePolling(fetchMessages, 2000);

  // Realtime for instant delivery
  useEffect(() => {
    const sub = supabase
      .channel('messages_rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            // Replace matching temp message if present
            const tempIdx = prev.findIndex(m =>
              String(m.id).startsWith('temp_msg_') &&
              m.sender === payload.new.sender &&
              m.body === payload.new.body
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = { ...payload.new, _sending: false };
              return next;
            }
            return [...prev, payload.new];
          });
          // Update tracking refs so next poll doesn't think something changed
          lastConfirmedIdRef.current = payload.new.id;
          lastCountRef.current += 1;
        })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const sendMessage = useCallback(async (sender, body, imageFile) => {
    let image_url = null;
    if (imageFile) image_url = await uploadImage(imageFile, 'chat');
    const trimmedBody = body?.trim() || null;
    const tempId = `temp_msg_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, sender, body: trimmedBody, image_url,
      created_at: new Date().toISOString(), _sending: true,
    }]);
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender, body: trimmedBody, image_url })
      .select().single();
    if (error) { setMessages(prev => prev.filter(m => m.id !== tempId)); throw error; }
    setMessages(prev => prev.map(m => m.id === tempId ? { ...data, _sending: false } : m));
    // Update tracking so the next poll doesn't re-fire scroll
    lastConfirmedIdRef.current = data.id;
    lastCountRef.current += 1;
  }, []);

  return { messages, sendMessage };
}


// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
export function usePushNotifications(currentUser) {
  const lastMsgId    = useRef(null);
  const lastChallIds = useRef(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendPush = useCallback((title, body) => {
    if (Notification.permission !== 'granted') return;
    playNotification();
    const icon = '/icons/icon-192.jpg';
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(title, {
          body, icon, badge: icon,
          vibrate: [150, 80, 150],
          tag: 'axa-notif',
          renotify: true,
          data: { url: window.location.href },
        }))
        .catch(() => { try { new Notification(title, { body, icon }); } catch (_) {} });
    } else {
      try { new Notification(title, { body, icon }); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const sub = supabase
      .channel(`push_msg_${currentUser}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          if (msg.sender !== currentUser && msg.id !== lastMsgId.current) {
            lastMsgId.current = msg.id;
            const from = msg.sender === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
            sendPush(from, msg.body ? msg.body.slice(0, 80) : 'Sent an image');
          }
        })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [currentUser, sendPush]);

  useEffect(() => {
    if (!currentUser) return;
    const sub = supabase
      .channel(`push_chall_${currentUser}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges' },
        (payload) => {
          const c = payload.new;
          if (c.to_user === currentUser && !lastChallIds.current.has(c.id)) {
            lastChallIds.current.add(c.id);
            const from = c.from_user === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
            sendPush(`⚔️ Challenge from ${from}`, c.title);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [currentUser, sendPush]);
}


// ─── SAVE PUSH SUBSCRIPTION ───────────────────────────────────────────────────
// Called once when user grants notification permission.
// Saves the device's Web Push subscription to Supabase so the Edge Function
// can push to this device even when the app is closed.
export async function savePushSubscription(userId, vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;

    // Check for existing subscription first
    let sub = await reg.pushManager.getSubscription();

    // If no existing subscription, create one
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const json   = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth   = json.keys?.auth;

    if (!p256dh || !auth) return;

    // Upsert — if this endpoint already exists for this user, update it
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh, auth },
      { onConflict: 'endpoint' }
    );

    console.log('[AXA] Push subscription saved for', userId);
  } catch (err) {
    console.warn('[AXA] Push subscription failed:', err);
  }
}

// Utility: convert VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  const output  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
