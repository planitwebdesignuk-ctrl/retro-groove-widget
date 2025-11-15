import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import VinylPlayer from "@/components/VinylPlayer";
import { useTracks } from "@/hooks/useTracks";
import { useActiveLabelImage } from "@/hooks/useLabelImages";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: tracks, isLoading } = useTracks();
  const { data: activeLabel } = useActiveLabelImage();
  const { data: role } = useUserRole(user?.id);

  // Subscribe to label changes for realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('label-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'label_images'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-label'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vignette">
        <p className="text-lg">Loading tracks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vignette p-4 sm:p-8">
      {user && role === 'admin' && (
        <div className="absolute top-4 right-4 z-10">
          <Button onClick={() => navigate('/admin')} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        </div>
      )}
      
      {tracks && tracks.length > 0 ? (
        <VinylPlayer 
          tracks={tracks} 
          labelImageUrl={activeLabel?.image_url || "/images/label-blank-template.png"} 
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-vignette">
          <p className="text-lg text-muted-foreground">No tracks available. Admin can add tracks.</p>
        </div>
      )}
    </div>
  );
};

export default Index;
