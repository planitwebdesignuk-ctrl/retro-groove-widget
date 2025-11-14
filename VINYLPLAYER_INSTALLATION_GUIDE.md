# VinylPlayer - Full-Stack Installation Guide

This guide contains everything you need to add the VinylPlayer component with complete backend management to any Lovable project.

---

## 📦 What You'll Get

### Frontend Features
A fully functional vintage vinyl record player with:
- Spinning vinyl record animation
- Animated tonearm with realistic movement
- Needle drop and runout sound effects
- Visual progress bar with scrubbing
- Previous/Next track navigation
- Play/Stop controls
- Customizable center label
- Built-in calibration mode for fine-tuning
- Dynamic track loading from database
- Mobile-responsive design

### Backend Features (Lovable Cloud)
A complete full-stack music management system with:
- **Database**: Tracks storage with metadata (title, artist, audio URL)
- **Authentication**: Secure admin-only login system
- **File Storage**: MP3 file upload to cloud storage
- **Admin Dashboard**: Full CRUD operations for track management
- **Label Images Management**: Upload, activate, and manage multiple vinyl label images
- **Role-Based Access Control**: Separate user roles table with admin privileges
- **Security**: Row-Level Security (RLS) policies on all tables
- **Dynamic Features**: 
  - Single file upload with metadata extraction
  - Bulk folder upload (multiple MP3s at once)
  - Multi-select file upload
  - Automatic metadata extraction from MP3 tags
  - Real-time UI updates with React Query
  - Track reordering
  - Dynamic label image switching

---

## 🚀 Quick Start

### For New Projects

When creating a new Lovable project, say:

> "I want to create a full-stack vinyl record player with admin dashboard. I'll provide the complete setup including component code, database schema, and backend configuration."

### For Existing Projects

> "I want to add a vinyl player component with database storage and admin management to my existing project."

---

## 📋 Prerequisites

### Required
- **Lovable Cloud** (or Supabase connection) - Required for backend features
- React 18+
- TypeScript
- Lucide React (for icons)
- Tailwind CSS
- TanStack React Query (for data fetching)
- `music-metadata-browser` package (for MP3 metadata extraction)

### Already Included in Lovable
Most dependencies come pre-installed. You'll only need to add:
```bash
music-metadata-browser
```

---

## 📁 Complete File Structure

```
src/
  components/
    VinylPlayer.tsx              # Main player component
    ui/                          # shadcn/ui components (pre-installed)
  hooks/
    useAuth.ts                   # Authentication hook
    useUserRole.ts               # Role checking hook  
    useTracks.ts                 # Track data management hook
    useLabelImages.ts            # Label images management hook
  pages/
    Index.tsx                    # Public player page
    Auth.tsx                     # Admin login page
    Admin.tsx                    # Admin dashboard page
    NotFound.tsx                 # 404 page
  utils/
    mp3Metadata.ts               # MP3 metadata extraction utility
  integrations/
    supabase/
      client.ts                  # Auto-generated Supabase client
      types.ts                   # Auto-generated database types
  App.tsx                        # Main app with routing

public/
  images/
    turntable-base.png           # Main turntable body (must have clean, light center spindle)
    vinyl-record.png             # The spinning record (MUST have transparent center hole)
    Tonearm.png                  # Tonearm with transparent background
    label-blank-template.png     # Default fallback label
    label-cobnet-strange.png     # Example center label
  audio/
    needle-drop.wav              # Play start sound effect
    needle-stuck.wav             # Track end sound effect

supabase/
  migrations/                    # Database migrations (auto-managed)
```

---

## 🗄️ Database Schema

### Tables

#### `tracks` table
Stores all music track information:

```sql
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  audio_url text not null,
  order_index integer not null default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.tracks enable row level security;

-- Policies
create policy "Anyone can view tracks"
  on public.tracks for select
  using (true);

create policy "Admins can insert tracks"
  on public.tracks for insert
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update tracks"
  on public.tracks for update
  using (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete tracks"
  on public.tracks for delete
  using (public.has_role(auth.uid(), 'admin'::app_role));
```

#### `user_roles` table
Manages admin privileges:

```sql
-- Create role enum
create type public.app_role as enum ('admin', 'user');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policy
create policy "Users can view their own roles"
  on public.user_roles for select
  using (user_id = auth.uid());

-- Security definer function to check roles (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- CRITICAL: Automatic role assignment for new users
-- This trigger ensures new signups get the 'user' role automatically
-- Without this, users won't be able to access the application
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  return new;
end;
$$;

-- Trigger that fires when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: Fix existing users who don't have roles yet
-- Run this if you've already created users before adding the trigger
-- insert into public.user_roles (user_id, role)
-- select id, 'user'::app_role
-- from auth.users
-- where id not in (select user_id from public.user_roles);
```

