# VinylPlayer Component - Complete Installation Guide

This guide contains everything you need to add the VinylPlayer component to any Lovable project.

---

## 📦 What You'll Get

A fully functional vintage vinyl record player with:
- Spinning vinyl record animation
- Animated tonearm with realistic movement
- Needle drop and runout sound effects
- Visual progress bar
- Previous/Next track navigation
- Play/Stop controls
- Customizable center label
- Built-in calibration mode for fine-tuning

---

## 🚀 Quick Start

When creating a new Lovable project, simply say:

> "I want to add a vinyl record player component. I have the complete component code and will provide the necessary files."

Then paste the relevant sections from this guide.

---

## 📋 Required Dependencies

Good news! All required dependencies are **already included** in standard Lovable projects:
- React 18+
- TypeScript
- Lucide React (for icons)
- Tailwind CSS

---

## 📁 File Structure

You'll need to create/add these files:

```
src/
  components/
    VinylPlayer.tsx          # Main component (see Section 1)
  data/
    playlist.ts              # Track data (see Section 2)

public/
  images/
    turntable-base.png       # Main turntable body
    vinyl-record.png         # The spinning record
    tonearm.png              # Static tonearm image
    tonearm-animated.png     # Animated tonearm overlay
    label-cobnet-strange.png # Center label (customize this!)
  audio/
    needle-drop.wav          # Sound effect when play starts
    needle-stuck.wav         # Sound effect when track ends
    [your-music-files].mp3   # Your actual music tracks
```

---

## 1️⃣ COMPONENT CODE: VinylPlayer.tsx

Create `src/components/VinylPlayer.tsx` with this complete code:

```tsx
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Settings, Copy, RotateCcw, AlertCircle } from "lucide-react";

interface Track {
  id: number;
  title: string;
  artist: string;
  audioUrl: string;
}

interface VinylPlayerProps {
  tracks: Track[];
  labelImageUrl?: string;
}

const DEFAULT_CONFIG = {
  platterSize: 85,
  platterTop: 10,
  platterLeft: 7.5,
  tonearmWidth: 45,
  tonearmHeight: 45,
  tonearmTop: 8,
  tonearmRight: 8,
  tonearmPivotX: 15,
  tonearmPivotY: 15,
  tonearmRestAngle: -30,
  tonearmPlayingAngle: 25,
  animationDuration: 2,
  animationEasing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  progressBarHeight: 6,
  progressBarColor: '#dc2626',
  progressBarBackground: 'rgba(220, 38, 38, 0.2)',
  vinylRotationSpeed: 2,
  labelSize: 52,
  scrubEnabled: true,
  scrubSensitivity: 0.1,
  returnTonearmOnScrub: false,
  tonearmReturnDuration: 1,
  showTrackInfo: true,
  autoAdvance: true,
  keyboardShortcuts: true,
};

type PlayerConfig = typeof DEFAULT_CONFIG;

const VinylPlayer: React.FC<VinylPlayerProps> = ({ tracks, labelImageUrl = "/images/record-label.png" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [config, setConfig] = useState<PlayerConfig>(DEFAULT_CONFIG);
  const [durations, setDurations] = useState<{ [key: number]: number }>({});
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const needleDropSoundRef = useRef<HTMLAudioElement | null>(null);
  const runoutSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    needleDropSoundRef.current = new Audio('/audio/needle-drop.wav');
    runoutSoundRef.current = new Audio('/audio/needle-stuck.wav');

    const audio = audioRef.current;
    
    const handleEnded = () => {
      if (config.autoAdvance && currentTrackIndex < tracks.length - 1) {
        handleNext();
      } else {
        playRunoutSound();
        setIsPlaying(false);
        setProgress(0);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDurations(prev => ({
          ...prev,
          [currentTrackIndex]: audio.duration
        }));
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
      cancelAnimationFrame(animationFrameRef.current!);
    };
  }, [currentTrackIndex, tracks.length, config.autoAdvance]);

  useEffect(() => {
    if (!calibrationMode || !config.keyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      const smallStep = 0.1;

      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setConfig(prev => ({ ...prev, platterTop: Math.max(0, prev.platterTop - step) }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setConfig(prev => ({ ...prev, platterTop: Math.min(100, prev.platterTop + step) }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setConfig(prev => ({ ...prev, platterLeft: Math.max(0, prev.platterLeft - step) }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setConfig(prev => ({ ...prev, platterLeft: Math.min(100, prev.platterLeft + step) }));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setConfig(prev => ({ ...prev, platterSize: Math.min(100, prev.platterSize + step) }));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setConfig(prev => ({ ...prev, platterSize: Math.max(10, prev.platterSize - step) }));
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmRight: e.shiftKey ? Math.min(100, prev.tonearmRight + step) : Math.max(0, prev.tonearmRight - step) }));
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmTop: e.shiftKey ? Math.min(100, prev.tonearmTop + step) : Math.max(0, prev.tonearmTop - step) }));
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmWidth: e.shiftKey ? Math.min(100, prev.tonearmWidth + step) : Math.max(10, prev.tonearmWidth - step) }));
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmHeight: e.shiftKey ? Math.min(100, prev.tonearmHeight + step) : Math.max(10, prev.tonearmHeight - step) }));
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmRestAngle: e.shiftKey ? prev.tonearmRestAngle + step : prev.tonearmRestAngle - step }));
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmPlayingAngle: e.shiftKey ? prev.tonearmPlayingAngle + step : prev.tonearmPlayingAngle - step }));
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmPivotX: e.shiftKey ? Math.min(100, prev.tonearmPivotX + step) : Math.max(0, prev.tonearmPivotX - step) }));
          break;
        case 'y':
        case 'Y':
          e.preventDefault();
          setConfig(prev => ({ ...prev, tonearmPivotY: e.shiftKey ? Math.min(100, prev.tonearmPivotY + step) : Math.max(0, prev.tonearmPivotY - step) }));
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          setConfig(prev => ({ ...prev, animationDuration: e.shiftKey ? Math.min(10, prev.animationDuration + smallStep) : Math.max(0.1, prev.animationDuration - smallStep) }));
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          setConfig(prev => ({ ...prev, labelSize: e.shiftKey ? Math.min(100, prev.labelSize + step) : Math.max(10, prev.labelSize - step) }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [calibrationMode, config.keyboardShortcuts]);

  useEffect(() => {
    const loadDurations = async () => {
      const newDurations: { [key: number]: number } = {};
      
      for (let i = 0; i < tracks.length; i++) {
        try {
          const audio = new Audio(tracks[i].audioUrl);
          await new Promise((resolve, reject) => {
            audio.addEventListener('loadedmetadata', () => {
              if (audio.duration && !isNaN(audio.duration)) {
                newDurations[i] = audio.duration;
              }
              resolve(null);
            });
            audio.addEventListener('error', reject);
          });
        } catch (error) {
          console.error(`Error loading duration for track ${i}:`, error);
        }
      }
      
      setDurations(newDurations);
    };

    loadDurations();
  }, [tracks]);

  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && isPlaying && !isScrubbing) {
        const currentTime = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        if (duration && !isNaN(duration)) {
          setProgress((currentTime / duration) * 100);
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isScrubbing]);

  const playNeedleDropSound = () => {
    if (needleDropSoundRef.current) {
      needleDropSoundRef.current.currentTime = 0;
      needleDropSoundRef.current.play().catch(e => console.error('Error playing needle drop sound:', e));
    }
  };

  const playRunoutSound = () => {
    if (runoutSoundRef.current) {
      runoutSoundRef.current.currentTime = 0;
      runoutSoundRef.current.play().catch(e => console.error('Error playing runout sound:', e));
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (audioRef.current.src !== tracks[currentTrackIndex].audioUrl) {
        audioRef.current.src = tracks[currentTrackIndex].audioUrl;
      }
      
      playNeedleDropSound();
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    const wasPlaying = isPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    setCurrentTrackIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : tracks.length - 1;
      return newIndex;
    });
    setProgress(0);
    
    if (wasPlaying) {
      setTimeout(() => handlePlay(), 100);
    }
  };

  const handleNext = () => {
    const wasPlaying = isPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    setCurrentTrackIndex((prev) => {
      const newIndex = prev < tracks.length - 1 ? prev + 1 : 0;
      return newIndex;
    });
    setProgress(0);
    
    if (wasPlaying) {
      setTimeout(() => handlePlay(), 100);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!config.scrubEnabled || !progressBarRef.current || !audioRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * audioRef.current.duration;

    if (!isNaN(newTime)) {
      audioRef.current.currentTime = newTime;
      setProgress(clickPosition * 100);
    }
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!config.scrubEnabled) return;
    setIsScrubbing(true);
    handleProgressBarClick(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isScrubbing || !config.scrubEnabled || !progressBarRef.current || !audioRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPosition = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = clickPosition * audioRef.current.duration;

    if (!isNaN(newTime)) {
      audioRef.current.currentTime = newTime;
      setProgress(clickPosition * 100);
    }
  };

  const handleMouseUp = () => {
    if (isScrubbing) {
      setIsScrubbing(false);
    }
  };

  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isScrubbing]);

  const copyConfig = () => {
    const configString = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configString).then(() => {
      alert('Configuration copied to clipboard!');
    });
  };

  const resetConfig = () => {
    const savedConfig = localStorage.getItem('vinylPlayerConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        alert('Configuration loaded from localStorage!');
      } catch (e) {
        alert('Error loading saved configuration');
      }
    } else {
      alert('No saved configuration found');
    }
  };

  const forceDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    alert('Reset to default configuration');
  };

  useEffect(() => {
    if (calibrationMode) {
      localStorage.setItem('vinylPlayerConfig', JSON.stringify(config));
    }
  }, [config, calibrationMode]);

  const currentTrack = tracks[currentTrackIndex];
  const duration = durations[currentTrackIndex];

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tonearmAngle = isPlaying ? config.tonearmPlayingAngle : config.tonearmRestAngle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        {calibrationMode && (
          <div className="mb-6 p-6 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h3 className="text-yellow-500 font-semibold">Calibration Mode Active</h3>
            </div>
            <div className="space-y-2 text-sm text-yellow-200/80 mb-4">
              <p><strong>Keyboard Shortcuts:</strong></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p>• Arrow Keys: Move platter</p>
                  <p>• +/- : Resize platter</p>
                  <p>• R: Move tonearm right (Shift+R for opposite)</p>
                  <p>• T: Move tonearm top (Shift+T for opposite)</p>
                  <p>• W: Tonearm width (Shift+W to increase)</p>
                  <p>• H: Tonearm height (Shift+H to increase)</p>
                </div>
                <div>
                  <p>• A: Rest angle (Shift+A to increase)</p>
                  <p>• P: Playing angle (Shift+P to increase)</p>
                  <p>• X: Pivot X (Shift+X to increase)</p>
                  <p>• Y: Pivot Y (Shift+Y to increase)</p>
                  <p>• D: Animation duration (Shift+D to increase)</p>
                  <p>• L: Label size (Shift+L to increase)</p>
                </div>
              </div>
              <p className="mt-3"><em>Hold Shift for 5x speed. Changes auto-save to localStorage.</em></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyConfig} size="sm" variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy Config
              </Button>
              <Button onClick={resetConfig} size="sm" variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Load Saved
              </Button>
              <Button onClick={forceDefaults} size="sm" variant="destructive">
                Force Defaults
              </Button>
            </div>
          </div>
        )}

        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 sm:p-12">
          <Button
            onClick={() => setCalibrationMode(!calibrationMode)}
            className="absolute top-4 right-4 z-50"
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <div className="relative w-full" style={{ paddingBottom: '75%' }}>
            <div className="absolute inset-0">
              <img
                src="/images/turntable-base.png"
                alt="Turntable Base"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ zIndex: 1 }}
              />

              <div
                className="absolute rounded-full overflow-hidden shadow-2xl"
                style={{
                  width: `${config.platterSize}%`,
                  height: `${config.platterSize}%`,
                  top: `${config.platterTop}%`,
                  left: `${config.platterLeft}%`,
                  zIndex: 2,
                  boxShadow: calibrationMode ? '0 0 0 2px red' : 'none',
                }}
              >
                <div
                  className={`relative w-full h-full ${isPlaying ? 'animate-spin-slow' : ''}`}
                  style={{
                    animationDuration: `${config.vinylRotationSpeed}s`,
                  }}
                >
                  <img
                    src="/images/vinyl-record.png"
                    alt="Vinyl Record"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ zIndex: 1 }}
                  />
                  
                  <img
                    src={labelImageUrl}
                    alt="Record Label"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                    style={{
                      width: `${config.labelSize}%`,
                      height: `${config.labelSize}%`,
                      zIndex: 2,
                    }}
                  />
                </div>
              </div>

              <div
                className="absolute transition-transform origin-top-left"
                style={{
                  width: `${config.tonearmWidth}%`,
                  height: `${config.tonearmHeight}%`,
                  top: `${config.tonearmTop}%`,
                  right: `${config.tonearmRight}%`,
                  transformOrigin: `${config.tonearmPivotX}% ${config.tonearmPivotY}%`,
                  transform: `rotate(${tonearmAngle}deg)`,
                  transitionDuration: `${config.animationDuration}s`,
                  transitionTimingFunction: config.animationEasing,
                  zIndex: 3,
                  boxShadow: calibrationMode ? '0 0 0 2px blue' : 'none',
                }}
              >
                <img
                  src="/images/tonearm.png"
                  alt="Tonearm"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {isPlaying && (
                  <img
                    src="/images/tonearm-animated.png"
                    alt="Tonearm Animated"
                    className="absolute inset-0 w-full h-full object-contain animate-pulse"
                    style={{
                      animationDuration: '2s',
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>

              <div
                ref={progressBarRef}
                className="absolute bottom-0 left-0 right-0 cursor-pointer"
                style={{
                  height: `${config.progressBarHeight}px`,
                  backgroundColor: config.progressBarBackground,
                  zIndex: 10,
                }}
                onClick={handleProgressBarClick}
                onMouseDown={handleProgressBarMouseDown}
              >
                <div
                  className="h-full transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: config.progressBarColor,
                  }}
                />
              </div>
            </div>
          </div>

          {config.showTrackInfo && (
            <div className="mt-8 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {currentTrack.title}
              </h2>
              <p className="text-gray-400 text-lg mb-1">{currentTrack.artist}</p>
              <p className="text-gray-500 text-sm">
                Track {currentTrackIndex + 1} of {tracks.length}
                {duration && ` • ${formatTime((progress / 100) * duration)} / ${formatTime(duration)}`}
              </p>
            </div>
          )}

          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              onClick={handlePrevious}
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full hover:scale-110 transition-transform"
            >
              <SkipBack className="w-6 h-6" />
            </Button>

            {isPlaying ? (
              <Button
                onClick={handleStop}
                size="icon"
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 hover:scale-110 transition-transform"
              >
                <Pause className="w-8 h-8" />
              </Button>
            ) : (
              <Button
                onClick={handlePlay}
                size="icon"
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 hover:scale-110 transition-transform"
              >
                <Play className="w-8 h-8 ml-1" />
              </Button>
            )}

            <Button
              onClick={handleNext}
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full hover:scale-110 transition-transform"
            >
              <SkipForward className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}</style>
    </div>
  );
};

export default VinylPlayer;
```

