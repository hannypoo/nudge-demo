import { supabase } from './supabase';
import { minutesToTime, parseTimeToMinutes } from './utils';
import type { ScheduleAction } from '../types';
import type { ScheduleBlock } from '../types/database';

// Helper: detect block purpose from ai_reason + flags since DB lacks typed columns
function isHardTask(b: ScheduleBlock): boolean {
  const reason = (b.ai_reason || '').toLowerCase();
  return reason.includes('hard task') || reason.includes('peak morning energy');
}

function isMealOrSelfCare(b: ScheduleBlock): boolean {
  const reason = (b.ai_reason || '').toLowerCase();
  const title = b.title.toLowerCase();
  return reason.includes('breakfast') || reason.includes('lunch') ||
    reason.includes('dinner') || reason.includes('morning routine') ||
    reason.includes('nightly routine') || title.includes('breakfast') ||
    title.includes('lunch') || title.includes('dinner') ||
    title.includes('wind down') || title.includes('wake up');
}

function isBuffer(b: ScheduleBlock): boolean {
  return b.is_transition || b.title === 'Breather';
}

/**
 * Find insertion point after a fixed block by skipping travel, transitions, buffers, and meals.
 * Stops at the first regular task — that's where we can insert BEFORE it.
 * E.g., after dentist: drive home (travel) → breather → lunch (meal) → breather → STOP → insert here.
 */
function findInsertAfterFixed(blocks: ScheduleBlock[], afterMin: number): number {
  const sorted = [...blocks]
    .filter((b) => b.status !== 'rescheduled' && b.status !== 'skipped')
    .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  let insertAt = afterMin;

  for (const block of sorted) {
    const start = parseTimeToMinutes(block.start_time);
    const end = parseTimeToMinutes(block.end_time);

    // Only consider blocks that start at or after our current position
    if (start < afterMin) continue;

    // Skip travel, transitions, buffers, meals, and fixed blocks — they're part of the cluster
    if (block.is_travel || block.is_transition || isBuffer(block) || block.is_fixed || isMealOrSelfCare(block)) {
      insertAt = Math.max(insertAt, end);
    } else {
      // Hit a regular task — insert before it (use its start time as our insert point)
      insertAt = start;
      break;
    }
  }

  return insertAt;
}

/**
 * Executes demo actions that modify the schedule visually.
 * Each action type maps to a real Supabase mutation so the timeline updates.
 */
