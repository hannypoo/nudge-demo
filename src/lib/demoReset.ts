import { supabase } from './supabase';
import { resetDemoConversation } from './demoResponses';
import { seedDemoSchedule } from './demoSchedule';

/**
 * Resets demo state:
 * 1. Deletes all schedule_blocks for the given date
 * 2. Seeds a realistic demo-day schedule
 * 3. Deletes chat messages so the conversation looks fresh
 * 4. Resets the multi-turn conversation tracker in demoResponses
 */
export async function resetDemoState(profileId: string, date: string): Promise<void> {
  // Clear schedule blocks for today
  await supabase
    .from('schedule_blocks')
    .delete()
    .eq('profile_id', profileId)
    .eq('date', date);

  // Seed realistic demo schedule
  await seedDemoSchedule(profileId, date);

  // Clear chat history
  await supabase
    .from('chat_messages')
    .delete()
    .eq('profile_id', profileId);

  // Reset multi-turn demo conversation state
  resetDemoConversation();
}