---

## 2️⃣ DATA STRUCTURE: playlist.ts

Create `src/data/playlist.ts` with your track information:

```typescript
// This file structure is designed to be easily replaced with database queries
// In the future, this data can come from Supabase or any other database

export interface Track {
  id: number;
  title: string;
  artist: string;
  audioUrl: string;
}

export const playlist: Track[] = [
  {
    id: 1,
    title: "Your First Song Title",
    artist: "Artist Name or Description",
    audioUrl: "/audio/your-song-1.mp3",
  },
  {
    id: 2,
    title: "Your Second Song",
    artist: "Another Artist",
    audioUrl: "/audio/your-song-2.mp3",
  },
  // Add more tracks as needed
];

// Future database integration example:
// export async function fetchPlaylist() {
//   const { data, error } = await supabase
//     .from('tracks')
//     .select('*')
//     .order('id');
//   
//   if (error) throw error;
//   return data;
// }
```

---

## 3️⃣ REQUIRED ASSETS

### Images (place in `/public/images/`)

You'll need these 6 image files:

1. **turntable-base.png** - The main body/chassis of the turntable
2. **vinyl-record.png** - The black vinyl record that spins
3. **tonearm.png** - The static tonearm image
4. **tonearm-animated.png** - Animated overlay for the tonearm (when playing)
5. **record-label.png** - Default center label (optional fallback)
6. **label-cobnet-strange.png** - Your custom center label (or replace with your own)