export async function executeDemoActions(
  actions: ScheduleAction[],
  blocks: ScheduleBlock[],
  profileId: string,
  date: string
): Promise<void> {
  for (const action of actions) {
    const data = action.data as Record<string, unknown> | undefined;
    if (!data) continue;

    // Energy crash: swap hard tasks with easy alternatives, shorten blocks, add break, compact
    if (action.type === 'energy_crash') {
      // Easy replacements for hard tasks
      const easySwaps: Record<string, { title: string; duration: number; reason: string }> = {
        'work on research paper': { title: 'Review research notes — light reading', duration: 30, reason: 'Easy swap — low energy mode' },
        'study for exam — chapter 7 & 8': { title: 'Skim chapter summaries + make flashcards', duration: 25, reason: 'Easy swap — low energy mode' },
        'finish group project slides': { title: 'Outline slide structure + gather images', duration: 25, reason: 'Easy swap — low energy mode' },
      };

      const sorted = [...blocks]
        .filter((b) => b.status !== 'rescheduled' && b.status !== 'skipped' && b.status !== 'completed')
        .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

      // Find the evening anchor — drive to campus or first fixed evening block
      // Everything from dinner onward (17:00+) is the evening prep zone — don't touch it
      const eveningCutoff = 17 * 60; // 5:00 PM

      // Find the first pending non-fixed block as our compaction start point
      const firstPending = sorted.find((b) => !b.is_fixed && !b.is_travel && parseTimeToMinutes(b.start_time) < eveningCutoff);
      let cursor = firstPending ? parseTimeToMinutes(firstPending.start_time) : 720;

      // Insert an energy break first
      const breakDuration = 15;
      const breakStart = cursor;
      const breakEnd = cursor + breakDuration;
      await supabase.from('schedule_blocks').insert({
        profile_id: profileId, date,
        title: 'Energy Break — rest up',
        start_time: minutesToTime(breakStart), end_time: minutesToTime(breakEnd),
        duration_minutes: breakDuration, status: 'pending',
        is_fixed: false, is_protected: false, is_transition: false,
        is_travel: false, is_prep: false,
        ai_reason: 'Self-care — added by Nudge',
      });
      cursor = breakEnd;

      // Add a breather after the break
      await supabase.from('schedule_blocks').insert({
        profile_id: profileId, date,
        title: 'Breather', start_time: minutesToTime(cursor), end_time: minutesToTime(cursor + 5),
        duration_minutes: 5, status: 'pending',
        is_fixed: false, is_protected: false, is_transition: true,
        is_travel: false, is_prep: false,
        ai_reason: 'Breathing room between tasks',
      });
      cursor += 5;

      // Build a list of fixed block time ranges so we can skip over them
      const fixedRanges = sorted
        .filter((b) => b.is_fixed || b.is_travel)
        .map((b) => ({ start: parseTimeToMinutes(b.start_time), end: parseTimeToMinutes(b.end_time) }));

      // If cursor would land inside a fixed block, jump past it
      function skipPastFixed(c: number): number {
        for (const range of fixedRanges) {
          if (c >= range.start && c < range.end) {
            return range.end;
          }
        }
        return c;
      }

      // Process each pending block: swap hard ones, shorten others, compact all
      for (const block of sorted) {
        // Skip fixed blocks, travel, and completed — leave them where they are
        if (block.is_fixed || block.is_travel || block.status === 'completed') continue;

        // Don't touch anything in the evening prep zone (dinner, shower, get ready, drive, class)
        if (parseTimeToMinutes(block.start_time) >= eveningCutoff) continue;

        // Make sure cursor doesn't overlap with any fixed block
        cursor = skipPastFixed(cursor);

        // If compaction would push into the evening zone, stop
        if (cursor >= eveningCutoff) continue;

        const titleKey = block.title.toLowerCase();
        const swap = Object.entries(easySwaps).find(([key]) => titleKey.includes(key));

        if (swap || isHardTask(block)) {
          if (swap) {
            // Replace hard task with easy alternative at current cursor
            const [, replacement] = swap;
            await supabase.from('schedule_blocks')
              .update({
                title: replacement.title,
                start_time: minutesToTime(cursor),
                end_time: minutesToTime(cursor + replacement.duration),
                duration_minutes: replacement.duration,
                ai_reason: replacement.reason,
              })
              .eq('id', block.id);
            cursor += replacement.duration;
          } else {
            // Hard task without a swap — reschedule it
            await supabase.from('schedule_blocks')
              .update({ status: 'rescheduled' })
              .eq('id', block.id);
            continue; // don't advance cursor
          }
        } else if (isBuffer(block)) {
          // Keep breathers but compact them to cursor
          await supabase.from('schedule_blocks')
            .update({
              start_time: minutesToTime(cursor),
              end_time: minutesToTime(cursor + block.duration_minutes),
            })
            .eq('id', block.id);
          cursor += block.duration_minutes;
        } else if (isMealOrSelfCare(block)) {
          // Keep meals/self-care at cursor, same duration
          await supabase.from('schedule_blocks')
            .update({
              start_time: minutesToTime(cursor),
              end_time: minutesToTime(cursor + block.duration_minutes),
            })
            .eq('id', block.id);
          cursor += block.duration_minutes;
        } else {
          // Regular task — shorten by 40% and compact
          const newDuration = Math.max(15, Math.round(block.duration_minutes * 0.6));
          await supabase.from('schedule_blocks')
            .update({
              duration_minutes: newDuration,
              start_time: minutesToTime(cursor),
              end_time: minutesToTime(cursor + newDuration),
            })
            .eq('id', block.id);
          cursor += newDuration;
        }
      }

      continue;
    }

    // Time crunch: reorganize evening around class — clear non-essential, add streamlined prep
    if (action.type === 'time_crunch') {
      // Find the fixed class block
      const classBlock = blocks.find((b) => b.is_fixed && b.title.toLowerCase().includes('class'));
      const driveToClass = blocks.find((b) => b.is_travel && b.title.toLowerCase().includes('drive to campus'));

      // The latest we need to leave = drive to campus start time
      const leaveBy = driveToClass
        ? parseTimeToMinutes(driveToClass.start_time)
        : classBlock
          ? parseTimeToMinutes(classBlock.start_time) - 20
          : 19 * 60 + 30; // 19:30 fallback

      // Clear all non-essential, non-fixed, non-travel blocks in the evening (after 17:00)
      const eveningBlocks = blocks.filter((b) => {
        const start = parseTimeToMinutes(b.start_time);
        return start >= 17 * 60 && !b.is_fixed && !b.is_travel && b.status === 'pending';
      });

      for (const block of eveningBlocks) {
        await supabase.from('schedule_blocks')
          .delete()
          .eq('id', block.id);
      }

      // Build a streamlined prep sequence working backwards from leave time
      // Realistic durations for neurodivergent users — showering and getting ready take real time
      const prepBlocks = [
        { title: 'Shower — just hair and body, skip the extras', duration: 20, reason: 'Self-care — trimmed from usual 30 min' },
        { title: 'Get ready — outfit, face, essentials', duration: 20, reason: 'Prep — trimmed from usual 30 min, keep it simple' },
        { title: 'Grab a snack for the road', duration: 5, reason: 'Food — no time to cook, protein bar or banana' },
        { title: 'Run through presentation notes', duration: 15, reason: 'Quick rehearsal — one pass while it\'s fresh' },
      ];

      // Place them ending right at leave time
      const totalPrep = prepBlocks.reduce((sum, b) => sum + b.duration, 0);
      let cursor = leaveBy - totalPrep;

      for (const prep of prepBlocks) {
        await supabase.from('schedule_blocks').insert({
          profile_id: profileId, date,
          title: prep.title,
          start_time: minutesToTime(cursor),
          end_time: minutesToTime(cursor + prep.duration),
          duration_minutes: prep.duration,
          status: 'pending',
          is_fixed: false, is_protected: false, is_transition: false,
          is_travel: false, is_prep: true,
          ai_reason: prep.reason,
        });
        cursor += prep.duration;
      }

      continue;
    }

    // Clear non-essential pending blocks (generic fallback)
    if (data.clearNonEssential) {
      const nonEssential = blocks.filter(
        (b) =>
          b.status === 'pending' &&
          !b.is_fixed &&
          !b.is_protected &&
          !isMealOrSelfCare(b)
      );
      for (const block of nonEssential) {
        const { error } = await supabase
          .from('schedule_blocks')
          .update({ status: 'rescheduled' })
          .eq('id', block.id);
        if (error) console.error('Failed to clear block:', error);
      }
      continue;
    }

    // Grocery insert: dentist → drive to store → shop → drive home → (push everything else down)
    if (action.type === 'grocery_insert') {
      const store = data.store as string;
      const shopDuration = data.shopDuration as number;
      const driveTo = data.driveTo as number;
      const driveHome = data.driveHome as number;

      // Find the dentist appointment end time
      const dentist = blocks.find((b) => b.is_fixed && b.title.toLowerCase().includes('dentist'));
      if (!dentist) continue;
      const dentistEnd = parseTimeToMinutes(dentist.end_time);

      // Remove the original "Drive home" that's right after dentist
      const origDriveHome = blocks.find(
        (b) => b.is_travel && parseTimeToMinutes(b.start_time) >= dentistEnd && b.title.toLowerCase().includes('drive home')
      );
      if (origDriveHome) {
        await supabase.from('schedule_blocks').delete().eq('id', origDriveHome.id);
      }

      // Calculate times: dentist ends → drive to store → shop → drive home
      const driveToStart = dentistEnd;
      const driveToEnd = driveToStart + driveTo;
      const shopStart = driveToEnd;
      const shopEnd = shopStart + shopDuration;
      const driveHomeStart = shopEnd;
      const driveHomeEnd = driveHomeStart + driveHome;

      // How much time we added vs the original drive home
      const origDriveHomeDuration = origDriveHome ? origDriveHome.duration_minutes : 20;
      const shiftAmount = (driveTo + shopDuration + driveHome) - origDriveHomeDuration;

      // Insert the 3 new blocks
      const newBlocks = [
        {
          profile_id: profileId, date, title: `Drive to ${store}`,
          start_time: minutesToTime(driveToStart), end_time: minutesToTime(driveToEnd),
          duration_minutes: driveTo, status: 'pending',
          is_fixed: false, is_protected: true, is_transition: false,
          is_travel: true, is_prep: false,
          ai_reason: `Travel to ${store} — added by Nudge`,
        },
        {
          profile_id: profileId, date, title: `Grocery — ${store}`,
          start_time: minutesToTime(shopStart), end_time: minutesToTime(shopEnd),
          duration_minutes: shopDuration, status: 'pending',
          is_fixed: false, is_protected: false, is_transition: false,
          is_travel: false, is_prep: false,
          ai_reason: `Errand — added by Nudge`,
        },
        {
          profile_id: profileId, date, title: 'Drive home',
          start_time: minutesToTime(driveHomeStart), end_time: minutesToTime(driveHomeEnd),
          duration_minutes: driveHome, status: 'pending',
          is_fixed: false, is_protected: true, is_transition: false,
          is_travel: true, is_prep: false,
          ai_reason: `Travel home from ${store} — added by Nudge`,
        },
      ];

      const { error: insertErr } = await supabase.from('schedule_blocks').insert(newBlocks);
      if (insertErr) console.error('Failed to insert grocery blocks:', insertErr);

      // Shift blocks down and compress to fit before dinner (17:00)
      if (shiftAmount > 0) {
        const eveningCutoff = 17 * 60;
        const blocksToShift = blocks
          .filter((b) => {
            if (origDriveHome && b.id === origDriveHome.id) return false;
            if (b.is_fixed || b.is_travel) return false;
            const start = parseTimeToMinutes(b.start_time);
            if (start >= eveningCutoff) return false;
            return start >= dentistEnd + origDriveHomeDuration;
          })
          .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

        // Calculate total time available vs total time needed
        const availableEnd = eveningCutoff;
        const shiftedStart = parseTimeToMinutes(blocksToShift[0]?.start_time ?? '11:35') + shiftAmount;
        const availableMinutes = availableEnd - shiftedStart;
        const totalOriginalMinutes = blocksToShift.reduce((sum, b) => sum + b.duration_minutes, 0);

        // If blocks fit without compression, just shift. Otherwise compress proportionally.
        const ratio = totalOriginalMinutes <= availableMinutes
          ? 1
          : availableMinutes / totalOriginalMinutes;

        let cursor = shiftedStart;

        for (const block of blocksToShift) {
          const newDuration = ratio < 1
            ? Math.max(5, Math.round(block.duration_minutes * ratio))
            : block.duration_minutes;
          const newStart = cursor;
          const newEnd = cursor + newDuration;

          await supabase
            .from('schedule_blocks')
            .update({
              start_time: minutesToTime(newStart),
              end_time: minutesToTime(newEnd),
              duration_minutes: newDuration,
            })
            .eq('id', block.id);
          cursor = newEnd;
        }
      }

      continue;
    }

    // Create a new block (grocery, energy break, quick prep, etc.)
    if (data.title) {
      const duration = (data.duration as number) || 30;

      // Use demo schedule context to find insertion point
      let insertMin: number;
      if (data.priority) {
        // Priority: insert between last completed block and first pending block
        // "Get ready" should appear as the very next thing to do
        const completed = blocks
          .filter((b) => b.status === 'completed')
          .sort((a, b) => parseTimeToMinutes(a.end_time) - parseTimeToMinutes(b.end_time));
        const lastDone = completed[completed.length - 1];
        insertMin = lastDone
          ? parseTimeToMinutes(lastDone.end_time)
          : 480;
      } else {
        // Non-priority: insert after the cluster following the fixed block
        // (e.g., grocery goes after dentist → drive home → breather → lunch cluster)
        const fixedBlocks = blocks
          .filter((b) => b.is_fixed && b.status === 'pending')
          .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
        const afterFixed = fixedBlocks[0];
        const fixedEnd = afterFixed ? parseTimeToMinutes(afterFixed.end_time) : 720;
        // Skip past travel, transitions, and meals after the fixed block
        insertMin = findInsertAfterFixed(blocks, fixedEnd);
      }

      const startTime = minutesToTime(insertMin);
      const endTime = minutesToTime(insertMin + duration);

      // Build ai_reason with hints so blockEnricher picks up the right type
      let aiReason = 'Added by Nudgley';
      if (data.isSelfCare) aiReason = 'Self-care — added by Nudgley';
      if (data.category === 'errands') aiReason = 'Errand — added by Nudgley';

      const { error } = await supabase.from('schedule_blocks').insert({
        profile_id: profileId,
        title: data.title as string,
        date,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        status: 'pending',
        is_fixed: false,
        is_protected: false,
        is_transition: false,
        is_travel: false,
        is_prep: false,
        ai_reason: aiReason,
      });
      if (error) console.error('Failed to create block:', error);
    }
  }
}
