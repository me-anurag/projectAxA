import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadImage } from '../lib/supabase';
import { TASK_STATUS } from '../lib/theme';
import { celebrate } from '../lib/celebrate';
import { playSuccess, playMissed, playCheckbox, playNotification } from '../lib/sounds';

// ─── TASKS HOOK ──────────────────────────────────────────────────────────────
export function useTasks(owner) {
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('owner', owner)
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }, [owner]);

  useEffect(() => {
    fetchTasks();
    const ch = supabase
      .channel(`tasks:${owner}:v2`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `owner=eq.${owner}` }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [owner, fetchTasks]);

  // Auto-mark missed
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(async task => {
        if (task.status === TASK_STATUS.ACTIVE && task.deadline && new Date(task.deadline) < now) {
          await supabase.from('tasks').update({ status: TASK_STATUS.MISSED }).eq('id', task.id);
          playMissed();
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  const createTask = useCallback(async ({ title, description, deadline, subtaskLabels, imageFiles }) => {
    let imageUrls = [];
    if (imageFiles?.length) {
      imageUrls = await Promise.all(imageFiles.map(f => uploadImage(f)));
    }
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ owner, title, description, deadline, image_urls: imageUrls })
      .select()
      .single();
    if (error) throw error;
    if (subtaskLabels?.length) {
      await supabase.from('subtasks').insert(
        subtaskLabels.map((label, i) => ({ task_id: task.id, label, done: false, position: i }))
      );
    }
    return task;
  }, [owner]);

  const toggleSubtask = useCallback(async (subtaskId, done, task, userTheme) => {
    await supabase.from('subtasks').update({ done }).eq('id', subtaskId);
    playCheckbox();
    const { data: updatedSubtasks } = await supabase.from('subtasks').select('*').eq('task_id', task.id);
    const allDone = updatedSubtasks?.length > 0 && updatedSubtasks.every(s => s.done);
    if (allDone) {
      await supabase.from('tasks').update({ status: TASK_STATUS.COMPLETED }).eq('id', task.id);
      celebrate(userTheme);
      playSuccess();
    }
  }, []);

  const toggleTaskComplete = useCallback(async (task, userTheme) => {
    if (task.status === TASK_STATUS.MISSED) return;
    const newStatus = task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.ACTIVE : TASK_STATUS.COMPLETED;
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (newStatus === TASK_STATUS.COMPLETED) {
      celebrate(userTheme);
      playSuccess();
    }
  }, []);

  // ── FIXED deleteTask ──────────────────────────────────────────────────────
  // Manually cascade-delete child rows before deleting the task.
  // This handles cases where RLS policies block the ON DELETE CASCADE.
  const deleteTask = useCallback(async (taskId) => {
    // Step 1: optimistically remove from local state so UI feels instant
    setTasks(prev => prev.filter(t => t.id !== taskId));
    // Step 2: delete children first to avoid FK/RLS constraint errors
    await supabase.from('comments').delete().eq('task_id', taskId);
    await supabase.from('reactions').delete().eq('task_id', taskId);
    await supabase.from('subtasks').delete().eq('task_id', taskId);
    // Step 3: delete the task itself
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('[AxA] deleteTask error:', error.message);
      // Re-fetch to restore state if something went wrong
      fetchTasks();
      throw error;
    }
  }, [fetchTasks]);

  return { tasks, loading, createTask, toggleSubtask, toggleTaskComplete, deleteTask, refetch: fetchTasks };
}

