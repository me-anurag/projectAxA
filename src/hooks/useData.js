import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadImage } from '../lib/supabase';
import { TASK_STATUS } from '../lib/theme';
import { celebrate } from '../lib/celebrate';
import { playSuccess, playMilestone, playMissed, playCheckbox } from '../lib/sounds';

// ─── TASKS HOOK ──────────────────────────────────────────────────────────────
export function useTasks(owner) {
  const [tasks, setTasks] = useState([]);
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

    // Real-time subscriptions
    const tasksSub = supabase
      .channel(`tasks:${owner}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `owner=eq.${owner}` },
        () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' },
        () => fetchTasks())
      .subscribe();

    return () => supabase.removeChannel(tasksSub);
  }, [owner, fetchTasks]);

  // Auto-mark missed tasks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(async (task) => {
        if (task.status === TASK_STATUS.ACTIVE && task.deadline && new Date(task.deadline) < now) {
          await supabase.from('tasks').update({ status: TASK_STATUS.MISSED }).eq('id', task.id);
          playMissed();
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  const createTask = useCallback(async ({ title, description, deadline, subtaskLabels, imageFiles, userTheme }) => {
    // Upload images first
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

    // Refresh and check completion
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

  const deleteTask = useCallback(async (taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId);
  }, []);

  return { tasks, loading, createTask, toggleSubtask, toggleTaskComplete, deleteTask, refetch: fetchTasks };
}

// ─── REACTIONS & COMMENTS HOOK ───────────────────────────────────────────────
export function useTaskSocial(taskId) {
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, fetchAll)
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

// ─── CHALLENGES HOOK ─────────────────────────────────────────────────────────
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
      .channel(`challenges:${userId}`)
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

// ─── MESSAGES HOOK ───────────────────────────────────────────────────────────
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
      .channel('messages:all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => setMessages(prev => [...prev, payload.new]))
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
