import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DbTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  order_index: number;
  created_at: string;
}

export interface Track {
  id: number;
  dbId: string;
  title: string;
  artist: string;
  audioUrl: string;
}

export function useTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      
      // Transform to match VinylPlayer interface
      return (data as DbTrack[]).map((track, index) => ({
        id: index + 1,
        dbId: track.id,
        title: track.title,
        artist: track.artist,
        audioUrl: track.audio_url
      }));
    }
  });
}

export function useDeleteTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({ title: 'Track deleted successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error deleting track',
        variant: 'destructive'
      });
    }
  });
}

export function useUpdateTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, artist }: { id: string; title: string; artist: string }) => {
      const { error } = await supabase
        .from('tracks')
        .update({ title, artist })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({ title: 'Track updated successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error updating track',
        variant: 'destructive'
      });
    }
  });
}
