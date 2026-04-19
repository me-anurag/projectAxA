# AI Subtask Scanner — Feature Spec

## What it does
User photographs a handwritten or printed task list → AI extracts each line → subtask checkboxes appear in the Create Mission modal, fully editable before saving.

## UX Flow
1. In Create Mission modal, user sees "AI Task Scanner" section (Coming Soon state)
2. When enabled: tap "Scan with Camera" → native camera opens (capture="environment")
3. Photo taken → loading state with spinner and "Reading your list..."
4. AI returns list → subtasks populate as editable chips
5. User can: edit label inline, delete item, reorder via drag, add more manually
6. Taps "Use These Tasks" → subtasks transferred to the main subtask list

## Files
- `AISubtaskScanner.jsx` — UI component (camera trigger + review screen)
- `useAISubtasks.js` — Anthropic Claude vision API call + response parser
- `FEATURE_SPEC.md` — this file

## API
- Model: `claude-sonnet-4-20250514`
- Input: base64 image
- Output: JSON array of strings
- System prompt: strip everything except task lines, return pure JSON

## To Enable
1. Remove the `disabled` prop from the Scan button in `AISubtaskScanner.jsx`
2. Import `useAISubtasks` and wire it up
3. Add the camera file input handler
4. Show review state with editable subtask list
5. Wire "Use These Tasks" to parent `onSubtasksGenerated` callback

## Edge Cases
- Messy handwriting → ask user to confirm/edit
- Non-task image → return empty array, show "No tasks found" state
- API timeout → show retry button
- No camera → fallback to file upload
