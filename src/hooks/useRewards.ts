import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfileId } from './useProfileId';
import type { Reward } from '../types/database';


export function useRewards(date?: string) {
  const profileId = useProfileId();
  return useQuery({
    queryKey: ['rewards', date, profileId],
    queryFn: async () => {
      let query = supabase
        .from('rewards')
        .select('*')
        .eq('profile_id', profileId)
        .order('earned_at', { ascending: false });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) {
        // Rewards table may not exist yet — suppress silently for demo
        console.debug('Rewards query skipped:', error.message);
        return [] as Reward[];
      }
      return data as Reward[];
    },
    enabled: !!profileId,
  });
}

export function useCreateReward() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reward: { type: string; label: string; treat_suggestion?: string; date?: string }) => {
      if (!profileId) return;
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...reward, profile_id: profileId })
        .select()
        .single();
      if (error) {
        console.debug('Reward save skipped:', error.message);
        return null;
      }
      return data as Reward;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}
