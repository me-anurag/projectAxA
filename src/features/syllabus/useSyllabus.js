import { useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Syllabus data is stored in localStorage per user.
// Key: `axa_syllabus_${userId}`
//
// Data shape:
// {
//   headings: [
//     {
//       id: string,
//       title: string,
//       subtopics: [
//         { id: string, title: string, done: boolean }
//       ]
//     }
//   ]
// }
//
// Mission coverage is stored separately:
// Key: `axa_coverage_${userId}`
// {
//   [headingId]: [
//     { taskTitle: string, description: string, subtasks: string[], date: string }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

const SYLLABUS_KEY = (userId) => `axa_syllabus_${userId}`;
const COVERAGE_KEY = (userId) => `axa_coverage_${userId}`;

function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadSyllabus(userId) {
  try {
    const raw = localStorage.getItem(SYLLABUS_KEY(userId));
    if (!raw) return { headings: [] };
    return JSON.parse(raw);
  } catch {
    return { headings: [] };
  }
}

function saveSyllabus(userId, data) {
  localStorage.setItem(SYLLABUS_KEY(userId), JSON.stringify(data));
}

function loadCoverage(userId) {
  try {
    const raw = localStorage.getItem(COVERAGE_KEY(userId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCoverage(userId, data) {
  localStorage.setItem(COVERAGE_KEY(userId), JSON.stringify(data));
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useSyllabus(userId) {
  const [syllabus, setSyllabusState] = useState(() => loadSyllabus(userId));
  const [coverage, setCoverageState] = useState(() => loadCoverage(userId));

  // Persist on every change
  useEffect(() => {
    saveSyllabus(userId, syllabus);
  }, [userId, syllabus]);

  useEffect(() => {
    saveCoverage(userId, coverage);
  }, [userId, coverage]);

  // ── Headings ──────────────────────────────────────────────────────────────
  const addHeading = useCallback((title) => {
    if (!title.trim()) return;
    setSyllabusState(prev => ({
      ...prev,
      headings: [...prev.headings, { id: genId(), title: title.trim(), subtopics: [] }],
    }));
  }, []);

  const editHeading = useCallback((headingId, title) => {
    setSyllabusState(prev => ({
      ...prev,
      headings: prev.headings.map(h => h.id === headingId ? { ...h, title } : h),
    }));
  }, []);

  const deleteHeading = useCallback((headingId) => {
    setSyllabusState(prev => ({
      ...prev,
      headings: prev.headings.filter(h => h.id !== headingId),
    }));
  }, []);

  // ── Subtopics ─────────────────────────────────────────────────────────────
  const addSubtopic = useCallback((headingId, title) => {
    if (!title.trim()) return;
    setSyllabusState(prev => ({
      ...prev,
      headings: prev.headings.map(h =>
        h.id === headingId
          ? { ...h, subtopics: [...h.subtopics, { id: genId(), title: title.trim(), done: false }] }
          : h
      ),
    }));
  }, []);

  const editSubtopic = useCallback((headingId, subtopicId, title) => {
    setSyllabusState(prev => ({
      ...prev,
      headings: prev.headings.map(h =>
        h.id === headingId
          ? { ...h, subtopics: h.subtopics.map(s => s.id === subtopicId ? { ...s, title } : s) }
          : h
      ),
    }));
  }, []);

  const toggleSubtopic = useCallback((headingId, subtopicId) => {
    setSyllabusState(prev => ({
      ...prev,
      headings: prev.headings.map(h =>
        h.id === headingId
          ? { ...h, subtopics: h.subtopics.map(s => s.id === subtopicId ? { ...s, done: !s.done } : s) }
          : h
      ),
    }));
  }, []);

  const deleteSubtopic = useCallback((headingId, subtopicId) => {
    setSyllabusState(prev => ({
      ...prev,
      headings: prev.headings.map(h =>
        h.id === headingId
          ? { ...h, subtopics: h.subtopics.filter(s => s.id !== subtopicId) }
          : h
      ),
    }));
  }, []);

  // ── Mission coverage ───────────────────────────────────────────────────────
  // Called when a task is created with a syllabus heading selected
  const recordMission = useCallback((headingId, { taskTitle, description, subtasks, date }) => {
    setCoverageState(prev => {
      const existing = prev[headingId] || [];
      return {
        ...prev,
        [headingId]: [...existing, { taskTitle, description: description || '', subtasks: subtasks || [], date: date || new Date().toISOString() }],
      };
    });
  }, []);

  const deleteCoverageEntry = useCallback((headingId, entryIdx) => {
    setCoverageState(prev => ({
      ...prev,
      [headingId]: (prev[headingId] || []).filter((_, i) => i !== entryIdx),
    }));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  // List of just heading titles for dropdowns
  const headingOptions = syllabus.headings.map(h => ({ id: h.id, title: h.title }));

  return {
    syllabus,
    coverage,
    headingOptions,
    addHeading,
    editHeading,
    deleteHeading,
    addSubtopic,
    editSubtopic,
    toggleSubtopic,
    deleteSubtopic,
    recordMission,
    deleteCoverageEntry,
  };
}
