import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play, Square, SkipBack, SkipForward, Upload, Copy, RotateCcw, Rewind, FastForward } from "lucide-react";
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
  labelImageUrl?: string; // Optional custom center label for vinyl record
}

// Centralized configuration for all visual elements
const DEFAULT_CONFIG = {
  configVersion: 8,
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
  tonearmSpeed: {
    playMs: 1800,
    stopMs: 1200,
    playEasing: 'ease-out',
    stopEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  vinylSpeed: 5, // seconds per rotation
  scrubbing: {
    enabled: true,
    showHandle: true,
    scratchSoundsEnabled: true,
    skipSeconds: 10,
  },
};

const STORAGE_KEY = 'vinyl-player-config-v8';

// No need for synthetic sound generators - using real audio files

const VinylPlayer = ({ tracks, labelImageUrl = '/images/label-cobnet-strange.png' }: VinylPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const [isInitialPlay, setIsInitialPlay] = useState(true); // Track if this is the very first play
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_CONFIG.base.aspectRatio);
  const [trackDurations, setTrackDurations] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isLastTrackFinished, setIsLastTrackFinished] = useState(false);
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
  const [adjustTarget, setAdjustTarget] = useState<'platter' | 'tonearm' | 'pivot' | 'angles' | 'tonearm-speed-play' | 'tonearm-speed-stop' | 'vinyl'>('platter');
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const baseImageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const needleDropSoundRef = useRef<HTMLAudioElement | null>(null);
  const runoutSoundRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks[currentTrackIndex];

  // Initialize audio effects
  useEffect(() => {
    try {
      // Initialize needle drop sound (plays when tonearm drops)
      const needleDropAudio = new Audio('/audio/needle-drop.wav');
      needleDropAudio.volume = 0.6;
      needleDropAudio.preload = 'auto';
      needleDropSoundRef.current = needleDropAudio;
      
      // Initialize runout sound (plays once after last track ends, then tonearm returns)
      const runoutAudio = new Audio('/audio/needle-stuck.wav');
      runoutAudio.volume = 0.5;
      runoutAudio.loop = false;
      runoutAudio.preload = 'auto';
      // When needle-stuck sound finishes, wait a moment then return tonearm to rest
      runoutAudio.onended = () => {
        setTimeout(() => {
          setIsLastTrackFinished(false);
          setIsPlaying(false);
        }, 250);
      };
      runoutSoundRef.current = runoutAudio;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, []);

  const playNeedleDropSound = useCallback(() => {
    if (!config.scrubbing.scratchSoundsEnabled || !needleDropSoundRef.current) return;
    
    try {
      needleDropSoundRef.current.currentTime = 0;
      needleDropSoundRef.current.play().catch(error => {
        console.error('Failed to play needle drop sound:', error);
      });
    } catch (error) {
      console.error('Failed to play needle drop sound:', error);
    }
  }, [config.scrubbing.scratchSoundsEnabled]);

  const playRunoutSound = useCallback(() => {
    if (!config.scrubbing.scratchSoundsEnabled || !runoutSoundRef.current) return;
    
    try {
      runoutSoundRef.current.currentTime = 0;
      runoutSoundRef.current.play().catch(error => {
        console.error('Failed to play runout sound:', error);
      });
    } catch (error) {
      console.error('Failed to play runout sound:', error);
    }
  }, [config.scrubbing.scratchSoundsEnabled]);

  const stopRunoutSound = useCallback(() => {
    if (runoutSoundRef.current) {
      try {
        runoutSoundRef.current.pause();
        runoutSoundRef.current.currentTime = 0;
      } catch (error) {
        console.error('Failed to stop runout sound:', error);
      }
    }
  }, []);

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
        localStorage.removeItem('vinyl-player-config-v2');
        localStorage.removeItem('vinyl-player-config-v6');
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setConfig(DEFAULT_CONFIG);
      console.log('Config reset to defaults');
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
          const targets: typeof adjustTarget[] = ['platter', 'tonearm', 'pivot', 'angles', 'tonearm-speed-play', 'tonearm-speed-stop', 'vinyl'];
          const currentIndex = targets.indexOf(adjustTarget);
          setAdjustTarget(targets[(currentIndex + 1) % targets.length]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const stepLeft = e.shiftKey ? 200 : e.altKey ? 10 : 50;
          if (adjustTarget === 'platter') updated.platter.leftPct = Math.max(0, updated.platter.leftPct - step);
          if (adjustTarget === 'tonearm') updated.tonearm.rightPct = Math.max(0, updated.tonearm.rightPct + step);
          if (adjustTarget === 'pivot') updated.tonearm.pivotXPct = Math.max(0, updated.tonearm.pivotXPct - step);
          if (adjustTarget === 'angles') updated.angles.REST -= step;
          if (adjustTarget === 'tonearm-speed-play') updated.tonearmSpeed.playMs = Math.max(100, updated.tonearmSpeed.playMs - stepLeft);
          if (adjustTarget === 'tonearm-speed-stop') updated.tonearmSpeed.stopMs = Math.max(100, updated.tonearmSpeed.stopMs - stepLeft);
          if (adjustTarget === 'vinyl') updated.vinylSpeed = Math.max(1, updated.vinylSpeed - step);
          break;
        case 'ArrowRight':
          e.preventDefault();
          const stepRight = e.shiftKey ? 200 : e.altKey ? 10 : 50;
          if (adjustTarget === 'platter') updated.platter.leftPct = Math.min(100, updated.platter.leftPct + step);
          if (adjustTarget === 'tonearm') updated.tonearm.rightPct = Math.max(0, updated.tonearm.rightPct - step);
          if (adjustTarget === 'pivot') updated.tonearm.pivotXPct = Math.min(100, updated.tonearm.pivotXPct + step);
          if (adjustTarget === 'angles') updated.angles.REST += step;
          if (adjustTarget === 'tonearm-speed-play') updated.tonearmSpeed.playMs = Math.min(5000, updated.tonearmSpeed.playMs + stepRight);
          if (adjustTarget === 'tonearm-speed-stop') updated.tonearmSpeed.stopMs = Math.min(5000, updated.tonearmSpeed.stopMs + stepRight);
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
      localStorage.removeItem('vinyl-player-config-v6');
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
      // Check if this is the last track
      if (currentTrackIndex === tracks.length - 1) {
        // Last track finished - play runout sound (keep tonearm in place until sound finishes)
        setIsLastTrackFinished(true);
        playRunoutSound();
      } else {
        // Auto-advance to next track WITH playback sequence
        setCurrentTrackIndex(currentTrackIndex + 1);
        setIsStartingPlayback(true);
      }
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
    
    // Don't auto-play here - let the play sequence handle it with proper tonearm animation
    // The handleNext/handlePrevious will set isStartingPlayback if needed
  }, [currentTrackIndex]);

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Stop runout sound if it's playing
    if (isLastTrackFinished) {
      stopRunoutSound();
      setIsLastTrackFinished(false);
    }
    
    // Set flags to trigger tonearm animation and delayed audio playback
    setIsStartingPlayback(true);
    setIsPlaying(true); // Start vinyl spinning immediately
  };

  const handleStop = () => {
    stopRunoutSound();
    setIsLastTrackFinished(false);
    setIsPlaying(false);
    setIsInitialPlay(true); // Reset so next play simulates placing needle again
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
      // If was playing, trigger tonearm animation to new track
      if (wasPlaying) {
        setIsStartingPlayback(true);
      } else {
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
    // If was playing, trigger tonearm animation to new track
    if (wasPlaying) {
      setIsStartingPlayback(true);
    } else {
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

  // Handle delayed audio playback when starting or changing tracks
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isStartingPlayback || !isPlaying) return;

    // Stop current playback and reset
    audio.pause();
    
    // Wait for tonearm animation, then play needle drop and start track
    const playTimer = setTimeout(() => {
      // Only play needle drop sound for the very first play (simulating initial needle placement)
      if (isInitialPlay) {
        playNeedleDropSound();
        setIsInitialPlay(false); // Mark that we've done the initial play
      }
      audio.play().catch((error) => {
        console.error('Playback failed during track change:', error);
        setIsPlaying(false);
        setIsStartingPlayback(false);
      });
    }, config.tonearmSpeed.playMs);

    // Reset flag after animation completes
    const resetTimer = setTimeout(() => {
      setIsStartingPlayback(false);
    }, config.tonearmSpeed.playMs);

    return () => {
      clearTimeout(playTimer);
      clearTimeout(resetTimer);
    };
  }, [isStartingPlayback, isPlaying, currentTrackIndex, config.tonearmSpeed.playMs, playNeedleDropSound]);

  // Calculate tonearm rotation based on global fraction
  const getTonearmRotation = () => {
    const audio = audioRef.current;
    
    // When not playing, tonearm returns to REST position
    if (!isPlaying) {
      return config.angles.REST;
    }
    
    // If just starting playback, use the track's start position
    if (isStartingPlayback) {
      if (currentTrackIndex === 0) {
        return config.angles.START; // 14.0°
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

  // Progress bar interaction handlers
  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!config.scrubbing.enabled || !progressBarRef.current) return;
    
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * audio.duration;
    
    audio.currentTime = newTime;
    setProgress(percentage * 100);
  }, [config.scrubbing.enabled]);

  const handleProgressBarMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
    setHoverTime(percentage * audio.duration);
  }, []);

  const handleProgressBarMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleScrubberMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    
    const audio = audioRef.current;
    const wasPlaying = isPlaying;
    
    if (wasPlaying) {
      audio?.pause();
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current || !audio || !audio.duration) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      const newTime = percentage * audio.duration;
      
      audio.currentTime = newTime;
      setProgress(percentage * 100);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      if (wasPlaying) {
        audio?.play();
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isPlaying]);

  const handleSkipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - config.scrubbing.skipSeconds);
  }, [config.scrubbing.skipSeconds]);

  const handleSkipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + config.scrubbing.skipSeconds);
  }, [config.scrubbing.skipSeconds]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug tonearm transition timing
  useEffect(() => {
    const transition = isStartingPlayback 
      ? `${config.tonearmSpeed.playMs}ms ${config.tonearmSpeed.playEasing}` 
      : `${config.tonearmSpeed.stopMs}ms ${config.tonearmSpeed.stopEasing}`;
    console.debug(`Tonearm transition: ${transition}, isStarting: ${isStartingPlayback}, isPlaying: ${isPlaying}`);
  }, [isStartingPlayback, isPlaying, config.tonearmSpeed]);

  return (
    <div 
      className="vinyl-player-root"
      style={{
        all: 'unset',
        display: 'block',
        position: 'relative',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        aspectRatio: aspectRatio.toString(),
        containerType: 'inline-size',
        // CSS custom properties for positioning
        '--platter-left': config.platter.leftPct,
        '--platter-top': config.platter.topPct,
        '--platter-size': config.platter.sizePct,
        '--tonearm-right': config.tonearm.rightPct,
        '--tonearm-top': config.tonearm.topPct,
        '--tonearm-width': config.tonearm.widthPct,
        '--tonearm-pivot-x': config.tonearm.pivotXPct,
        '--tonearm-pivot-y': config.tonearm.pivotYPct,
      } as React.CSSProperties}
    >
      <div className="vinyl-player-container animate-fade-in" style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '1rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Main Turntable Base */}
        <div className="vinyl-player-base" style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Background - Turntable base with full scene */}
          <img 
            ref={baseImageRef}
            src="/images/turntable-base.png"
            alt="Turntable"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
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
              style={{
                position: 'absolute',
                inset: '0',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                zIndex: 5, 
                opacity: referenceOpacity / 100,
                mixBlendMode: 'normal',
              }}
            />
          )}

          {/* Vinyl Record - positioned over the platter */}
          <div 
            style={{
              position: 'absolute',
              left: 'calc(var(--platter-left) * 1%)',
              top: 'calc(var(--platter-top) * 1%)',
              width: 'calc(var(--platter-size) * 1%)',
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
              {/* Base vinyl disc */}
              <img
                src="/images/vinyl-record.png"
                alt="Vinyl Record"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
              {/* Center label overlay */}
              <img
                src={labelImageUrl}
                alt="Record Label"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '52%',
                  height: '52%',
                  objectFit: 'contain',
                  zIndex: 2,
                }}
              />
            </div>
          </div>

          {/* Glow effect when playing */}
          {isPlaying && (
            <div 
              style={{
                position: 'absolute',
                left: 'calc(var(--platter-left) * 1%)',
                top: 'calc(var(--platter-top) * 1%)',
                width: 'calc(var(--platter-size) * 1%)',
                height: 'calc(var(--platter-size) * 1%)',
                borderRadius: '50%',
                backgroundColor: 'hsl(var(--accent) / 0.1)',
                filter: 'blur(2rem)',
                pointerEvents: 'none',
                zIndex: 1,
                animation: 'glow-pulse 2s ease-in-out infinite',
              }}
            />
          )}

          {/* Tonearm - animated using the standalone tonearm image */}
          <div
            style={{
              position: 'absolute',
              right: 'calc(var(--tonearm-right) * 1%)',
              top: 'calc(var(--tonearm-top) * 1%)',
              width: 'calc(var(--tonearm-width) * 1%)',
              transformOrigin: `calc(var(--tonearm-pivot-x) * 1%) calc(var(--tonearm-pivot-y) * 1%)`,
              transform: `rotate(${tonearmRotation}deg)`,
              transition: isStartingPlayback 
                ? `transform ${config.tonearmSpeed.playMs}ms ${config.tonearmSpeed.playEasing}` 
                : `transform ${config.tonearmSpeed.stopMs}ms ${config.tonearmSpeed.stopEasing}`,
              zIndex: 3,
            }}
          >
            <img
              src="/images/tonearm-animated.png"
              alt="Tonearm"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.5))',
                transform: `scaleY(${config.tonearm.lengthScale})`,
                transformOrigin: `calc(var(--tonearm-pivot-x) * 1%) calc(var(--tonearm-pivot-y) * 1%)`,
              }}
            />
          </div>

          {/* Calibration Mode Overlay */}
          {calibrationMode && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
              {/* Platter Ring */}
              <div
                style={{
                  position: 'absolute',
                  left: 'calc(var(--platter-left) * 1%)',
                  top: 'calc(var(--platter-top) * 1%)',
                  width: 'calc(var(--platter-size) * 1%)',
                  height: 'calc(var(--platter-size) * 1%)',
                  border: '2px solid rgb(250, 204, 21)',
                  borderRadius: '50%',
                }}
              />
              
              {/* Tonearm Pivot Crosshair */}
              <div
                style={{
                  position: 'absolute',
                  right: 'calc(var(--tonearm-right) * 1%)',
                  top: 'calc(var(--tonearm-top) * 1%)',
                  width: 'calc(var(--tonearm-width) * 1%)',
                  aspectRatio: 'auto',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 'calc(var(--tonearm-pivot-x) * 1%)',
                    top: 'calc(var(--tonearm-pivot-y) * 1%)',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div style={{ width: '2rem', height: '0.125rem', backgroundColor: 'rgb(239, 68, 68)', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                  <div style={{ width: '0.125rem', height: '2rem', backgroundColor: 'rgb(239, 68, 68)', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                  <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', border: '2px solid rgb(239, 68, 68)', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                </div>
              </div>

              {/* Control Panel */}
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                pointerEvents: 'auto',
                maxWidth: '28rem',
              }}>
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
                  <div className={adjustTarget === 'tonearm-speed-play' ? 'text-yellow-400 font-bold' : ''}>
                    Tonearm Play: {config.tonearmSpeed.playMs}ms ({config.tonearmSpeed.playEasing})
                  </div>
                  <div className={adjustTarget === 'tonearm-speed-stop' ? 'text-yellow-400 font-bold' : ''}>
                    Tonearm Stop: {config.tonearmSpeed.stopMs}ms ({config.tonearmSpeed.stopEasing})
                  </div>
                  <div className={adjustTarget === 'vinyl' ? 'text-yellow-400 font-bold' : ''}>
                    Vinyl Speed: {config.vinylSpeed.toFixed(1)}s per rotation
                  </div>
                </div>

                <div className="mb-3 text-[10px] space-y-1 text-gray-300">
                  <div>Tab: Switch target ({adjustTarget})</div>
                  <div>Arrows: Move/Adjust (Shift=1.0/200ms, Alt=0.02/10ms)</div>
                  <div>[ ]: Tonearm Length/Size/END angle</div>
                  <div>+/-: Tonearm Width</div>
                  <div>Tonearm Speed: Left/Right (Shift=200ms, Alt=10ms, default=50ms)</div>
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
        </div> {/* End vinyl-player-base */}

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
            <div className="relative">
              <div 
                ref={progressBarRef}
                className={cn(
                  "h-3 w-full overflow-visible rounded-full bg-muted relative group",
                  config.scrubbing.enabled && "cursor-pointer"
                )}
                onClick={handleProgressBarClick}
                onMouseMove={handleProgressBarMouseMove}
                onMouseLeave={handleProgressBarMouseLeave}
              >
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
                
                {/* Scrubber Handle */}
                {config.scrubbing.showHandle && (
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full shadow-lg transition-transform",
                      "group-hover:scale-125",
                      isDragging && "scale-150 shadow-xl"
                    )}
                    style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
                    onMouseDown={handleScrubberMouseDown}
                  />
                )}
                
                {/* Hover Time Tooltip */}
                {hoverTime !== null && !isDragging && (
                  <div
                    className="absolute -top-8 bg-popover text-popover-foreground px-2 py-1 rounded text-xs pointer-events-none"
                    style={{ left: `${(hoverTime / (audioRef.current?.duration || 1)) * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>
              
              {/* Time Display */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{formatTime((audioRef.current?.currentTime || 0))}</span>
                <span>{formatTime((audioRef.current?.duration || 0))}</span>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBackward}
              className="h-10 w-10 rounded-full transition-all hover:scale-110 active:scale-95"
              aria-label="Skip backward 10 seconds"
            >
              <Rewind className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={handlePrevious}
              className="h-12 w-12 rounded-full transition-all hover:scale-110 active:scale-95"
              aria-label="Previous track"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {!isPlaying ? (
              <Button
                size="icon"
                onClick={handlePlay}
                className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 shadow-lg"
                aria-label="Play"
              >
                <Play className="h-7 w-7 translate-x-0.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleStop}
                className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 shadow-lg"
                aria-label="Stop"
              >
                <Square className="h-7 w-7" />
              </Button>
            )}

            <Button
              variant="secondary"
              size="icon"
              onClick={handleNext}
              className="h-12 w-12 rounded-full transition-all hover:scale-110 active:scale-95"
              aria-label="Next track"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              className="h-10 w-10 rounded-full transition-all hover:scale-110 active:scale-95"
              aria-label="Skip forward 10 seconds"
            >
              <FastForward className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Runout indicator */}
          {isLastTrackFinished && (
            <div className="mt-4 text-center text-sm text-muted-foreground animate-pulse">
              End of record - Click play to restart
            </div>
          )}

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
      </div> {/* End vinyl-player-container */}
    </div> {/* End vinyl-player-root */}
  );
};

export default VinylPlayer;
