import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfileId } from './useProfileId';
import { getDemoResponse } from '../lib/demoResponses';
import { executeDemoActions } from '../lib/demoActions';
import { executeAiActions } from '../lib/aiActions';
import { restoreDemoSchedule } from '../lib/demoSchedule';
import { getToday } from '../lib/utils';
import type { ChatMessage, ScheduleBlock } from '../types/database';
import type { ChatResponse, Suggestion } from '../types';

export function useChatHistory() {
  const profileId = useProfileId();
  return useQuery({
    queryKey: ['chat_messages', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!profileId,
  });
}

export function useChat() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const sendMessage = useCallback(async (
    message: string,
    context: Record<string, unknown> = {},
    history: { role: string; content: string }[] = [],
    blocks?: ScheduleBlock[]
  ): Promise<ChatResponse | null> => {
    if (!profileId) return null;
    setIsLoading(true);

    try {
      // Save user message to DB
      await supabase.from('chat_messages').insert({
        profile_id: profileId,
        role: 'user',
        content: message,
      });

      // Try demo response first (pre-seeded scenarios for demo day)
      const demoResponse = getDemoResponse(message, blocks || []);
      let response: ChatResponse;

      if (demoResponse) {
        response = demoResponse;

        // Save assistant response to DB immediately so it appears in chat fast
        await supabase.from('chat_messages').insert({
          profile_id: profileId,
          role: 'assistant',
          content: response.message,
          metadata: { actions: response.actions, suggestions: response.suggestions },
        });
        setSuggestions(response.suggestions || []);
        qc.invalidateQueries({ queryKey: ['chat_messages'] });
        setIsLoading(false);

        // Fire off demo actions in background — don't block the return
        // This lets speech start immediately while the schedule updates
        if (response.actions && response.actions.length > 0) {
          restoreDemoSchedule(profileId, getToday()).then((freshBlocks) =>
            executeDemoActions(response.actions!, freshBlocks, profileId, getToday()).then(() =>
              qc.invalidateQueries({ queryKey: ['schedule_blocks'] })
            )
          );
        }

        return response;
      } else {
        // Fall through to real AI edge function
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { message, context, history },
        });

        if (error) throw error;
        response = data as ChatResponse;

        // Execute AI-generated actions (create blocks, etc.)
        if (response.actions && response.actions.length > 0 && blocks) {
          const executed = await executeAiActions(response.actions, blocks, profileId, getToday());
          if (executed > 0) {
            qc.invalidateQueries({ queryKey: ['schedule_blocks'] });
            qc.invalidateQueries({ queryKey: ['schedule_blocks_range'] });
          }
        }
      }

      // Save assistant response to DB
      await supabase.from('chat_messages').insert({
        profile_id: profileId,
        role: 'assistant',
        content: response.message,
        metadata: {
          actions: response.actions,
          suggestions: response.suggestions,
        },
      });

      setSuggestions(response.suggestions || []);

      // Refresh chat history
      qc.invalidateQueries({ queryKey: ['chat_messages'] });

      return response;
    } catch (err) {
      console.error('Chat error:', err);
      return {
        message: "I'm having trouble right now. Try again in a moment.",
        suggestions: [],
      };
    } finally {
      setIsLoading(false);
    }
  }, [qc, profileId]);

  return { sendMessage, isLoading, suggestions, setSuggestions };
}
