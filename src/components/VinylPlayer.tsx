import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Track {
  id: number;
  title: string;
  artist: string;
  audioUrl: string;
}

interface VinylPlayerProps {
  tracks: Track[];
}

const VinylPlayer = ({ tracks }: VinylPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();

  const currentTrack = tracks[currentTrackIndex];

  // Tonearm angles (in degrees)
  const ANGLE_REST = -45; // Tonearm at rest position
  const ANGLE_START = 0; // Tonearm at start of record
  const ANGLE_END = 30; // Tonearm at end of record

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const currentProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(currentProgress);
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    const handleEnded = () => {
      // Auto-advance to next track
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex(currentTrackIndex + 1);
      } else {
        // Reached end of playlist
        setIsPlaying(false);
        setProgress(0);
      }
    };

    if (isPlaying) {
      audio.play();
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    audio.addEventListener("ended", handleEnded);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isPlaying, currentTrackIndex, tracks.length]);

  // Load new track when index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    setProgress(0);
    
    if (isPlaying) {
      audio.play();
    }
  }, [currentTrackIndex, isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    }
  };

  // Calculate tonearm rotation based on progress
  const getTonearmRotation = () => {
    if (!isPlaying && progress === 0) {
      return ANGLE_REST;
    }
    // Interpolate between start and end angles based on progress
    return ANGLE_START + (ANGLE_END - ANGLE_START) * (progress / 100);
  };

  const tonearmRotation = getTonearmRotation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl animate-fade-in">
        {/* Main Turntable */}
        <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-card shadow-2xl">
          {/* Background - Turntable base with full scene */}
          <img 
            src="/images/turntable-base.png"
            alt="Turntable"
            className="w-full h-auto"
          />
          
          {/* Vinyl Record - positioned over the platter */}
          <div 
            className="absolute"
            style={{
              left: "30%",
              top: "32%",
              width: "31%",
              height: "auto",
              aspectRatio: "1/1"
            }}
          >
            <div
              className={cn(
                "relative w-full h-full rounded-full transition-transform duration-500",
                isPlaying && "animate-spin-vinyl"
              )}
              style={{
                animationPlayState: isPlaying ? "running" : "paused",
              }}
            >
              <img
                src="/images/vinyl-record.png"
                alt="Vinyl Record"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Tonearm - positioned to overlay the static tonearm in base image */}
          <div
            className="absolute transition-transform duration-700 ease-in-out"
            style={{
              right: "18%",
              top: "30%",
              width: "28%",
              height: "auto",
              transformOrigin: "85% 15%",
              transform: `rotate(${tonearmRotation}deg)`,
            }}
          >
            <img
              src="/images/tonearm.png"
              alt="Tonearm"
              className="w-full h-auto object-contain drop-shadow-2xl"
            />
          </div>

          {/* Glow effect when playing */}
          {isPlaying && (
            <div 
              className="absolute animate-glow-pulse rounded-full bg-accent/10 blur-2xl pointer-events-none"
              style={{
                left: "30%",
                top: "32%",
                width: "31%",
                height: "31%",
              }}
            />
          )}
        </div>

        {/* Track Info & Controls */}
        <div className="mt-8 rounded-xl bg-card p-6 shadow-lg">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-card-foreground">
              {currentTrack.title}
            </h2>
            <p className="text-muted-foreground">{currentTrack.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={handlePrevious}
              disabled={currentTrackIndex === 0}
              className="h-12 w-12 rounded-full"
              aria-label="Previous track"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              onClick={handlePlayPause}
              className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5" />
              )}
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={handleNext}
              disabled={currentTrackIndex === tracks.length - 1}
              className="h-12 w-12 rounded-full"
              aria-label="Next track"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Track List */}
          <div className="mt-6 space-y-2">
            {tracks.map((track, index) => (
              <button
                key={track.id}
                onClick={() => setCurrentTrackIndex(index)}
                className={cn(
                  "w-full rounded-lg px-4 py-3 text-left transition-colors",
                  index === currentTrackIndex
                    ? "bg-primary/20 text-card-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{index + 1}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{track.title}</div>
                    <div className="text-xs opacity-75">{track.artist}</div>
                  </div>
                  {index === currentTrackIndex && isPlaying && (
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-3 w-0.5 animate-pulse bg-primary"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} preload="metadata">
          <source src={currentTrack.audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
};

export default VinylPlayer;