// ─── REACTIONS & COMMENTS HOOK ────────────────────────────────────────────────
export function useTaskSocial(taskId) {
  const [reactions, setReactions] = useState([]);
  const [comments,  setComments]  = useState([]);

  useEffect(() => {
    if (!taskId) return;
    const fetchAll = async () => {
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase.from('reactions').select('*').eq('task_id', taskId),
        supabase.from('comments').select('*').eq('task_id', taskId).order('created_at'),
      ]);
      setReactions(r || []);
      setComments(c || []);
    };
    fetchAll();
    const sub = supabase
      .channel(`social:${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `task_id=eq.${taskId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments',  filter: `task_id=eq.${taskId}` }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [taskId]);

  const toggleReaction = useCallback(async (reactor, emoji) => {
    const existing = reactions.find(r => r.reactor === reactor && r.emoji === emoji);
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('reactions').insert({ task_id: taskId, reactor, emoji });
    }
  }, [taskId, reactions]);

  const addComment = useCallback(async (author, body) => {
    if (!body.trim()) return;
    await supabase.from('comments').insert({ task_id: taskId, author, body: body.trim() });
  }, [taskId]);

  return { reactions, comments, toggleReaction, addComment };
}

// ─── CHALLENGES HOOK ──────────────────────────────────────────────────────────
export function useChallenges(userId) {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .order('created_at', { ascending: false });
      setChallenges(data || []);
    };
    fetch();
    const sub = supabase
      .channel(`challenges:${userId}:v2`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, fetch)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [userId]);

  const sendChallenge = useCallback(async ({ from, to, title, description, deadline }) => {
    await supabase.from('challenges').insert({ from_user: from, to_user: to, title, description, deadline });
  }, []);

  const updateChallengeStatus = useCallback(async (id, status) => {
    await supabase.from('challenges').update({ status }).eq('id', id);
  }, []);

  return { challenges, sendChallenge, updateChallengeStatus };
}

// ─── MESSAGES HOOK ────────────────────────────────────────────────────────────
export function useMessages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages(data || []);
    };
    fetch();
    const sub = supabase
      .channel('messages:all:v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const sendMessage = useCallback(async (sender, body, imageFile) => {
    let image_url = null;
    if (imageFile) image_url = await uploadImage(imageFile, 'chat');
    await supabase.from('messages').insert({ sender, body: body?.trim() || null, image_url });
  }, []);

  return { messages, sendMessage };
}

// ─── PUSH NOTIFICATIONS HOOK ──────────────────────────────────────────────────
// Listens for new messages and challenges sent TO the current user,
// fires a browser push notification (requires user permission).
export function usePushNotifications(currentUser) {
  const lastMsgId    = useRef(null);
  const lastChallIds = useRef(new Set());

  // Request permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendPush = useCallback((title, body, icon = '/icons/icon-192.jpg') => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    playNotification();
    try {
      // Use service worker notification if available (works when app is in background)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, { body, icon, badge: icon, vibrate: [200, 100, 200] });
        });
      } else {
        new Notification(title, { body, icon });
      }
    } catch (e) { /* silent */ }
  }, []);

  // Watch new messages
  useEffect(() => {
    if (!currentUser) return;
    const otherUser = currentUser === 'anurag' ? 'anshuman' : 'anurag';

    const sub = supabase
      .channel(`push:messages:${currentUser}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new;
        // Only notify if it's from the other user
        if (msg.sender !== currentUser && msg.id !== lastMsgId.current) {
          lastMsgId.current = msg.id;
          const senderName = msg.sender === 'anurag' ? 'Anurag⚡' : 'Anshuman🔥';
          const preview = msg.body ? msg.body.slice(0, 60) : '📎 Image';
          sendPush(`${senderName} — New Message`, preview);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [currentUser, sendPush]);

  // Watch new challenges sent TO current user
  useEffect(() => {
    if (!currentUser) return;
    const sub = supabase
      .channel(`push:challenges:${currentUser}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, payload => {
        const c = payload.new;
        if (c.to_user === currentUser && !lastChallIds.current.has(c.id)) {
          lastChallIds.current.add(c.id);
          const fromName = c.from_user === 'anurag' ? 'Anurag⚡' : 'Anshuman🔥';
          sendPush(`⚔️ New Challenge from ${fromName}`, c.title);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [currentUser, sendPush]);
}