> **Important:** You need to provide these images OR use placeholder images initially. The component expects these exact file paths.

### Audio Files (place in `/public/audio/`)

**Required Sound Effects:**
1. **needle-drop.wav** - Plays when the needle drops (play starts)
2. **needle-stuck.wav** - Plays when a track ends (runout sound)

**Your Music Tracks:**
- Add your `.mp3` files to `/public/audio/`
- Reference them in `playlist.ts` (e.g., `/audio/your-song.mp3`)

---

## 4️⃣ INSTALLATION STEPS

### Step 1: Create the Component File

Tell Lovable:
> "Create a new file `src/components/VinylPlayer.tsx`"

Then paste the complete component code from **Section 1** above.

### Step 2: Create the Data File

Tell Lovable:
> "Create a new file `src/data/playlist.ts`"

Then paste the data structure from **Section 2** and customize your tracks.

### Step 3: Upload Assets

Tell Lovable:
> "I need to upload image and audio assets to the public folder"

Then upload:
- All 6 image files to `/public/images/`
- 2 sound effect files to `/public/audio/`
- Your music `.mp3` files to `/public/audio/`

### Step 4: Use in Your Page

Add the player to any page (e.g., `src/pages/Index.tsx`):

```tsx
import VinylPlayer from "@/components/VinylPlayer";
import { playlist } from "@/data/playlist";

const Index = () => {
  return (
    <VinylPlayer 
      tracks={playlist} 
      labelImageUrl="/images/label-cobnet-strange.png" 
    />
  );
};

export default Index;
```

