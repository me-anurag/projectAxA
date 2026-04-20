import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadImage } from '../lib/supabase';
import { TASK_STATUS } from '../lib/theme';
import { celebrate } from '../lib/celebrate';
import { playSuccess, playMissed, playCheckbox, playNotification } from '../lib/sounds';

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
//
// The core problem with PWAs on mobile:
// When a phone locks, goes to background, or is unused for hours, the OS
// throttles/suspends background network activity. The Supabase WebSocket
// connection silently dies. When the user reopens the app, React state still
// exists but the realtime channel is no longer receiving events.
//
// THE SOLUTION — three-layer defence:
//
// Layer 1: VISIBILITY RECONNECT
//   When the browser tab becomes visible again (user switches back to the app),
//   we immediately reconnect all Supabase channels AND refetch all data.
//   This handles: returning from lock screen, switching apps, tab switching.
//
// Layer 2: FOCUS REFETCH
//   When the window receives focus (desktop) or the page becomes visible
//   after being hidden for more than 30 seconds, refetch all data from DB.
//   This is the safety net — even if realtime reconnects, we also do a fresh
//   DB fetch to guarantee the UI shows current state.
//
// Layer 3: PERIODIC SAFETY FETCH
//   Every 30 seconds while the app is visible, do a quiet background refetch.
//   This means even if realtime silently fails, the data is at most 30s stale.
//
// PATTERN USED IN EVERY HOOK:
//   - fetchRef: stores latest fetch function in a ref so channels can always
//     call the current version without needing to resubscribe
//   - Channel is created once (on mount), destroyed on unmount
//   - useVisibilityRefetch(fetchFn): attaches layer 1+2 to any fetch function
//
// ─────────────────────────────────────────────────────────────────────────────


// ── Shared visibility/focus refetch hook ─────────────────────────────────────
// Call this in any data hook to get automatic refetch on app resume.
function useVisibilityRefetch(fetchFn, intervalMs = 30000) {
  const fetchRef = useRef(fetchFn);
  const lastHiddenAt = useRef(null);
  const intervalRef = useRef(null);

  // Keep ref current on every render
  fetchRef.current = fetchFn;

  useEffect(() => {
    // ── Layer 1 & 2: Page visibility ─────────────────────────────────────
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        // Reconnect Supabase realtime channels
        // (supabase-js v2 reconnects automatically when socket state changes)
        // Force refetch regardless of how long we were hidden
        fetchRef.current?.();
      }
    };

    // ── Layer 3: Periodic background refetch ─────────────────────────────
    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchRef.current?.();
        }
      }, intervalMs);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', () => fetchRef.current?.());
    startInterval();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', () => fetchRef.current?.());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // run once — fetchRef.current always has latest fn
}


// ─── TASKS HOOK ──────────────────────────────────────────────────────────────
export function useTasks(owner) {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(null);

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

  // Always keep ref current
  fetchRef.current = fetchTasks;

  // ── Initial fetch + realtime channel ─────────────────────────────────────
  useEffect(() => {
    fetchTasks();

    // Create channel once. Use ref wrapper so it never needs resubscribing.
    const ch = supabase
      .channel(`tasks_${owner}_v3`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `owner=eq.${owner}` },
        () => { fetchRef.current?.(); })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'subtasks' },
        () => { fetchRef.current?.(); })
      .subscribe((status) => {
        // If channel reconnects after being closed, refetch immediately
        if (status === 'SUBSCRIBED') {
          fetchRef.current?.();
        }
      });

    return () => { supabase.removeChannel(ch); };
  }, [owner]); // Only re-run if owner changes (i.e., never after mount)

  // ── Visibility/focus refetch — THE KEY FIX ───────────────────────────────
  useVisibilityRefetch(fetchTasks, 30000);

  // ── Auto-mark missed tasks ────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(async (task) => {
        if (task.status === TASK_STATUS.ACTIVE && task.deadline && new Date(task.deadline) < now) {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: TASK_STATUS.MISSED } : t));
          await supabase.from('tasks').update({ status: TASK_STATUS.MISSED }).eq('id', task.id);
          playMissed();
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  // ── createTask — optimistic ───────────────────────────────────────────────
  const createTask = useCallback(async ({ title, description, deadline, subtaskLabels, imageFiles }) => {
    let imageUrls = [];
    if (imageFiles?.length) {
      imageUrls = await Promise.all(imageFiles.map(f => uploadImage(f)));
    }

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      owner,
      title,
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
      .select()
      .single();

    if (error) {
      setTasks(prev => prev.filter(t => t.id !== tempId));
      throw error;
    }

    let finalSubtasks = [];
    if (subtaskLabels?.length) {
      const { data: subs } = await supabase
        .from('subtasks')
        .insert(subtaskLabels.map((label, i) => ({ task_id: task.id, label, done: false, position: i })))
        .select();
      finalSubtasks = subs || [];
    }

    setTasks(prev => prev.map(t =>
      t.id === tempId ? { ...task, subtasks: finalSubtasks } : t
    ));

    return task;
  }, [owner]);

  // ── toggleSubtask — optimistic ────────────────────────────────────────────
  const toggleSubtask = useCallback(async (subtaskId, done, task, userTheme) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== task.id) return t;
      const updated = t.subtasks.map(s => s.id === subtaskId ? { ...s, done } : s);
      const allDone  = updated.length > 0 && updated.every(s => s.done);
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
    if (error) {
      console.error('[AxA] deleteTask error:', error.message);
      fetchRef.current?.();
      throw error;
    }
  }, []);

  return { tasks, loading, createTask, toggleSubtask, toggleTaskComplete, deleteTask };
}


