import { supabase } from './supabase';
import { minutesToTime, parseTimeToMinutes } from './utils';
import type { ScheduleAction } from '../types';
import type { ScheduleBlock } from '../types/database';

/**
 * Finds the best insertion time for a new block in the current schedule.
 * Looks for gaps between existing blocks, preferring the preferred_time if given.
 */
function findInsertionTime(
  blocks: ScheduleBlock[],
  duration: number,
  preferredTime?: string
): { start: string; end: string } {
  const active = blocks
    .filter((b) => b.status !== 'rescheduled' && b.status !== 'skipped')
    .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  // If user specified a time, use it directly
  if (preferredTime) {
    const startMin = parseTimeToMinutes(preferredTime);
    return { start: preferredTime, end: minutesToTime(startMin + duration) };
  }

  // Find the first gap large enough for the block
  // Start searching from the first pending block onward
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < active.length - 1; i++) {
    const gapStart = parseTimeToMinutes(active[i].end_time);
    const gapEnd = parseTimeToMinutes(active[i + 1].start_time);
    const gapSize = gapEnd - gapStart;

    // Gap must be big enough and in the future (or after current time)
    if (gapSize >= duration && gapStart >= currentMin) {
      return { start: minutesToTime(gapStart), end: minutesToTime(gapStart + duration) };
    }
  }

  // No gap found — append after last block
  const lastBlock = active[active.length - 1];
  const appendStart = lastBlock
    ? parseTimeToMinutes(lastBlock.end_time)
    : Math.max(currentMin, 480); // default 8:00 AM
  return { start: minutesToTime(appendStart), end: minutesToTime(appendStart + duration) };
}

/**
 * Executes AI-generated actions (from real Claude responses, not demo).
 * Returns the number of actions successfully executed.
 */
export async function executeAiActions(
  actions: ScheduleAction[],
  blocks: ScheduleBlock[],
  profileId: string,
  date: string
): Promise<number> {
  let executed = 0;

  for (const action of actions) {
    const data = action.data as Record<string, unknown> | undefined;
    if (!data) continue;

    if (action.type === 'create_block' || action.type === 'create_task') {
      const title = data.title as string;
      if (!title) continue;

      const duration = (data.duration as number) || 30;
      const preferredTime = data.preferred_time as string | undefined;
      const { start, end } = findInsertionTime(blocks, duration, preferredTime);

      const { error } = await supabase.from('schedule_blocks').insert({
        profile_id: profileId,
        title,
        date: (data.due_date as string) || date,
        start_time: start,
        end_time: end,
        duration_minutes: duration,
        status: 'pending',
        is_fixed: (data.is_fixed as boolean) || false,
        is_protected: (data.is_protected as boolean) || false,
        is_transition: false,
        is_travel: false,
        is_prep: false,
        ai_reason: data.notes
          ? `AI-created: ${data.notes}`
          : `AI-created via Nudgley`,
      });

      if (error) {
        console.error('Failed to create AI block:', error);
      } else {
        executed++;
      }
    }

    if (action.type === 'delete_block' && action.blockId) {
      const { error } = await supabase
        .from('schedule_blocks')
        .update({ status: 'rescheduled' })
        .eq('id', action.blockId)
        .eq('profile_id', profileId);
      if (error) console.error('Failed to delete block:', error);
      else executed++;
    }

    if (action.type === 'complete_task' && action.blockId) {
      const { error } = await supabase
        .from('schedule_blocks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', action.blockId)
        .eq('profile_id', profileId);
      if (error) console.error('Failed to complete block:', error);
      else executed++;
    }
  }

  return executed;
}
