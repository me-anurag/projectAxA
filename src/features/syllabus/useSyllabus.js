import { useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE DESIGN (corrected):
//
// coverage shape: {
//   [headingId | 'custom']: [
//     { taskTitle, description, subtasks[], date }
//   ]
// }
//
// 'custom' is a special bucket for missions with no syllabus heading.
// This means EVERY mission gets tracked in coverage.
//
// SyllabusScreen Coverage tab shows:
//   - All syllabus headings (even those with 0 missions)
//   - A "Custom / Free-form" section at the bottom for missions without a heading
//
// Coverage saves synchronously inside recordMission (not in useEffect)
// to survive modal unmount before the effect fires.
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTOM_COVERAGE_KEY = 'custom';

const SYLLABUS_KEY = (u) => `axa_syllabus_${u}`;
const COVERAGE_KEY = (u) => `axa_coverage_${u}`;

function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadSyllabus(userId) {
  try {
    const raw = localStorage.getItem(SYLLABUS_KEY(userId));
    return raw ? JSON.parse(raw) : { headings: [] };
  } catch { return { headings: [] }; }
}

function saveSyllabus(userId, data) {
  localStorage.setItem(SYLLABUS_KEY(userId), JSON.stringify(data));
}

function loadCoverage(userId) {
  try {
    const raw = localStorage.getItem(COVERAGE_KEY(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCoverage(userId, data) {
  localStorage.setItem(COVERAGE_KEY(userId), JSON.stringify(data));
}

export function useSyllabus(userId) {
  const [syllabus,  setSyllabusState] = useState(() => loadSyllabus(userId));
  const [coverage,  setCoverageState] = useState(() => loadCoverage(userId));

  // Persist syllabus on change
  useEffect(() => { saveSyllabus(userId, syllabus); }, [userId, syllabus]);

  // Re-read coverage from localStorage when screen opens
  // (CreateTaskModal writes directly to localStorage, not to this hook's state)
  useEffect(() => {
    setCoverageState(loadCoverage(userId));
  }, [userId]);

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

  // ── recordMission — SYNCHRONOUS localStorage write ────────────────────────
  // Called from CreateTaskModal which unmounts immediately after.
  // headingId: a syllabus heading id, OR null/undefined for custom missions.
  // Custom missions go under the 'custom' key.
  const recordMission = useCallback((headingId, { taskTitle, description, subtasks, date }) => {
    const key = headingId || CUSTOM_COVERAGE_KEY;
    // Read fresh from localStorage (not stale React state)
    const current = loadCoverage(userId);
    const entry = {
      taskTitle,
      description: description || '',
      subtasks: subtasks || [],
      date: date || new Date().toISOString(),
    };
    const updated = {
      ...current,
      [key]: [...(current[key] || []), entry],
    };
    // Synchronous — guaranteed before component unmount
    saveCoverage(userId, updated);
    // Update React state so SyllabusScreen refreshes if open
    setCoverageState(updated);
  }, [userId]);

  const deleteCoverageEntry = useCallback((headingId, entryIdx) => {
    setCoverageState(prev => {
      const updated = {
        ...prev,
        [headingId]: (prev[headingId] || []).filter((_, i) => i !== entryIdx),
      };
      saveCoverage(userId, updated);
      return updated;
    });
  }, [userId]);

  const headingOptions = syllabus.headings.map(h => ({ id: h.id, title: h.title }));

  return {
    syllabus, coverage, headingOptions,
    addHeading, editHeading, deleteHeading,
    addSubtopic, editSubtopic, toggleSubtopic, deleteSubtopic,
    recordMission, deleteCoverageEntry,
  };
}
