import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Square, SkipBack, SkipForward, Upload, Copy, RotateCcw } from "lucide-react";
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

// Centralized configuration for all visual elements
const DEFAULT_CONFIG = {
  configVersion: 6,
  base: {
    aspectRatio: 1.18, // Updated after image loads
  },
  platter: {
    leftPct: 12.9,
    topPct: 10.7,
    sizePct: 55.8,
  },
  tonearm: {
    rightPct: 18.0,
    topPct: 10.1,
    widthPct: 17.1,
    lengthScale: 1.20,
    pivotXPct: 87.9,
    pivotYPct: 9.8,
  },
  angles: {
    REST: -0.6,
    START: 14.0,
    END: 30.9,
  },
  vinylSpeed: 20, // seconds per rotation
};

const STORAGE_KEY = 'vinyl-player-config-v6';

const VinylPlayer = ({ tracks }: VinylPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const [snapTonearm, setSnapTonearm] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_CONFIG.base.aspectRatio);
  const [trackDurations, setTrackDurations] = useState<number[]>([]);
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Version check: ignore saved config if version doesn't match
      if (parsed.configVersion === DEFAULT_CONFIG.configVersion) {
        return parsed;
      }
    }
    return DEFAULT_CONFIG;
  });
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState(50);
  const [adjustTarget, setAdjustTarget] = useState<'platter' | 'tonearm' | 'pivot' | 'angles' | 'vinyl'>('platter');
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const baseImageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = tracks[currentTrackIndex];

  // Check if all durations are loaded
  const durationsReady = useMemo(
    () => trackDurations.length === tracks.length && trackDurations.every(d => d > 0),
    [trackDurations, tracks.length]
  );

  // Precompute per-track angle fractions
  const trackFractions = useMemo(() => {
    const n = tracks.length;
    if (!durationsReady || n === 0) {
      // Equal split when durations not ready
      return Array.from({ length: n }, (_, i) => ({
        start: i / n,
        end: (i + 1) / n,
      }));
    }
    // Proportional split based on durations
    const total = trackDurations.reduce((a, b) => a + b, 0);
    let acc = 0;
    return trackDurations.map((d) => {
      const start = total > 0 ? acc / total : 0;
      acc += d;
      const end = total > 0 ? acc / total : 1 / n;
      return { start, end };
    });
  }, [durationsReady, trackDurations, tracks.length]);

  // Load actual track durations on mount and preload metadata
  useEffect(() => {
    const loadDurations = async () => {
      const durations = await Promise.all(
        tracks.map((track) => {
          return new Promise<number>((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            audio.src = track.audioUrl;
            audio.addEventListener('loadedmetadata', () => {
              resolve(audio.duration);
            });
            audio.addEventListener('error', () => {
              resolve(0); // Fallback to 0 on error
            });
          });
        })
      );
      setTrackDurations(durations);
    };

    loadDurations();
  }, [tracks]);

  // Check for calibration/reset mode in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resetConfig') === '1') {
      try {
        localStorage.removeItem('vinyl-player-config');
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setConfig(DEFAULT_CONFIG);
    }
    if (params.get('calibrate') === '1') {
      setCalibrationMode(true);
    }
  }, []);

  // Keyboard controls for calibration
  useEffect(() => {
    if (!calibrationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 1.0 : e.altKey ? 0.02 : 0.1;
      let updated = { ...config };

      switch (e.key) {
        case 'Escape':
          setCalibrationMode(false);
          break;
        case 'Tab':
          e.preventDefault();
          const targets: typeof adjustTarget[] = ['platter', 'tonearm', 'pivot', 'angles', 'vinyl'];
          const currentIndex = targets.indexOf(adjustTarget);
          setAdjustTarget(targets[(currentIndex + 1) % targets.length]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (adjustTarget === 'platter') updated.platter.leftPct = Math.max(0, updated.platter.leftPct - step);
          if (adjustTarget === 'tonearm') updated.tonearm.rightPct = Math.max(0, updated.tonearm.rightPct + step);
          if (adjustTarget === 'pivot') updated.tonearm.pivotXPct = Math.max(0, updated.tonearm.pivotXPct - step);
          if (adjustTarget === 'angles') updated.angles.REST -= step;
          if (adjustTarget === 'vinyl') updated.vinylSpeed = Math.max(1, updated.vinylSpeed - step);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (adjustTarget === 'platter') updated.platter.leftPct = Math.min(100, updated.platter.leftPct + step);
          if (adjustTarget === 'tonearm') updated.tonearm.rightPct = Math.max(0, updated.tonearm.rightPct - step);
          if (adjustTarget === 'pivot') updated.tonearm.pivotXPct = Math.min(100, updated.tonearm.pivotXPct + step);
          if (adjustTarget === 'angles') updated.angles.REST += step;
          if (adjustTarget === 'vinyl') updated.vinylSpeed = Math.min(100, updated.vinylSpeed + step);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (adjustTarget === 'platter') updated.platter.topPct = Math.max(0, updated.platter.topPct - step);
          if (adjustTarget === 'tonearm') updated.tonearm.topPct = Math.max(0, updated.tonearm.topPct - step);
          if (adjustTarget === 'pivot') updated.tonearm.pivotYPct = Math.max(0, updated.tonearm.pivotYPct - step);
          if (adjustTarget === 'angles') updated.angles.START += step;
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (adjustTarget === 'platter') updated.platter.topPct = Math.min(100, updated.platter.topPct + step);
          if (adjustTarget === 'tonearm') updated.tonearm.topPct = Math.min(100, updated.tonearm.topPct + step);
          if (adjustTarget === 'pivot') updated.tonearm.pivotYPct = Math.min(100, updated.tonearm.pivotYPct + step);
          if (adjustTarget === 'angles') updated.angles.START -= step;
          break;
        case '[':
          e.preventDefault();
          if (adjustTarget === 'platter') updated.platter.sizePct = Math.max(1, updated.platter.sizePct - step);
          if (adjustTarget === 'tonearm') updated.tonearm.lengthScale = Math.max(0.5, updated.tonearm.lengthScale - 0.05);
          if (adjustTarget === 'angles') updated.angles.END -= step;
          break;
        case ']':
          e.preventDefault();
          if (adjustTarget === 'platter') updated.platter.sizePct = Math.min(100, updated.platter.sizePct + step);
          if (adjustTarget === 'tonearm') updated.tonearm.lengthScale = Math.min(2.0, updated.tonearm.lengthScale + 0.05);
          if (adjustTarget === 'angles') updated.angles.END += step;
          break;
        case '-':
        case '_':
          e.preventDefault();
          if (adjustTarget === 'tonearm') updated.tonearm.widthPct = Math.max(1, updated.tonearm.widthPct - step);
          break;
        case '=':
        case '+':
          e.preventDefault();
          if (adjustTarget === 'tonearm') updated.tonearm.widthPct = Math.min(100, updated.tonearm.widthPct + step);
          break;
      }

      if (updated !== config) {
        setConfig(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calibrationMode, config, adjustTarget]);

  // Load base image and get aspect ratio
  useEffect(() => {
    if (baseImageRef.current?.complete && baseImageRef.current.naturalWidth > 0) {
      const ratio = baseImageRef.current.naturalWidth / baseImageRef.current.naturalHeight;
      setAspectRatio(ratio);
    }
  }, []);

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyConfig = () => {
    const configText = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configText);
    alert('Config copied to clipboard!');
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
  };

  const forceDefaults = () => {
    // Clear all localStorage entries
    try {
      localStorage.removeItem('vinyl-player-config');
      localStorage.removeItem('vinyl-player-config-v2');
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const currentProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(currentProgress);
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    const handleEnded = () => {
      // Auto-advance to next track, wrapping to track 1 at end
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex(currentTrackIndex + 1);
      } else {
        // Wrap back to first track
        setCurrentTrackIndex(0);
      }
      // Keep playing
    };

    const handleLoadedMetadata = () => {
      setProgress(0); // Trigger re-render when duration is known
    };

    if (isPlaying) {
      // Progress tracking only - play() is called in handlePlay()
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [isPlaying, currentTrackIndex, tracks.length]);

  // Load new track when index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    audio.currentTime = 0;
    setProgress(0);
    
    if (isPlaying) {
      // Use promise-based play to ensure audio is ready
      audio.play().catch((error) => {
        console.error('Auto-play failed on track change:', error);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex]);

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Set flags to ensure tonearm snaps to START position instantly
    setSnapTonearm(true);
    setIsStartingPlayback(true);
    
    const startPlayback = () => {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          // Remove snap after first render to restore smooth transition
          requestAnimationFrame(() => {
            setSnapTonearm(false);
          });
        })
        .catch((error) => {
          console.error('Playback failed:', error);
          setSnapTonearm(false);
          setIsStartingPlayback(false);
        });
    };
    
    // Wait for audio to be ready before starting
    if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or better
      startPlayback();
    } else {
      const handleCanPlay = () => {
        audio.removeEventListener('canplay', handleCanPlay);
        startPlayback();
      };
      audio.addEventListener('canplay', handleCanPlay);
      audio.load(); // Ensure loading starts
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    const wasPlaying = isPlaying;
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
      // Keep playing state if it was playing
      if (!wasPlaying) {
        setIsPlaying(false);
      }
    } else {
      // Stay at track 0, just reset position
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        setProgress(0);
      }
    }
  };

  const handleNext = () => {
    const wasPlaying = isPlaying;
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else {
      // Wrap to first track
      setCurrentTrackIndex(0);
    }
    // Keep playing state if it was playing
    if (!wasPlaying) {
      setIsPlaying(false);
    }
  };

  // Calculate global fraction based on current track segment
  const getGlobalFraction = () => {
    const audio = audioRef.current;
    if (!audio) return 0;
    const within = audio.duration ? audio.currentTime / audio.duration : 0;
    const { start, end } = trackFractions[currentTrackIndex] || { start: 0, end: 1 / Math.max(1, tracks.length) };
    const span = Math.max(0, end - start);
    return start + within * span;
  };

  // Reset isStartingPlayback after a short delay
  useEffect(() => {
    if (isStartingPlayback && isPlaying) {
      const timer = setTimeout(() => {
        setIsStartingPlayback(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isStartingPlayback, isPlaying]);

  // Calculate tonearm rotation based on global fraction
  const getTonearmRotation = () => {
    const audio = audioRef.current;
    
    // When not playing, tonearm returns to REST position
    if (!isPlaying) {
      return config.angles.REST;
    }
    
    // If snapping or just starting playback, use the track's start position
    if (snapTonearm || isStartingPlayback) {
      if (currentTrackIndex === 0) {
        return config.angles.START; // 16.0°
      }
      const trackStart = trackFractions[currentTrackIndex]?.start || 0;
      return config.angles.START + (config.angles.END - config.angles.START) * trackStart;
    }
    
    // Safety check: ensure audio is ready with valid duration
    if (!audio || !audio.duration || isNaN(audio.duration)) {
      // If audio isn't ready but we're "playing", use track start position
      if (currentTrackIndex === 0) {
        return config.angles.START; // 16.0°
      }
      const trackStart = trackFractions[currentTrackIndex]?.start || 0;
      return config.angles.START + (config.angles.END - config.angles.START) * trackStart;
    }
    
    // If at the very start of a track (within first 100ms), use the track's start position
    if (audio.currentTime < 0.1) {
      // Track 0 should always start at START angle (16.0°)
      if (currentTrackIndex === 0) {
        return config.angles.START; // 16.0°
      }
      const trackStart = trackFractions[currentTrackIndex]?.start || 0;
      return config.angles.START + (config.angles.END - config.angles.START) * trackStart;
    }
    
    // During playback, calculate position based on track progress
    const globalFraction = getGlobalFraction();
    return config.angles.START + (config.angles.END - config.angles.START) * globalFraction;
  };

  const tonearmRotation = getTonearmRotation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl animate-fade-in">
        {/* Main Turntable */}
        <div 
          className="relative mx-auto w-full overflow-hidden rounded-2xl bg-card shadow-2xl"
          style={{ aspectRatio: aspectRatio.toString() }}
        >
          {/* Background - Turntable base with full scene */}
          <img 
            ref={baseImageRef}
            src="/images/turntable-base.png"
            alt="Turntable"
            className="w-full h-full object-cover"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0) {
                setAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
          />
          
          {/* Reference Image Overlay */}
          {calibrationMode && referenceImage && (
            <img
              src={referenceImage}
              alt="Reference"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ 
                zIndex: 5, 
                opacity: referenceOpacity / 100,
                mixBlendMode: 'normal'
              }}
            />
          )}

          {/* Vinyl Record - positioned over the platter */}
          <div 
            className="absolute"
            style={{
              left: `${config.platter.leftPct}%`,
              top: `${config.platter.topPct}%`,
              width: `${config.platter.sizePct}%`,
              aspectRatio: "1/1",
              zIndex: 2,
            }}
          >
            <div
              className={cn(
                "relative w-full h-full rounded-full",
                isPlaying && "animate-spin-vinyl"
              )}
              style={{
                animationPlayState: isPlaying ? "running" : "paused",
                animationDuration: `${config.vinylSpeed}s`,
              }}
            >
              <img
                src="/images/vinyl-record.png"
                alt="Vinyl Record"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Glow effect when playing */}
          {isPlaying && (
            <div 
              className="absolute animate-glow-pulse rounded-full bg-accent/10 blur-2xl pointer-events-none"
              style={{
                left: `${config.platter.leftPct}%`,
                top: `${config.platter.topPct}%`,
                width: `${config.platter.sizePct}%`,
                height: `${config.platter.sizePct}%`,
                zIndex: 1,
              }}
            />
          )}

          {/* Tonearm - animated using the standalone tonearm image */}
          <div
            className={cn(
              "absolute",
              snapTonearm ? "transition-none" : "transition-transform duration-700 ease-in-out"
            )}
            style={{
              right: `${config.tonearm.rightPct}%`,
              top: `${config.tonearm.topPct}%`,
              width: `${config.tonearm.widthPct}%`,
              transformOrigin: `${config.tonearm.pivotXPct}% ${config.tonearm.pivotYPct}%`,
              transform: `rotate(${tonearmRotation}deg)`,
              zIndex: 3,
            }}
          >
            <img
              src="/images/tonearm-animated.png"
              alt="Tonearm"
              className="w-full h-auto object-contain drop-shadow-2xl"
              style={{
                transform: `scaleY(${config.tonearm.lengthScale})`,
                transformOrigin: `${config.tonearm.pivotXPct}% ${config.tonearm.pivotYPct}%`,
              }}
            />
          </div>

          {/* Calibration Mode Overlay */}
          {calibrationMode && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
              {/* Platter Ring */}
              <div
                className="absolute border-2 border-yellow-400 rounded-full"
                style={{
                  left: `${config.platter.leftPct}%`,
                  top: `${config.platter.topPct}%`,
                  width: `${config.platter.sizePct}%`,
                  height: `${config.platter.sizePct}%`,
                }}
              />
              
              {/* Tonearm Pivot Crosshair */}
              <div
                className="absolute"
                style={{
                  right: `${config.tonearm.rightPct}%`,
                  top: `${config.tonearm.topPct}%`,
                  width: `${config.tonearm.widthPct}%`,
                  aspectRatio: "auto",
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: `${config.tonearm.pivotXPct}%`,
                    top: `${config.tonearm.pivotYPct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="w-8 h-0.5 bg-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <div className="w-0.5 h-8 bg-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <div className="w-2 h-2 rounded-full border-2 border-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Control Panel */}
              <div className="absolute top-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono pointer-events-auto max-w-md">
                <div className="font-bold mb-3 text-sm">🎯 Calibration Mode</div>
                
                <div className="mb-3 space-y-1">
                  <div className={adjustTarget === 'platter' ? 'text-yellow-400 font-bold' : ''}>
                    Platter: L:{config.platter.leftPct.toFixed(1)}% T:{config.platter.topPct.toFixed(1)}% Size:{config.platter.sizePct.toFixed(1)}%
                  </div>
                  <div className={adjustTarget === 'tonearm' ? 'text-yellow-400 font-bold' : ''}>
                    Tonearm: R:{config.tonearm.rightPct.toFixed(1)}% T:{config.tonearm.topPct.toFixed(1)}% W:{config.tonearm.widthPct.toFixed(1)}% Len:{config.tonearm.lengthScale.toFixed(2)}
                  </div>
                  <div className={adjustTarget === 'pivot' ? 'text-yellow-400 font-bold' : ''}>
                    Pivot: X:{config.tonearm.pivotXPct.toFixed(1)}% Y:{config.tonearm.pivotYPct.toFixed(1)}%
                  </div>
                  <div className={adjustTarget === 'angles' ? 'text-yellow-400 font-bold' : ''}>
                    Angles: REST:{config.angles.REST.toFixed(1)}° START:{config.angles.START.toFixed(1)}° END:{config.angles.END.toFixed(1)}°
                  </div>
                  <div className={adjustTarget === 'vinyl' ? 'text-yellow-400 font-bold' : ''}>
                    Vinyl Speed: {config.vinylSpeed.toFixed(1)}s per rotation
                  </div>
                </div>

                <div className="mb-3 text-[10px] space-y-1 text-gray-300">
                  <div>Tab: Switch target ({adjustTarget})</div>
                  <div>Arrows: Move/Adjust (Shift=1.0, Alt=0.02)</div>
                  <div>[ ]: Tonearm Length/Size/END angle</div>
                  <div>+/-: Tonearm Width</div>
                  <div>Vinyl: Left/Right arrows to adjust speed</div>
                  <div>ESC: Exit calibration</div>
                </div>

                {/* Reference Image Controls */}
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-700 text-xs mb-2 w-full justify-center"
                  >
                    <Upload className="h-3 w-3" />
                    Upload Reference
                  </button>
                  {referenceImage && (
                    <div className="space-y-1">
                      <label className="block text-[10px]">Opacity: {referenceOpacity}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={referenceOpacity}
                        onChange={(e) => setReferenceOpacity(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={copyConfig}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 rounded hover:bg-green-700 text-xs flex-1 justify-center"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                    <button 
                      onClick={resetConfig}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 rounded hover:bg-orange-700 text-xs flex-1 justify-center"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={forceDefaults}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 rounded hover:bg-purple-700 text-xs flex-1 justify-center"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Force Defaults
                    </button>
                    <button 
                      onClick={() => setCalibrationMode(false)}
                      className="px-3 py-1.5 bg-red-600 rounded hover:bg-red-700 text-xs flex-1"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
              className="h-12 w-12 rounded-full"
              aria-label="Previous track"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {!isPlaying ? (
              <Button
                size="icon"
                onClick={handlePlay}
                className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Play"
              >
                <Play className="h-7 w-7 translate-x-0.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleStop}
                className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Stop"
              >
                <Square className="h-7 w-7" />
              </Button>
            )}

            <Button
              variant="secondary"
              size="icon"
              onClick={handleNext}
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
          <source src={currentTrack?.audioUrl || ''} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
};

export default VinylPlayer;
