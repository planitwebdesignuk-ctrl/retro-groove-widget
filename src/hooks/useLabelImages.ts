import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useLabelImages() {
  return useQuery({
    queryKey: ['label-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useActiveLabelImage() {
  return useQuery({
    queryKey: ['active-label-image'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_images')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });
}

export function useSetActiveLabelImage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('label_images')
        .update({ is_active: true })
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-images'] });
      queryClient.invalidateQueries({ queryKey: ['active-label-image'] });
      toast({ title: 'Active label updated!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating active label',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

export function useDeleteLabelImage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (imageId: string) => {
      // First get the image to delete from storage
      const { data: image } = await supabase
        .from('label_images')
        .select('image_url')
        .eq('id', imageId)
        .single();
      
      if (image?.image_url) {
        const fileName = image.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('label-images').remove([fileName]);
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from('label_images')
        .delete()
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-images'] });
      queryClient.invalidateQueries({ queryKey: ['active-label-image'] });
      toast({ title: 'Label image deleted!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting label image',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}
