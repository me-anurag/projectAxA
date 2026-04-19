// ─────────────────────────────────────────────────────────────────────────────
// useAISubtasks.js
// Hook: sends an image to Claude vision API, returns parsed subtask list
//
// USAGE (when enabled):
//   const { scan, subtasks, loading, error, reset } = useAISubtasks();
//   const result = await scan(imageFile); // imageFile = File object
//   // result = [{ label: 'Buy groceries', done: false }, ...]
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 800;

const SYSTEM_PROMPT = `You are a task extraction assistant. 
The user will send you an image of a handwritten or typed task list.
Extract every line item as a separate task.
Return ONLY valid JSON — an array of strings, one per task.
Example: ["Buy milk", "Call dentist", "Finish report"]
Do NOT include any explanation, markdown, or extra text. JSON only.`;

export function useAISubtasks() {
  const [subtasks, setSubtasks] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const scan = useCallback(async (imageFile) => {
    setLoading(true);
    setError(null);

    try {
      // Convert image to base64
      const base64 = await fileToBase64(imageFile);
      const mediaType = imageFile.type || 'image/jpeg';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64 },
                },
                {
                  type: 'text',
                  text: 'Extract all tasks from this image as a JSON array of strings.',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const raw  = data.content?.[0]?.text || '[]';

      // Strip any accidental markdown fences
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (!Array.isArray(parsed)) throw new Error('Unexpected response format');

      const result = parsed
        .filter(item => typeof item === 'string' && item.trim())
        .map(label => ({ label: label.trim(), done: false }));

      setSubtasks(result);
      setLoading(false);
      return result;

    } catch (err) {
      console.error('[AxA] AI subtask scan failed:', err);
      setError(err.message || 'Scan failed. Please try again.');
      setLoading(false);
      return [];
    }
  }, []);

  const reset = useCallback(() => {
    setSubtasks([]);
    setError(null);
  }, []);

  return { scan, subtasks, loading, error, reset };
}

// Utility: File → base64 string
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
