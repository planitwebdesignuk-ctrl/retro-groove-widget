import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface LabelImage {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  uploaded_by: string | null;
  file_size: number | null;
  created_at: string;
}

export function useLabelImages() {
  return useQuery({
    queryKey: ['label-images'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('label_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LabelImage[];
    }
  });
}

export function useActiveLabelImage() {
  return useQuery({
    queryKey: ['active-label'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('label_images')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as LabelImage | null;
    }
  });
}

export function useUploadLabelImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('label-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('label-images')
        .getPublicUrl(fileName);

      // Insert database record
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await (supabase as any)
        .from('label_images')
        .insert({
          name: file.name,
          image_url: publicUrl,
          is_active: false,
          uploaded_by: user?.id,
          file_size: file.size,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-images'] });
      toast({ title: 'Label image uploaded successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error uploading label image',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

export function useSetActiveLabelImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      // First deactivate all labels
      const { error: deactivateError } = await (supabase as any)
        .from('label_images')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all rows
      
      if (deactivateError) throw deactivateError;

      // Then activate the selected label
      const { error: activateError } = await (supabase as any)
        .from('label_images')
        .update({ is_active: true })
        .eq('id', labelId);
      
      if (activateError) throw activateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-images'] });
      queryClient.invalidateQueries({ queryKey: ['active-label'] });
      toast({ title: 'Active label updated successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error updating active label',
        variant: 'destructive'
      });
    }
  });
}

export function useDeleteLabelImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ labelId, imageUrl }: { labelId: string; imageUrl: string }) => {
      // Delete from database
      const { error: dbError } = await (supabase as any)
        .from('label_images')
        .delete()
        .eq('id', labelId);
      
      if (dbError) throw dbError;

      // Delete from storage
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('label-images')
          .remove([fileName]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-images'] });
      queryClient.invalidateQueries({ queryKey: ['active-label'] });
      toast({ title: 'Label image deleted successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error deleting label image',
        variant: 'destructive'
      });
    }
  });
}
