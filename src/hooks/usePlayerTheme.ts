import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_THEME_ID, getPlayerTheme } from '@/config/playerThemes';

interface PlayerSettingsRow {
  id: string;
  active_theme: string;
}

/** Reads the site-wide active player theme id. */
export function useActivePlayerThemeId() {
  return useQuery({
    queryKey: ['player-theme'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('player_settings')
        .select('id, active_theme')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return ((data as PlayerSettingsRow | null)?.active_theme ?? DEFAULT_THEME_ID) as string;
    },
  });
}

/** Resolved theme preset for the active id (falls back to the default theme). */
export function useActivePlayerTheme() {
  const { data, isLoading } = useActivePlayerThemeId();
  // ?playerTheme=<id> previews a style without changing the site-wide setting.
  const preview =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('playerTheme')
      : null;
  return { theme: getPlayerTheme(preview ?? data), isLoading };
}

/** Keeps the active theme in sync across open browsers. */
export function usePlayerThemeRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('player-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['player-theme'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Admin-only write of the active theme. */
export function useSetPlayerTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themeId: string) => {
      const { data: existing, error: readError } = await (supabase as any)
        .from('player_settings')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (readError) throw readError;

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('player_settings')
          .update({ active_theme: themeId })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('player_settings')
          .insert({ active_theme: themeId });
        if (error) throw error;
      }
    },
    onSuccess: (_data, themeId) => {
      queryClient.invalidateQueries({ queryKey: ['player-theme'] });
      toast({
        title: `${getPlayerTheme(themeId).name} applied`,
        description: 'All visitors now see this look.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating the player style',
        description: error?.message,
        variant: 'destructive',
      });
    },
  });
}