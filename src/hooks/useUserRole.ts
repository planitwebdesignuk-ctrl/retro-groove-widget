import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole(userId: string | undefined) {
  const enabled = !!userId;
  const query = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }
      
      return data?.role as 'admin' | 'user' | null;
    },
    enabled
  });

  return {
    ...query,
    isLoading: enabled ? query.isLoading : true
  };
}
