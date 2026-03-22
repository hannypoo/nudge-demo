import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfileId } from './useProfileId';
import type { DbCategory } from '../types/database';
import type { Category } from '../types';
import { toast } from 'sonner';

// Convert DB category to client-side Category type
function toCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    priority: row.priority,
    defaultBlockMinutes: row.default_block_minutes,
    weeklyMinMinutes: row.weekly_min_minutes,
    isProtected: row.is_protected,
    isFixed: row.is_fixed,
    enabled: row.enabled,
  };
}

export function useCategories() {
  const profileId = useProfileId();
  return useQuery({
    queryKey: ['categories', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('profile_id', profileId)
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data as DbCategory[]).map(toCategory);
    },
    enabled: !!profileId,
  });
}

export function useUpdateCategory() {
  const profileId = useProfileId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<DbCategory>) => {
      if (!profileId) return;
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('profile_id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => {
      toast.error('Failed to update category');
    },
  });
}
