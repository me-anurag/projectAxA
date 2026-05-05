import { useMemo } from 'react';
import { format, startOfDay, subDays } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Streak logic:
//   A day "counts" if at least one task was completed on that day.
//   Streak = consecutive days ending today (or yesterday if today has no
//   completed tasks yet — so opening the app in the morning doesn't break it).
//
// Daily score:
//   +10 per completed task
//   -5  per missed task
//   Minimum 0
// ─────────────────────────────────────────────────────────────────────────────

function dk(d) { return format(d, 'yyyy-MM-dd'); }

export function useStreak(tasks) {
  return useMemo(() => {
    // Build a set of dates that had at least one completed task
    const completedDates = new Set();
    tasks.forEach(t => {
      if (t.status === 'completed') {
        // Use deadline date if set, otherwise created_at (mirrors Workspace grouping)
        const d = t.deadline
          ? startOfDay(new Date(t.deadline))
          : startOfDay(new Date(t.created_at));
        completedDates.add(dk(d));
      }
    });

    const today     = dk(new Date());
    const yesterday = dk(subDays(new Date(), 1));

    // Count streak going backwards from today
    // If today has a completion, start from today
    // If today has no completion yet (morning), start from yesterday
    // so the streak doesn't reset at midnight before user had a chance
    let streak = 0;
    const startFrom = completedDates.has(today) ? today : yesterday;
    let cursor = new Date(startFrom);

    while (completedDates.has(dk(cursor))) {
      streak++;
      cursor = subDays(cursor, 1);
    }

    // Daily score for today
    const todayTasks  = tasks.filter(t => {
      const d = t.deadline
        ? dk(startOfDay(new Date(t.deadline)))
        : dk(startOfDay(new Date(t.created_at)));
      return d === today;
    });

    const score = Math.max(0,
      todayTasks.filter(t => t.status === 'completed').length * 10 -
      todayTasks.filter(t => t.status === 'missed').length * 5
    );

    // Total ever score (for the header badge)
    const totalScore = Math.max(0,
      tasks.filter(t => t.status === 'completed').length * 10 -
      tasks.filter(t => t.status === 'missed').length * 5
    );

    return { streak, score, totalScore };
  }, [tasks]);
}
