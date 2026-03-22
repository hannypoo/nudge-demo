import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfileId } from './useProfileId';
import type { Goal } from '../types/database';
import { toast } from 'sonner';
import { getWeekStart } from '../lib/dateUtils';

export function useGoals(weekStart?: string) {
  const profileId = useProfileId();
  const week = weekStart || getWeekStart();
  return useQuery({
    queryKey: ['goals', week, profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('profile_id', profileId)
        .eq('week_start', week)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!profileId,
  });
}

export function useCreateGoal() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'created_at'>) => {
      if (!profileId) return;
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, profile_id: profileId })
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created');
    },
    onError: () => {
      toast.error('Failed to create goal');
    },
  });
}

export function useUpdateGoal() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Goal>) => {
      if (!profileId) return;
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('profile_id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