#### `label_images` table
Manages multiple label images with active selection:

```sql
create table public.label_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  is_active boolean default false,
  uploaded_by uuid references auth.users(id) on delete cascade,
  file_size bigint,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.label_images enable row level security;

-- Policies
create policy "Anyone can view label images"
  on public.label_images for select
  using (true);

create policy "Admins can insert label images"
  on public.label_images for insert
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update label images"
  on public.label_images for update
  using (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete label images"
  on public.label_images for delete
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger to ensure only one label is active at a time
create or replace function public.ensure_single_active_label()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_active = true then
    update label_images set is_active = false where id != NEW.id and is_active = true;
  end if;
  return NEW;
end;
$$;

create trigger single_active_label_trigger
  before insert or update on public.label_images
  for each row
  execute function public.ensure_single_active_label();
```

### Storage Buckets

#### `tracks` bucket
Stores MP3 audio files:

```sql
-- Create bucket
insert into storage.buckets (id, name, public)
values ('tracks', 'tracks', true);

-- Storage policies
create policy "Anyone can view track files"
  on storage.objects for select
  using (bucket_id = 'tracks');

create policy "Admins can upload track files"
  on storage.objects for insert
  with check (
    bucket_id = 'tracks' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Admins can delete track files"
  on storage.objects for delete
  using (
    bucket_id = 'tracks' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );
```

#### `label-images` bucket
Stores label image files:

```sql
-- Create bucket
insert into storage.buckets (id, name, public)
values ('label-images', 'label-images', true);

-- Storage policies
create policy "Anyone can view label images"
  on storage.objects for select
  using (bucket_id = 'label-images');

create policy "Admins can upload label images"
  on storage.objects for insert
  with check (
    bucket_id = 'label-images' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Admins can delete label images"
  on storage.objects for delete
  using (
    bucket_id = 'label-images' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );
```

---

## 🔧 Installation Steps

### Step 1: Set Up Backend (Database & Storage)

If using **Lovable Cloud**, run this migration:

```sql
-- Create role enum
create type public.app_role as enum ('admin', 'user');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can view their own roles"
  on public.user_roles for select
  using (user_id = auth.uid());

-- Security definer function
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Create tracks table
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  audio_url text not null,
  order_index integer not null default 0,
  user_id uuid,
  created_at timestamptz default now()
);

alter table public.tracks enable row level security;

create policy "Anyone can view tracks"
  on public.tracks for select
  using (true);

create policy "Admins can insert tracks"
  on public.tracks for insert
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update tracks"
  on public.tracks for update
  using (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete tracks"
  on public.tracks for delete
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket
insert into storage.buckets (id, name, public)
values ('tracks', 'tracks', true);

-- Storage policies
create policy "Anyone can view track files"
  on storage.objects for select
  using (bucket_id = 'tracks');

create policy "Admins can upload track files"
  on storage.objects for insert
  with check (
    bucket_id = 'tracks' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Admins can delete track files"
  on storage.objects for delete
  using (
    bucket_id = 'tracks' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Create label-images storage bucket
inse rt into storage.buckets (id, name, public)
values ('label-images', 'label-images', true);

create policy "Anyone can view label images"
  on storage.objects for select
  using (bucket_id = 'label-images');

create policy "Admins can upload label images"
  on storage.objects for insert
  with check (
    bucket_id = 'label-images' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Admins can delete label images"
  on storage.objects for delete
  using (
    bucket_id = 'label-images' and
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Create label_images table
create table public.label_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  is_active boolean default false,
  uploaded_by uuid references auth.users(id) on delete cascade,
  file_size bigint,
  created_at timestamptz default now()
);

alter table public.label_images enable row level security;

create policy "Anyone can view label images"
  on public.label_images for select
  using (true);

create policy "Admins can insert label images"
  on public.label_images for insert
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update label images"
  on public.label_images for update
  using (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete label images"
  on public.label_images for delete
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger function for single active label
create or replace function public.ensure_single_active_label()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_active = true then
    update label_images set is_active = false where id != NEW.id and is_active = true;
  end if;
  return NEW;
end;
$$;

create trigger single_active_label_trigger
  before insert or update on public.label_images
  for each row
  execute function public.ensure_single_active_label();
```

### Step 2: Create Your First Admin User

After running the migration, you need to create an admin user:

1. Navigate to `/auth` in your app
2. The first time, you'll need to manually sign up (or ask AI to temporarily enable signup)
3. After creating your account, run this SQL to grant admin access:

```sql
-- Replace 'your-user-id-here' with your actual user ID from auth.users
insert into public.user_roles (user_id, role)
values ('your-user-id-here', 'admin');
```

**To find your user ID:**
```sql
select id, email from auth.users;
```

### Step 3: Add Required Dependencies

```bash
# If not already installed
music-metadata-browser
```

### Step 4: Create Component Files

Create these files in your project (see code sections below):

1. `src/components/VinylPlayer.tsx` - Main player component
2. `src/hooks/useAuth.ts` - Authentication hook
3. `src/hooks/useUserRole.ts` - Role checking hook
4. `src/hooks/useTracks.ts` - Track data hook
5. `src/hooks/useLabelImages.ts` - Label images management hook
6. `src/utils/mp3Metadata.ts` - Metadata extraction utility
7. `src/pages/Index.tsx` - Public player page
8. `src/pages/Auth.tsx` - Admin login page
9. `src/pages/Admin.tsx` - Admin dashboard
10. Update `src/App.tsx` - Add routes

### Step 5: Upload Required Assets

Upload these files to the `public/` directory:

**Images:**
- `public/images/turntable-base.png` - Main turntable body
- `public/images/vinyl-record.png` - The spinning record (MUST have transparent center hole)
- `public/images/Tonearm.png` - Tonearm with transparent background
- `public/images/label-blank-template.png` - Default label (fallback)
- `public/images/label-cobnet-strange.png` - Example label (optional)

**Audio:**
- `public/audio/needle-drop.wav`
- `public/audio/needle-stuck.wav`

**CRITICAL Image Requirements:**

⚠️ **The vinyl player uses a 3-layer image stacking system:**
1. Bottom layer: `turntable-base.png` (turntable body with center spindle)
2. Middle layer: `vinyl-record.png` (the spinning vinyl disc)
3. Top layer: label image (center label artwork)

**Requirements to avoid dark spots/artifacts:**

1. **`vinyl-record.png` - MUST have a transparent center hole:**
   - The center area where the label sits must be **fully transparent** (alpha channel = 0%)
   - NOT white, gray, or black - actual transparency
   - Without this, you'll see a solid spot blocking the label
   - Use an image editor (Photoshop, GIMP, etc.) to verify the alpha channel

2. **`turntable-base.png` - Should have a clean, light-colored center spindle:**
   - Avoid dark/black pixels in the center spindle area
   - Dark colors "bleed through" transparent areas of vinyl and label
   - Creates unwanted dark artifacts if not properly cleaned
   - Use a light-colored or white spindle for best results

3. **Label images - Can have transparent centers (optional):**
   - Transparent centers show the turntable spindle (vintage vinyl aesthetic)
   - Solid centers completely cover the spindle area (modern look)
   - Both are supported - choose based on your design preference

---

## 💻 Component Code

### 1. VinylPlayer Component

`src/components/VinylPlayer.tsx`:

```tsx
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Settings, Copy, RotateCcw, AlertCircle } from "lucide-react";

interface Track {
  id: number;      // Sequential ID for UI display (1, 2, 3...)
  dbId: string;    // UUID from database for backend operations
  title: string;
  artist: string;
  audioUrl: string;
}

interface VinylPlayerProps {
  tracks: Track[];
  labelImageUrl?: string;
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

  const currentTrack = tracks[currentTrackIndex];
  const duration = durations[currentTrackIndex];

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tonearmAngle = isPlaying ? config.tonearmPlayingAngle : config.tonearmRestAngle;

  if (!tracks || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-xl mb-2">No tracks available</p>
          <p className="text-sm text-gray-400">Please add some tracks to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        {/* Turntable container */}
        <div className="relative w-full aspect-square max-w-2xl mx-auto">
          {/* Turntable base */}
          <img
            src="/images/turntable-base.png"
            alt="Turntable"
            className="absolute inset-0 w-full h-full object-contain z-0"
          />

          {/* Vinyl record (rotating platter) */}
          <div
            className="absolute"
            style={{
              width: `${config.platterSize}%`,
              height: `${config.platterSize}%`,
              top: `${config.platterTop}%`,
              left: `${config.platterLeft}%`,
            }}
          >
            <div className="relative w-full h-full">
              <img
                src="/images/vinyl-record.png"
                alt="Vinyl Record"
                className={`w-full h-full object-contain ${isPlaying ? 'animate-spin-slow' : ''}`}
                style={{
                  animationDuration: isPlaying ? `${config.vinylRotationSpeed}s` : undefined,
                }}
              />
              
              {/* Center label */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden shadow-2xl"
                style={{
                  width: `${config.labelSize}%`,
                  height: `${config.labelSize}%`,
                }}
              >
                <img
                  src={labelImageUrl}
                  alt="Record Label"
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
                  style={{
                    animationDuration: isPlaying ? `${config.vinylRotationSpeed}s` : undefined,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tonearm */}
          <div
            className="absolute z-20"
            style={{
              width: `${config.tonearmWidth}%`,
              height: `${config.tonearmHeight}%`,
              top: `${config.tonearmTop}%`,
              right: `${config.tonearmRight}%`,
              transformOrigin: `${config.tonearmPivotX}% ${config.tonearmPivotY}%`,
              transform: `rotate(${tonearmAngle}deg)`,
              transition: `transform ${config.animationDuration}s ${config.animationEasing}`,
            }}
          >
            <img
              src="/images/tonearm.png"
              alt="Tonearm"
              className="w-full h-full object-contain"
            />
            <img
              src="/images/tonearm-animated.png"
              alt="Tonearm Animated"
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Track info and controls */}
        {config.showTrackInfo && (
          <div className="mt-8 text-center text-white space-y-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{currentTrack.title}</h2>
              <p className="text-lg sm:text-xl text-gray-300">{currentTrack.artist}</p>
              <p className="text-sm text-gray-400 mt-2">
                Track {currentTrackIndex + 1} of {tracks.length}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md mx-auto">
              <div
                ref={progressBarRef}
                className="relative w-full rounded-full overflow-hidden cursor-pointer"
                style={{
                  height: `${config.progressBarHeight}px`,
                  backgroundColor: config.progressBarBackground,
                }}
                onMouseDown={handleProgressBarMouseDown}
                onClick={handleProgressBarClick}
              >
                <div
                  className="absolute top-0 left-0 h-full transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: config.progressBarColor,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>{formatTime((progress / 100) * (duration || 0))}</span>
                <span>{formatTime(duration || 0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handlePrevious}
                variant="outline"
                size="icon"
                className="rounded-full"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                onClick={isPlaying ? handleStop : handlePlay}
                size="icon"
                className="rounded-full w-16 h-16"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </Button>
              
              <Button
                onClick={handleNext}
                variant="outline"
                size="icon"
                className="rounded-full"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            {/* Calibration toggle */}
            <div className="pt-4">
              <Button
                onClick={() => setCalibrationMode(!calibrationMode)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                {calibrationMode ? 'Exit Calibration' : 'Calibration Mode'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

### 2. Authentication Hook

`src/hooks/useAuth.ts`:

```tsx
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
```

### 3. User Role Hook

`src/hooks/useUserRole.ts`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole(userId: string | undefined) {
  const enabled = !!userId;
  const query = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }
      
      return data?.role as 'admin' | 'user' | null;
    },
    enabled
  });

  return {
    ...query,
    isLoading: enabled ? query.isLoading : true
  };
}
```

### 4. Tracks Hook

`src/hooks/useTracks.ts`:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DbTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  order_index: number;
  user_id: string | null;
  created_at: string | null;
}

export interface Track {
  id: number;      // Sequential ID for UI display (1, 2, 3...)
  dbId: string;    // UUID from database for backend operations
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
      