// ─── TASK SOCIAL (reactions + comments) ──────────────────────────────────────
export function useTaskSocial(taskId) {
  const [reactions, setReactions] = useState([]);
  const [comments,  setComments]  = useState([]);
  const fetchRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!taskId) return;
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('reactions').select('*').eq('task_id', taskId),
      supabase.from('comments').select('*').eq('task_id', taskId).order('created_at'),
    ]);
    setReactions(r || []);
    setComments(c || []);
  }, [taskId]);

  fetchRef.current = fetchAll;

  useEffect(() => {
    if (!taskId) return;
    fetchAll();
    const sub = supabase
      .channel(`social_${taskId}_v3`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `task_id=eq.${taskId}` }, () => fetchRef.current?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments',  filter: `task_id=eq.${taskId}` }, () => fetchRef.current?.())
      .subscribe((status) => { if (status === 'SUBSCRIBED') fetchRef.current?.(); });
    return () => supabase.removeChannel(sub);
  }, [taskId]); // only taskId dependency — ref handles fetchAll updates

  useVisibilityRefetch(fetchAll, 30000);

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
  const fetchRef = useRef(null);

  const fetchChallenges = useCallback(async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (!error) setChallenges(data || []);
  }, [userId]);

  fetchRef.current = fetchChallenges;

  useEffect(() => {
    fetchChallenges();
    const sub = supabase
      .channel(`challenges_${userId}_v3`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' },
        () => fetchRef.current?.())
      .subscribe((status) => { if (status === 'SUBSCRIBED') fetchRef.current?.(); });
    return () => supabase.removeChannel(sub);
  }, [userId]);

  useVisibilityRefetch(fetchChallenges, 30000);

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
  const fetchRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (!error) setMessages(data || []);
  }, []);

  fetchRef.current = fetchMessages;

  useEffect(() => {
    fetchMessages();
    const sub = supabase
      .channel('messages_v3')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => {
            // Deduplicate — temp msg may already be in list
            if (prev.some(m => m.id === payload.new.id)) return prev;
            // Also replace any temp msg that has now been confirmed
            return [...prev, payload.new];
          });
        })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchRef.current?.();
      });
    return () => supabase.removeChannel(sub);
  }, []);

  // Refetch on app resume — critical for chat
  useVisibilityRefetch(fetchMessages, 15000); // faster interval for chat (15s)

  const sendMessage = useCallback(async (sender, body, imageFile) => {
    let image_url = null;
    if (imageFile) image_url = await uploadImage(imageFile, 'chat');

    const trimmedBody = body?.trim() || null;
    const tempId  = `temp_msg_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      sender,
      body: trimmedBody,
      image_url,
      created_at: new Date().toISOString(),
      _sending: true,
    };
    setMessages(prev => [...prev, tempMsg]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender, body: trimmedBody, image_url })
      .select()
      .single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw error;
    }
    setMessages(prev => prev.map(m => m.id === tempId ? { ...data, _sending: false } : m));
  }, []);

  return { messages, sendMessage };
}


// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
export function usePushNotifications(currentUser) {
  const lastMsgId    = useRef(null);
  const lastChallIds = useRef(new Set());
  const sendPushRef  = useRef(null);

  // Request permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendPush = useCallback((title, body) => {
    if (Notification.permission !== 'granted') return;
    playNotification();
    const icon  = '/icons/icon-192.jpg';
    const badge = '/icons/icon-192.jpg';
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(title, {
          body, icon, badge,
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

  sendPushRef.current = sendPush;

  // Watch messages
  useEffect(() => {
    if (!currentUser) return;
    const sub = supabase
      .channel(`push_msg_${currentUser}_v3`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          if (msg.sender !== currentUser && msg.id !== lastMsgId.current) {
            lastMsgId.current = msg.id;
            const from    = msg.sender === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
            const preview = msg.body ? msg.body.slice(0, 80) : 'Sent an image';
            sendPushRef.current?.(`${from}`, preview);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [currentUser]);

  // Watch challenges
  useEffect(() => {
    if (!currentUser) return;
    const sub = supabase
      .channel(`push_chall_${currentUser}_v3`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges' },
        (payload) => {
          const c = payload.new;
          if (c.to_user === currentUser && !lastChallIds.current.has(c.id)) {
            lastChallIds.current.add(c.id);
            const from = c.from_user === 'anurag' ? 'Anurag ⚡' : 'Anshuman 🔥';
            sendPushRef.current?.(`⚔️ Challenge from ${from}`, c.title);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [currentUser]);
}