---

## 5️⃣ USAGE EXAMPLES

### Basic Usage (Full Page)

```tsx
import VinylPlayer from "@/components/VinylPlayer";
import { playlist } from "@/data/playlist";

function App() {
  return <VinylPlayer tracks={playlist} />;
}
```

### Custom Label Image

```tsx
<VinylPlayer 
  tracks={playlist} 
  labelImageUrl="/images/my-custom-label.png" 
/>
```

### Inline with Other Content

```tsx
function MusicPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">
        My Music Collection
      </h1>
      
      <VinylPlayer 
        tracks={playlist} 
        labelImageUrl="/images/my-label.png" 
      />
      
      <div className="mt-12">
        <p>More content here...</p>
      </div>
    </div>
  );
}
```

### Multiple Players (Different Playlists)

```tsx
import VinylPlayer from "@/components/VinylPlayer";
import { rockPlaylist } from "@/data/rock-playlist";
import { jazzPlaylist } from "@/data/jazz-playlist";

function MultiPlayerPage() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl mb-4">Rock Collection</h2>
        <VinylPlayer tracks={rockPlaylist} labelImageUrl="/images/rock-label.png" />
      </section>
      
      <section>
        <h2 className="text-2xl mb-4">Jazz Collection</h2>
        <VinylPlayer tracks={jazzPlaylist} labelImageUrl="/images/jazz-label.png" />
      </section>
    </div>
  );
}
```

---

## 6️⃣ CUSTOMIZATION GUIDE

### Changing Tracks

Edit `src/data/playlist.ts`:

```typescript
export const playlist: Track[] = [
  {
    id: 1,
    title: "My Awesome Song",
    artist: "My Band Name",
    audioUrl: "/audio/my-song.mp3",
  },
  // Add more tracks...
];
```

### Changing the Center Label

Replace the `labelImageUrl` prop:

```tsx
<VinylPlayer 
  tracks={playlist} 
  labelImageUrl="/images/your-custom-label.png" 
/>
```

**Label Image Tips:**
- Use square PNG images (e.g., 500x500px)
- Transparent background works great
- The label is automatically sized at 52% of the vinyl
- Make it look like a real record label!

### Adjusting Visual Layout (Calibration Mode)

The component includes a built-in **Calibration Mode** for fine-tuning:

1. Click the **Settings icon** (⚙️) in the top-right corner
2. Use keyboard shortcuts to adjust positioning:
   - Arrow keys: Move platter
   - +/- : Resize platter
   - R, T, W, H: Adjust tonearm position and size
   - A, P: Adjust tonearm angles
   - L: Adjust label size
3. Changes auto-save to localStorage
4. Click "Copy Config" to export your settings
5. Apply custom config by editing `DEFAULT_CONFIG` in the component

### Styling the Container

The player has a dark gradient background by default. To customize:

**Option A: Edit the component** (line 620 in VinylPlayer.tsx):
```tsx
<div className="min-h-screen bg-gradient-to-br from-your-color via-your-color to-your-color...">
```

**Option B: Wrap it in a custom container**:
```tsx
<div className="bg-white p-8">
  <VinylPlayer tracks={playlist} labelImageUrl="/images/label.png" />
</div>
```