      return (data as DbTrack[]).map((track, index) => ({
        id: index + 1,        // Sequential ID for display
        dbId: track.id,       // Keep UUID for database operations
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
    onError: (error) => {
      toast({ 
        title: 'Error deleting track', 
        description: error.message,
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
    onError: (error) => {
      toast({ 
        title: 'Error updating track', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
```

### 5. Label Images Hook

`src/hooks/useLabelImages.ts`:

```tsx
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

// Fetch all label images
export function useLabelImages() {
  return useQuery({
    queryKey: ['label-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LabelImage[];
    }
  });
}

// Fetch currently active label
export function useActiveLabelImage() {
  return useQuery({
    queryKey: ['active-label'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_images')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as LabelImage | null;
    }
  });
}

// Upload new label image
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
      const { error: insertError } = await supabase
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

// Set active label
export function useSetActiveLabelImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('label_images')
        .update({ is_active: true })
        .eq('id', labelId);
      
      if (error) throw error;
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

// Delete label image
export function useDeleteLabelImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ labelId, imageUrl }: { labelId: string; imageUrl: string }) => {
      // Delete from database
      const { error: dbError } = await supabase
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
```

### 6. MP3 Metadata Utility

`src/utils/mp3Metadata.ts`:

```tsx
import { parseBlob } from 'music-metadata-browser';

export interface Mp3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  duration?: number;
}

export async function extractMp3Metadata(file: File): Promise<Mp3Metadata> {
  try {
    const metadata = await parseBlob(file);
    
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      year: metadata.common.year,
      duration: metadata.format.duration
    };
  } catch (error) {
    console.error('Error extracting MP3 metadata:', error);
    return {};
  }
}
```

### 7. Index Page (Public Player)

`src/pages/Index.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import VinylPlayer from "@/components/VinylPlayer";
import { useTracks } from "@/hooks/useTracks";
import { useActiveLabelImage } from "@/hooks/useLabelImages";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tracks, isLoading } = useTracks();
  const { data: activeLabel } = useActiveLabelImage();
  const { data: role } = useUserRole(user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xl">No tracks available yet</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
```

### 7. Auth Page (Admin Login)

`src/pages/Auth.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast({ title: 'Welcome back!' });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Sign in to manage tracks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8. Admin Page (Track Management)

`src/pages/Admin.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTracks, useDeleteTrack, useUpdateTrack } from '@/hooks/useTracks';
import { LogOut, Plus, Upload, FolderOpen } from 'lucide-react';
import { extractMp3Metadata } from '@/utils/mp3Metadata';

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole(user?.id);
  const { data: tracks, isLoading: tracksLoading } = useTracks();
  const deleteTrack = useDeleteTrack();
  const updateTrack = useUpdateTrack();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      navigate('/');
    }
  }, [role, roleLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDelete = async () => {
    if (selectedTrack) {
      deleteTrack.mutate(selectedTrack.dbId);
      setDeleteDialogOpen(false);
      setSelectedTrack(null);
    }
  };

  const handleEdit = async () => {
    if (selectedTrack) {
      updateTrack.mutate({
        id: selectedTrack.dbId,
        title: editTitle,
        artist: editArtist
      });
      setEditDialogOpen(false);
      setSelectedTrack(null);
    }
  };

  const handleAddTrack = async (file: File) => {
    try {
      setUploading(true);

      // Extract metadata
      const metadata = await extractMp3Metadata(file);
      const title = metadata.title || file.name.replace('.mp3', '');
      const artist = metadata.artist || 'Unknown Artist';

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('tracks')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tracks')
        .getPublicUrl(fileName);

      // Get next order index
      const { data: existingTracks } = await supabase
        .from('tracks')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingTracks && existingTracks.length > 0 
        ? existingTracks[0].order_index + 1 
        : 0;

      // Insert into database
      const { error: dbError } = await supabase
        .from('tracks')
        .insert({
          title,
          artist,
          audio_url: publicUrl,
          order_index: nextOrderIndex,
          user_id: user?.id
        });

      if (dbError) throw dbError;

      toast({ title: 'Track added successfully!' });
      setAddDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error adding track',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    const mp3Files = Array.from(files).filter(file => 
      file.type === 'audio/mpeg' && file.size < 50 * 1024 * 1024
    );

    if (mp3Files.length === 0) {
      toast({
        title: 'No valid files',
        description: 'Please select MP3 files under 50MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of mp3Files) {
      try {
        await handleAddTrack(file);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setUploading(false);
    toast({
      title: `Upload complete`,
      description: `${successCount} tracks added, ${errorCount} failed`
    });
  };

  if (authLoading || roleLoading || tracksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Track Management</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Tracks</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/mpeg';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handleAddTrack(file);
                    };
                    input.click();
                  }}
                  disabled={uploading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Track
                </Button>
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/mpeg';
                    input.multiple = true;
                    input.onchange = (e: any) => {
                      const files = e.target.files;
                      if (files) handleBulkUpload(files);
                    };
                    input.click();
                  }}
                  variant="outline"
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks?.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>{track.title}</TableCell>
                    <TableCell>{track.artist}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => {
                          setSelectedTrack(track);
                          setEditTitle(track.title);
                          setEditArtist(track.artist);
                          setEditDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedTrack(track);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTrack?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
            <DialogDescription>
              Update the track information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist</label>
              <Input
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 9. Update App.tsx

Add routes to `src/App.tsx`:

```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

---

## 🎨 Customization

### Custom Label Images

The VinylPlayer now supports **multiple label images** with dynamic switching via the Admin Dashboard:

**Admin Dashboard Method (Recommended):**
1. Log into Admin dashboard at `/admin`
2. Scroll to the "Label Images" section
3. Click "Upload Label Image"
4. Select PNG, JPG, JPEG, or WebP (max 5MB)
5. Click the "Set Active" button on any label to make it the current label
6. Delete unused labels with the trash icon
7. Active label shows immediately on the player

**Label Design Requirements:**
- Square image recommended (1:1 aspect ratio)
- PNG format recommended for transparency support
- 500x500px minimum resolution
- Circular design works best (fits vinyl aesthetic)

**Transparency Options:**
- **Transparent center**: Shows the turntable spindle (vintage record look)
  - Requires `vinyl-record.png` to have transparent center
  - Creates authentic vinyl record appearance
  - Label appears to "float" on the spindle
- **Solid center**: Completely covers the center area
  - Works with any `vinyl-record.png`
  - Modern, clean look

**Direct File Replacement (Legacy Method):**
You can still replace `/images/label-blank-template.png` directly as a fallback, but this will be overridden if an admin sets an active label in the database. The default fallback is only used when no label is marked as active.

**Design Tips:**
- Use contrasting colors for better visibility while spinning
- Consider how the label looks both static and rotating
- Test with both light and dark center spindles
- Circular text works well for rotating labels
- Include branding or track info for custom player experiences

### Adjust Player Layout

Use calibration mode to fine-tune positioning:
1. Click "Calibration Mode" button
2. Use keyboard shortcuts (see on-screen guide)
3. Copy config when satisfied
4. Paste into `DEFAULT_CONFIG` in VinylPlayer.tsx

### Change Colors/Styling

Edit these in `DEFAULT_CONFIG`:
```tsx
progressBarColor: '#dc2626',        // Progress bar fill color
progressBarBackground: 'rgba(...)', // Progress bar background
vinylRotationSpeed: 2,              // Seconds per rotation
```

---

## 🔐 Security Features

### Row-Level Security (RLS)
All tables have RLS enabled:
- **Public read access**: Anyone can view tracks
- **Admin-only write**: Only admins can create/update/delete tracks
- **User roles separation**: Roles stored in separate table to prevent privilege escalation

### Security Definer Function
The `has_role()` function uses `SECURITY DEFINER` to avoid RLS recursion issues when checking permissions.

### Hidden Admin Access
- No visible signup button (security by obscurity)
- Admin login only accessible via `/auth` URL
- Session-based authentication with Supabase Auth
- Automatic redirect for authenticated admins

### Storage Security
- Public read access for audio playback
- Admin-only upload/delete permissions
- File size limits (50MB)
- MP3 format validation

---

## 🚀 Deployment

### Authentication Setup

**Important**: Before deploying, configure authentication:

1. **Enable auto-confirm for email signups** (for testing):
   - Settings > Authentication > Email Auth
   - Enable "Confirm email" toggle to OFF

2. **Create first admin user**:
   - Navigate to `/auth`
   - Sign up with your admin email
   - Run SQL to grant admin role (see Step 2 above)

3. **For production**:
   - Consider enabling email confirmation
   - Set up proper SMTP email provider
   - Use strong passwords for admin accounts
   - Regularly audit user_roles table

### Environment Variables

These are auto-configured by Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## 📱 Usage Guide

### For Public Users

1. Visit the site
2. See list of available tracks
3. Click Play to start vinyl player
4. Use controls to navigate tracks
5. Click progress bar to scrub

### For Admins

1. Navigate to `/auth`
2. Log in with admin credentials
3. Visit `/admin` or click Admin button on main page
4. Add tracks:
   - **Single upload**: Click "Add Track" button
   - **Bulk upload**: Click "Bulk Upload" for multiple files
   - Metadata is automatically extracted from MP3 tags
5. Edit track info (title/artist) as needed
6. Delete tracks when necessary
7. Tracks appear immediately on public player

---

## 🐛 Troubleshooting

### Database Issues

**Error: "new row violates row-level security policy"**
- Make sure you're logged in as admin
- Check user_roles table has your user ID with 'admin' role
- Verify `has_role()` function exists

**Error: "infinite recursion detected in policy"**
- Ensure you're using the `has_role()` security definer function
- Don't query user_roles directly in RLS policies

### Authentication Issues

**Can't log in after signup**
- Check if email confirmation is disabled in Supabase auth settings
- Verify user exists in auth.users table
- Check user_roles table for admin role entry

**Redirects to login immediately**
- Check browser console for errors
- Verify Supabase client is configured correctly
- Check session persistence in useAuth hook

### Upload Issues

**File upload fails**
- Check file is MP3 format
- Ensure file is under 50MB
- Verify storage bucket 'tracks' exists and is public
- Check RLS policies on storage.objects

**Metadata not extracted**
- Ensure `music-metadata-browser` package is installed
- MP3 must have valid ID3 tags
- Falls back to filename if tags missing

### Player Issues

**Audio won't play**
- Check audio_url in database is valid
- Verify storage bucket is public
- Check browser console for CORS errors
- Test audio URL directly in browser

**Images don't load**
- Verify all images uploaded to `public/images/`
- Check image paths match component code
- Clear browser cache

**Dark spots or artifacts on labels**
- **Symptom**: Small dark spot or black pixels visible in the center of the record label
- **Cause**: The vinyl player uses a 3-layer image stacking system:
  1. Bottom: `turntable-base.png` (turntable body with spindle)
  2. Middle: `vinyl-record.png` (the spinning record)
  3. Top: label image (center label artwork)
- **Dark spots occur when**:
  - `vinyl-record.png` doesn't have a transparent center hole
  - `turntable-base.png` has dark/black pixels in the spindle area
  - These dark pixels "bleed through" the transparent areas
- **Solution Checklist**:
  1. ✅ Verify `vinyl-record.png` has a **fully transparent center**
     - Use an image editor (Photoshop, GIMP, etc.)
     - Check the alpha channel - should be 0% opacity in center
     - Not white, gray, or black - actual transparency
  2. ✅ Check `turntable-base.png` has a **clean, light-colored spindle**
     - Inspect center spindle area for dark pixels
     - Use image editor to lighten or clean the center
     - Avoid pure black (#000000) in spindle region
  3. ✅ Test with a label that has a transparent center
     - Upload a test label with transparent center
     - Verify the spindle shows through cleanly
     - Adjust turntable-base.png if dark artifacts appear
  4. ✅ Consider label design approach
     - Transparent centers: Vintage vinyl aesthetic (shows spindle)
     - Solid centers: Modern look (covers spindle completely)
     - Both are supported, choose based on your design preference
- **Pro Tip**: The images included with this project are already fixed for proper transparency. If you're creating new images, use these as reference for proper transparency handling.

**Elements don't align correctly (vinyl, tonearm, label)**
- ✅ Use **Calibration Mode** to adjust positioning (click 🎯 button)
- ✅ Verify image assets have correct transparency:
  - `vinyl-record.png` MUST have transparent center hole
  - `turntable-base.png` should have clean, light spindle area
- ✅ Check that you haven't overridden component CSS with global styles
- ✅ Ensure parent container doesn't force dimensions (e.g., `h-[400px]`)

**Player looks squashed or stretched**
- ✅ Remove any `height` or `aspect-ratio` overrides on parent containers
- ✅ Let the component use its intrinsic aspect ratio (1.18:1 for turntable)
- ✅ Use only `padding`, `margin`, or `max-width` on parent containers, not `width` or `height`

**Controls (track info, progress bar) are cut off or hidden**
- ✅ Ensure the parent container doesn't have `overflow: hidden`
- ✅ Give the parent container sufficient vertical space (`min-h-screen` or similar)
- ✅ Avoid placing the component in a fixed-height container
- ✅ The component structure places controls OUTSIDE the turntable container, so they flow naturally—verify you're using the latest component code

### CSS Conflicts

**External styles affecting player appearance**

The component uses `all: unset` on its root wrapper for CSS isolation. However, some aggressive global styles may still interfere:

- ✅ Check for global `* { }` selectors overriding everything
- ✅ Verify no `!important` rules targeting the player's class names
- ✅ Use browser DevTools to inspect computed styles and identify conflicts
- ✅ If needed, add `!important` to critical player styles (though this shouldn't be necessary)

### Understanding the Component Structure

**Visual Hierarchy:**
```
<div class="vinyl-player-root">  ← CSS isolation, self-contained sizing
  │
  ├─ <div class="vinyl-player-container">  ← Fixed aspect ratio (1.18:1)
  │   │                                      overflow: hidden
  │   │                                      turntable boundary
  │   ├─ Turntable base image
  │   ├─ Vinyl platter (spinning, CSS custom properties for position)
  │   ├─ Tonearm (animated, CSS custom properties for position)
  │   └─ Center label (CSS custom properties for position)
  │
  └─ <div class="controls">  ← Flexible layout, flows below turntable
      ├─ Track info
      ├─ Progress bar
      ├─ Playback controls
      └─ Track list
```

**Why This Structure?**
- **Separation of concerns**: Turntable (visual) and controls (functional) are independent
- **Aspect ratio preservation**: Only the turntable needs fixed proportions
- **Responsive controls**: Track list and buttons can reflow on mobile without affecting turntable
- **Overflow management**: Turntable has `overflow: hidden` for clean edges; controls need space to expand

**Key CSS Properties:**
```css
.vinyl-player-root {
  all: unset;                    /* Reset external styles */
  display: block;
  position: relative;
  width: 100%;
  max-width: 1200px;             /* Prevents oversizing */
  margin: 0 auto;                /* Self-centering */
  container-type: inline-size;   /* Container queries */
}

.vinyl-player-container {
  aspect-ratio: 1.18;            /* Turntable proportions */
  overflow: hidden;              /* Clean edges */
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

---

## 📚 Best Practices

### ✅ DO:
- Use the component with a simple semantic wrapper (`<main>`, `<section>`, etc.)
- Provide adequate padding around the player (`p-4` or `p-8`)
- Allow vertical space for controls (`min-h-screen` or similar)
- Use the calibration mode for fine-tuning positioning
- Test on multiple screen sizes to ensure responsiveness

### ❌ DON'T:
- Wrap in multiple nested containers with competing layout rules
- Force explicit dimensions (`w-[600px]`, `h-[400px]`)
- Use `overflow: hidden` on parent containers
- Override the component's intrinsic aspect ratio
- Place inside fixed-height containers without scrolling

### 🎯 Ideal Integration Pattern:
```tsx
const MyPage = () => {
  const { data: tracks } = useTracks();
  const { data: activeLabel } = useActiveLabelImage();
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      {tracks && tracks.length > 0 ? (
        <VinylPlayer 
          tracks={tracks} 
          labelImageUrl={activeLabel?.image_url || "/images/label-blank-template.png"} 
        />
      ) : (
        <p className="text-center text-white">No tracks available</p>
      )}
    </main>
  );
};
```

---

## 🎓 Architecture Overview

### Data Flow

```
User Action → Admin Page → Supabase Client → Database/Storage
                ↓
          React Query Cache
                ↓
          Index Page → VinylPlayer Component → Audio Playback
                ↓
         Active Label Query → Display Current Label
```

### Authentication Flow

```
User Login → Supabase Auth → useAuth Hook → Session State
                                    ↓
                              useUserRole Hook
                                    ↓
                          Check user_roles table
                                    ↓
                            Conditional Rendering
```

### File Upload Flow

```
Admin Selects File → Extract Metadata → Upload to Storage → Get Public URL
                                                                    ↓
                                                         Insert to Database
                                                                    ↓
                                                         React Query Invalidate
                                                                    ↓
                                                              UI Updates
```

### Label Images Management Flow

1. **Upload Process:**
   - Admin uploads image via Admin dashboard
   - File validated (format, size, MIME type)
   - Uploaded to `label-images` storage bucket
   - Database record created in `label_images` table
   - `is_active` defaults to false

2. **Activation Process:**
   - Admin clicks "Set Active" on desired label
   - Database trigger `ensure_single_active_label()` fires
   - Previous active label automatically deactivated (is_active = false)
   - New label set to active (is_active = true)
   - Query cache invalidated for immediate UI update

3. **Display Process:**
   - Index.tsx calls `useActiveLabelImage()` hook
   - Hook queries for label with `is_active = true`
   - Returns active label URL or null
   - VinylPlayer uses active label or falls back to default (`/images/label-blank-template.png`)
   - Player displays label on spinning vinyl

4. **Deletion Process:**
   - Admin clicks delete on label
   - Database record deleted first
   - Storage file removed second (cleanup)
   - If deleted label was active, no label is active (shows default)
   - Query cache invalidated to update UI

---

## 📚 Additional Resources

### Supabase Documentation
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)
- [Auth](https://supabase.com/docs/guides/auth)

### React Query
- [Queries](https://tanstack.com/query/latest/docs/react/guides/queries)
- [Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)

### Music Metadata
- [music-metadata-browser](https://github.com/Borewit/music-metadata-browser)

---

## 🤝 Contributing

Found an issue or want to improve this guide?
- Share feedback in Lovable community
- Suggest improvements for database schema
- Share your customizations

---

## 📄 License

This component and guide are provided as-is for use in Lovable projects.

---

## ✨ Credits

- **Original Component**: VinylPlayer component
- **Backend Integration**: Full-stack expansion with Lovable Cloud
- **Metadata Extraction**: music-metadata-browser library
- **UI Components**: shadcn/ui
- **Backend**: Supabase (via Lovable Cloud)

---

## 🎉 Enjoy Your Full-Stack Vinyl Player!

You now have a complete music management system with:
- Beautiful vintage player interface
- Secure admin dashboard
- Cloud storage for audio files
- Dynamic track loading
- Role-based access control
- Real-time updates

Happy spinning! 🎵
