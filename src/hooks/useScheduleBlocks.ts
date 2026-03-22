import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfileId } from './useProfileId';
import type { ScheduleBlock } from '../types/database';
import { toast } from 'sonner';

export function useScheduleBlocks(date?: string) {
  const profileId = useProfileId();
  return useQuery({
    queryKey: ['schedule_blocks', date, profileId],
    queryFn: async () => {
      let query = supabase
        .from('schedule_blocks')
        .select('*')
        .eq('profile_id', profileId)
        .order('start_time', { ascending: true });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduleBlock[];
    },
    enabled: !!date && !!profileId,
  });
}

export function useScheduleBlocksRange(startDate?: string, endDate?: string) {
  const profileId = useProfileId();
  return useQuery({
    queryKey: ['schedule_blocks_range', startDate, endDate, profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('profile_id', profileId)
        .gte('date', startDate!)
        .lte('date', endDate!)
        .order('date')
        .order('start_time');

      if (error) throw error;
      return data as ScheduleBlock[];
    },
    enabled: !!startDate && !!endDate && !!profileId,
  });
}

export function useCreateBlocks() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: Omit<ScheduleBlock, 'id' | 'created_at' | 'updated_at'>[]) => {
      if (!profileId) return;
      const rows = blocks.map((b) => ({ ...b, profile_id: profileId }));
      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert(rows)
        .select();
      if (error) throw error;
      return data as ScheduleBlock[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule_blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule_blocks_range'] });
    },
    onError: () => {
      toast.error('Failed to save schedule');
    },
  });
}

export function useUpdateBlock() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ScheduleBlock>) => {
      if (!profileId) return;
      const { data, error } = await supabase
        .from('schedule_blocks')
        .update(updates)
        .eq('id', id)
        .eq('profile_id', profileId)
        .select()
        .single();
      if (error) throw error;
      return data as ScheduleBlock;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule_blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule_blocks_range'] });
    },
    onError: () => {
      toast.error('Failed to update block');
    },
  });
}

export function useDeleteBlocksByIds() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!profileId) return;
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('profile_id', profileId)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule_blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule_blocks_range'] });
    },
    onError: () => {
      toast.error('Failed to update schedule');
    },
  });
}

export function useDeleteBlocks() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      if (!profileId) return;
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('profile_id', profileId)
        .eq('date', date);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule_blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule_blocks_range'] });
    },
  });
}
