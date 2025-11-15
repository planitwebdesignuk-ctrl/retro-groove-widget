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
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const roles = (data ?? []).map((r) => r.role as 'admin' | 'user');

      if (roles.includes('admin')) return 'admin';
      if (roles.includes('user')) return 'user';
      return null;
    },
    enabled
  });

  return {
    ...query,
    isLoading: enabled ? query.isLoading : true
  };
}