### Disabling Features

Edit the `DEFAULT_CONFIG` object in `VinylPlayer.tsx`:

```typescript
const DEFAULT_CONFIG = {
  // ... other settings
  scrubEnabled: false,           // Disable progress bar scrubbing
  showTrackInfo: false,          // Hide track title/artist
  autoAdvance: false,            // Don't auto-play next track
  keyboardShortcuts: false,      // Disable calibration keyboard shortcuts
};
```

---

## 7️⃣ TROUBLESHOOTING

### Audio Not Playing
- Check file paths in `playlist.ts` match actual files in `/public/audio/`
- Ensure audio files are `.mp3` format
- Check browser console for loading errors

### Images Not Showing
- Verify all image files are in `/public/images/`
- Check file names match exactly (case-sensitive)
- Ensure images are `.png` format

### Layout Issues
- Enable **Calibration Mode** (⚙️ button)
- Use keyboard shortcuts to adjust positioning
- Copy the config and paste into `DEFAULT_CONFIG`

### Tonearm Not Animating
- Check that `tonearmPlayingAngle` is different from `tonearmRestAngle`
- Verify `animationDuration` is set (default: 2 seconds)
- Look for CSS conflicts with transitions

---

## 8️⃣ ADVANCED FEATURES

### Dynamic Playlists (from API/Database)

```typescript
// Instead of static playlist, fetch from API
import { useEffect, useState } from "react";

function MyPage() {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => setTracks(data));
  }, []);

  if (!tracks.length) return <div>Loading...</div>;

  return <VinylPlayer tracks={tracks} labelImageUrl="/images/label.png" />;
}
```

### Supabase Integration

```typescript
// src/data/playlist.ts
import { supabase } from '@/lib/supabase';

export async function fetchPlaylist() {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('id');
  
  if (error) throw error;
  return data;
}
```

Then in your page component:

```tsx
import { useEffect, useState } from "react";
import { fetchPlaylist } from "@/data/playlist";
import VinylPlayer from "@/components/VinylPlayer";

function Index() {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    fetchPlaylist().then(setTracks);
  }, []);

  return tracks.length > 0 ? (
    <VinylPlayer tracks={tracks} labelImageUrl="/images/label.png" />
  ) : (
    <div>Loading tracks...</div>
  );
}
```

---

## 9️⃣ LOVABLE PROMPT TEMPLATE

Copy this entire message when adding VinylPlayer to a new Lovable project:

---

**PROMPT START:**

I want to add a vintage vinyl record player component to my project. I have the complete component code ready.

**Step 1:** Create `src/components/VinylPlayer.tsx` with this code:

[Paste complete VinylPlayer.tsx code from Section 1]

**Step 2:** Create `src/data/playlist.ts` with this code:

[Paste playlist.ts template from Section 2]

**Step 3:** I'll upload these assets to the public folder:
- Images to `/public/images/`: turntable-base.png, vinyl-record.png, tonearm.png, tonearm-animated.png, my-custom-label.png
- Audio to `/public/audio/`: needle-drop.wav, needle-stuck.wav, and my music .mp3 files

**Step 4:** Update my Index page to use the player:

```tsx
import VinylPlayer from "@/components/VinylPlayer";
import { playlist } from "@/data/playlist";

const Index = () => {
  return <VinylPlayer tracks={playlist} labelImageUrl="/images/my-custom-label.png" />;
};

export default Index;
```

Please confirm all files are created correctly and the component is ready to use!

**PROMPT END**

---

## 🎨 DESIGN NOTES

- The player is fully responsive and works on mobile/tablet/desktop
- Dark theme by default with gradient backgrounds
- Smooth animations and transitions
- Realistic vinyl spinning effect
- Interactive progress bar for seeking
- Keyboard shortcuts in calibration mode
- Auto-saves calibration settings to localStorage

---

## 📝 CREDITS & LICENSE

This component was created as a reusable Lovable component. Feel free to customize and use in your projects!

---

## 🆘 NEED HELP?

If you encounter issues:
1. Enable Calibration Mode to adjust visual positioning
2. Check browser console for error messages
3. Verify all file paths match your uploaded assets
4. Ensure audio files are valid .mp3 format
5. Test with a single track first before adding full playlist

---

**End of Installation Guide**

Save this document and use it whenever you want to add the VinylPlayer to a new Lovable project!
