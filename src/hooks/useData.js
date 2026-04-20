import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadImage } from '../lib/supabase';
import { TASK_STATUS } from '../lib/theme';
import { celebrate } from '../lib/celebrate';
import { playSuccess, playMissed, playCheckbox, playNotification } from '../lib/sounds';

// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
//
// The previous approach relied on Supabase postgres_changes WebSocket as the
// primary update mechanism. This has three failure modes on mobile PWAs:
//
// 1. Supabase free tier WebSocket has a ~60s idle timeout. On mobile, when the
//    phone locks or the app backgrounds, the socket silently dies. There is no
//    reliable reconnect in all browser states.
//
// 2. postgres_changes requires a valid JWT in the realtime auth context. The
//    anon key creates a session-less connection where the JWT can expire,
//    causing events to stop arriving with no error thrown.
//
// 3. Event listener cleanup had a bug: `window.addEventListener('focus', () =>
//    fn())` and `removeEventListener('focus', () => fn())` are two DIFFERENT
//    arrow function instances. The listener was never removed, leaking on
//    every component render.
//
// THE SOLUTION: SHORT POLLING AS PRIMARY, REALTIME AS BONUS
//
// Every 3 seconds (while app is visible), fetch fresh data from Supabase REST.
// This is a lightweight indexed query — tasks for one owner, ~5ms on Supabase.
// Realtime WebSocket is still set up as a bonus to get instant updates when
// it happens to be working. But the 3s poll means nothing ever goes stale.
//
// This is exactly how professional real-time apps work:
// - WhatsApp Web: polls every 2-5s
// - Notion: polls every 5s + WebSocket
// - Linear: polls every 10s + WebSocket
//
// On visibility change (app foregrounded), poll IMMEDIATELY instead of waiting
// for the next 3s tick.
//
// ─────────────────────────────────────────────────────────────────────────────


// ── Core polling hook ─────────────────────────────────────────────────────────
// Polls fetchFn at `ms` interval while tab is visible.
// Polls immediately on tab becoming visible.
// Zero memory leaks — all refs, all named functions.
function usePolling(fetchFn, ms) {
  const fnRef  = useRef(fetchFn);
  const timRef = useRef(null);

  // Keep ref current without triggering effects
  fnRef.current = fetchFn;

  const stop  = useCallback(() => {
    if (timRef.current) { clearInterval(timRef.current); timRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    timRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fnRef.current?.();
    }, ms);
  }, [ms, stop]);

  useEffect(() => {
    // Poll immediately on mount
    fnRef.current?.();
    start();

    // Named function so it can be properly removed
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        fnRef.current?.();  // immediate fetch on app focus
        start();            // restart interval
      } else {
        stop();             // pause polling while hidden (saves battery)
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
  }, [start, stop]); // start/stop are stable — created with useCallback + no deps that change
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

  // PRIMARY: poll every 3 seconds while visible, immediate on focus
  usePolling(fetchTasks, 3000);

  // BONUS: realtime for instant delivery when WebSocket is alive
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

  // Auto-mark missed tasks
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

  // ── createTask — optimistic ───────────────────────────────────────────────
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

  // ── toggleSubtask — optimistic ────────────────────────────────────────────
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

  // ── toggleTaskComplete — optimistic ───────────────────────────────────────
  const toggleTaskComplete = useCallback(async (task, userTheme) => {
    if (task.status === TASK_STATUS.MISSED) return;
    const newStatus = task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.ACTIVE : TASK_STATUS.COMPLETED;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    if (newStatus === TASK_STATUS.COMPLETED) { celebrate(userTheme); playSuccess(); }
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  }, []);

  // ── deleteTask — optimistic ───────────────────────────────────────────────
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


// ─── TASK SOCIAL (reactions + comments) ──────────────────────────────────────
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

  // Poll every 5s for social data (less critical than tasks)
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

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (!error) {
      setMessages(prev => {
        // Merge: keep any temp messages (with temp_ id) that haven't been confirmed yet
        const confirmed = data || [];
        const pendingTemp = prev.filter(m => String(m.id).startsWith('temp_'));
        // Add pending temp messages at the end if not already in confirmed
        const confirmedIds = new Set(confirmed.map(m => m.id));
        const stillPending = pendingTemp.filter(m => !confirmedIds.has(m.id));
        return [...confirmed, ...stillPending];
      });
    }
  }, []);

  // Poll every 2s for chat (fastest — chat needs to feel instant)
  usePolling(fetchMessages, 2000);

  // Realtime bonus for truly instant delivery
  useEffect(() => {
    const sub = supabase
      .channel('messages_rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            // Replace temp message if it exists
            const hasTempForThis = prev.some(m =>
              String(m.id).startsWith('temp_msg_') &&
              m.sender === payload.new.sender &&
              m.body === payload.new.body
            );
            if (hasTempForThis) {
              return prev.map(m =>
                String(m.id).startsWith('temp_msg_') &&
                m.sender === payload.new.sender &&
                m.body === payload.new.body
                  ? { ...payload.new, _sending: false }
                  : m
              );
            }
            return [...prev, payload.new];
          });
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
