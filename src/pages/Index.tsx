import { useNavigate } from "react-router-dom";
import VinylPlayer from "@/components/VinylPlayer";
import { useTracks } from "@/hooks/useTracks";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogIn, Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tracks, isLoading } = useTracks();
  const { data: role } = useUserRole(user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <p className="text-lg">Loading tracks...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {user ? (
          <>
            {role === 'admin' && (
              <Button onClick={() => navigate('/admin')} variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
          </>
        ) : (
          <Button onClick={() => navigate('/auth')} variant="outline">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </div>
      
      {tracks && tracks.length > 0 ? (
        <VinylPlayer tracks={tracks} labelImageUrl="/images/label-cobnet-strange.png" />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
          <p className="text-lg text-muted-foreground">No tracks available. Admin can add tracks.</p>
        </div>
      )}
    </div>
  );
};

export default Index;
