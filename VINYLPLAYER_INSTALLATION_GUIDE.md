# VinylPlayer - Full-Stack Installation Guide

This guide contains everything you need to add the VinylPlayer component with complete backend management to any Lovable project.

---

## 🚨 CRITICAL: DISABLE EMAIL CONFIRMATION BEFORE STARTING

**YOU MUST DO THIS FIRST OR THE SETUP WILL FAIL:**

1. Open your backend settings in Lovable
2. Navigate to: **Authentication → Providers → Email**
3. **DISABLE "Confirm email"** (turn it OFF)
4. Save the settings

**Why this matters:** Email confirmation is enabled by default in new projects, but no email service is configured. If you skip this step, you won't be able to complete the admin setup after running the migrations.

---

## ⚠️ BEFORE YOU BEGIN - READ THIS FIRST

### Critical Success Factors

This installation has **ZERO tolerance for skipped steps**. Every section must be completed exactly as written.

**Common Reasons for Failure:**
1. ❌ Skipping the `handle_new_user()` trigger → Authentication breaks
2. ❌ Not uploading all asset files → Player shows blank/broken
3. ❌ Missing any of the 10 required code files → Runtime errors
4. ❌ Not creating admin user → Can't access admin dashboard
5. ❌ Not installing `music-metadata-browser` → Upload features fail

### Complete Installation Checklist

Print this checklist and verify each item:

**Backend Setup:**
- [ ] Ran COMPLETE database migration (includes auto-admin creation + default label)
- [ ] Verified 3 tables created: `tracks`, `user_roles`, `label_images`
- [ ] Verified 2 storage buckets created: `tracks`, `label-images`
- [ ] Default admin user auto-created (admin@admin.com/admin)
- [ ] Logged in and changed default password

**Dependencies:**
- [ ] Installed `music-metadata-browser` package

**Code Files (All 10 Required):**
- [ ] `src/components/VinylPlayer.tsx`
- [ ] `src/hooks/useAuth.ts`
- [ ] `src/hooks/useUserRole.ts`
- [ ] `src/hooks/useTracks.ts`
- [ ] `src/hooks/useLabelImages.ts`
- [ ] `src/utils/mp3Metadata.ts`
- [ ] `src/pages/Index.tsx`
- [ ] `src/pages/Setup.tsx` ✨ (NEW - First-run setup)
- [ ] `src/pages/Admin.tsx`
- [ ] `src/App.tsx` (routes updated)

**Assets (All 7 Required):**
- [ ] `public/images/turntable-base.png`
- [ ] `public/images/vinyl-record.png`
- [ ] `public/images/Tonearm.png`
- [ ] `public/images/label-blank-template.png` ✨ (DEFAULT - auto-set as active)
- [ ] `public/images/record-label.png`
- [ ] `public/audio/needle-drop.wav`
- [ ] `public/audio/needle-stuck.wav`

**Final Verification:**
- [ ] Homepage loads without errors
- [ ] Can log in as admin at `/admin`
- [ ] Can access admin dashboard after login
- [ ] Can upload MP3 files
- [ ] Player displays and plays tracks

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
- **Realtime Updates**: Label changes automatically sync across all browser tabs
- **Dynamic Features**: 
  - Single file upload with metadata extraction
  - Bulk folder upload (multiple MP3s at once)
  - Multi-select file upload
  - Automatic metadata extraction from MP3 tags
  - Real-time UI updates with React Query
  - Track reordering
  - Dynamic label image switching
  - Live label synchronization across sessions

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
    Admin.tsx                    # Admin dashboard with integrated login
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

⚠️ **CRITICAL CHECKLIST - DO NOT SKIP ANY STEPS:**

- [ ] Step 1: Run the COMPLETE database migration (includes ALL triggers and functions)
- [ ] Step 2: Navigate to `/setup` and create your first admin account
- [ ] Step 3: Install `music-metadata-browser` dependency
- [ ] Step 4: Create ALL component files (10 files total)
- [ ] Step 5: Upload ALL required assets (5 images + 2 audio files)
- [ ] Step 6: Test authentication and admin access
- [ ] Step 7: Verify all features work

### Step 1: Set Up Backend (Database & Storage)

**⚠️ IMPORTANT: This is ONE COMPLETE migration. Copy the ENTIRE SQL block below.**

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
insert into storage.buckets (id, name, public)
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

-- ⚠️ CRITICAL: Automatic role assignment for new users
-- This trigger ensures new signups get the 'user' role automatically
-- WITHOUT THIS, authentication will fail for new users
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


-- Insert default label image record
insert into public.label_images (name, image_url, is_active, uploaded_by)
values (
  'Default Blank Label',
  '/images/label-blank-template.png',
  true,
  null
);

-- Enable realtime updates for label_images table
-- This allows the player to automatically update when admin changes the active label
ALTER PUBLICATION supabase_realtime ADD TABLE public.label_images;
```

**✅ VERIFICATION:** After running this migration, you should have:
- ✅ 3 tables: `tracks`, `user_roles`, `label_images`
- ✅ 2 storage buckets: `tracks`, `label-images`
- ✅ 3 functions: `has_role()`, `ensure_single_active_label()`, `handle_new_user()`
- ✅ 2 triggers: `single_active_label_trigger`, `on_auth_user_created`
- ✅ 1 default label image: "Default Blank Label" (active)
- ✅ Realtime enabled for `label_images` table

### Step 2: First-Time Setup (CRITICAL)

**🚀 AUTO-SETUP PROCESS:**

After running the database migration, you need to create ONE admin account to manage the system.

**📍 Navigate to `/setup` in your application**

The first time you run your remix:
1. Visit your app URL and add `/setup` to the end (e.g., `https://yourapp.lovable.app/setup`)
2. If you try to go to `/admin` first, you'll be automatically redirected to `/setup`

**👤 Create Your Admin Account:**

Fill in the setup form:
- **Email**: `admin@admin.com` (or your preferred email)
- **Password**: Choose a strong password (minimum 8 characters)
- **Confirm Password**: Re-enter your password
- Click **"Create Admin Account"**

**✅ You'll be automatically logged in and redirected to `/admin`**

**⚠️ SAVE YOUR PASSWORD:**
- There is **NO password recovery**
- Use a password manager
- This is the **ONLY admin account** for the system

**💡 What Happens During Setup:**
- Creates user account using proper Supabase Auth API
- Automatically assigns admin role in the database
- Respects your Supabase email confirmation settings
- Ensures proper authentication flow

**🔧 Optional: Disable Email Confirmation (for testing):**

If you want faster testing without email confirmation:
1. Open your backend by clicking **"View Backend"** in Lovable
2. Go to **Authentication → Email Auth**
3. Toggle **"Confirm email"** to **OFF**

⚠️ For production, keep email confirmation **ON** and configure SMTP.

**🏗️ Single-Admin Architecture:**
- One admin user manages the entire system
- No user registration or multi-user management
- Perfect for personal music collections
- The `/admin` page handles the admin dashboard

**💡 TIP:** Use a password manager to securely store your admin password.

### Step 3: Add Required Dependencies

```bash
# If not already installed
music-metadata-browser
```

### Step 4: Create Component Files

**⚠️ CRITICAL: You MUST create ALL 10 files below. Missing any file will cause errors.**

Create these files in your project (full code provided in sections below):

- [ ] 1. `src/components/VinylPlayer.tsx` - Main player component (REQUIRED)
- [ ] 2. `src/hooks/useAuth.ts` - Authentication hook (REQUIRED)
- [ ] 3. `src/hooks/useUserRole.ts` - Role checking hook (REQUIRED)
- [ ] 4. `src/hooks/useTracks.ts` - Track data hook (REQUIRED)
- [ ] 5. `src/hooks/useLabelImages.ts` - Label images management hook (REQUIRED)
- [ ] 6. `src/utils/mp3Metadata.ts` - Metadata extraction utility (REQUIRED)
- [ ] 7. `src/pages/Index.tsx` - Public player page (REQUIRED)
- [ ] 8. `src/pages/Setup.tsx` - First-run admin setup (REQUIRED) ✨
- [ ] 9. `src/pages/Admin.tsx` - Admin dashboard (REQUIRED)
- [ ] 10. Update `src/App.tsx` - Add routes (REQUIRED)

**📝 Find the complete code for each file in the sections below starting at line ~560.**

### Step 5: Upload Required Assets

**⚠️ CRITICAL: The player will NOT work without these assets.**

Upload these files to the `public/` directory:

**Images (5 REQUIRED):**
- [ ] `public/images/turntable-base.png` - Main turntable body (REQUIRED)
- [ ] `public/images/vinyl-record.png` - The spinning record - MUST have transparent center hole (REQUIRED)
- [ ] `public/images/Tonearm.png` - Tonearm with transparent background (REQUIRED)
- [ ] `public/images/label-blank-template.png` - ✨ DEFAULT label - auto-set as active (REQUIRED)
- [ ] `public/images/record-label.png` - Another label option (REQUIRED)
- [ ] `public/images/label-cobnet-strange.png` - Example label (optional)

**Audio Files (2 REQUIRED):**
- [ ] `public/audio/needle-drop.wav` - Play start sound effect (REQUIRED)
- [ ] `public/audio/needle-stuck.wav` - Track end sound effect (REQUIRED)

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
      // First deactivate all labels
      const { error: deactivateError } = await supabase
        .from('label_images')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all rows
      
      if (deactivateError) throw deactivateError;

      // Then activate the selected label
      const { error: activateError } = await supabase
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
          // Refetch active label when any label changes
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

### 7. Setup Page (First-Run Admin Creation)

**✨ NEW: First-time setup page for creating the admin account**

`src/pages/Setup.tsx` - Admin account creation on first run:

**Key Features:**
- Automatically checks if admin already exists
- Redirects to `/admin` if admin is present
- Creates admin user using proper Supabase Auth API
- Assigns admin role in database
- Handles email confirmation settings automatically

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function Setup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    // Check if admin already exists
    const checkAdminExists = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin')
        .maybeSingle();

      if (data) {
        // Admin exists, redirect to admin page
        navigate('/admin');
      }
      setCheckingAdmin(false);
    };

    checkAdminExists();
  }, [navigate]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Create the user using Supabase Auth API
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('User creation failed');

      // 2. Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: 'admin' });

      if (roleError) throw roleError;

      toast({
        title: 'Admin account created!',
        description: 'Redirecting to admin dashboard...',
      });

      // Wait a moment for the session to be established
      setTimeout(() => {
        navigate('/admin');
      }, 1000);

    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-white">Checking setup status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">VinylPlayer Setup</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create your admin account to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Admin Account'}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
            <p className="font-medium text-amber-900">⚠️ Important:</p>
            <ul className="list-disc list-inside text-amber-800 mt-1">
              <li>Use a strong password (min 8 characters)</li>
              <li>Save your password securely</li>
              <li>No password recovery available</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8. Admin Page (Login & Track Management)

**NOTE:** This page now handles BOTH login and admin dashboard functionality. When not authenticated, it displays a login form. After successful login, it shows the full admin dashboard. If no admin exists in the system, it automatically redirects to `/setup`.

`src/pages/Admin.tsx` - Complete implementation with integrated login:

**Key Features:**
- Automatically redirects to `/setup` if no admin exists
- Inline login form when user is not authenticated
- Full track management (CRUD operations)
- Label image management
- Bulk MP3 upload with metadata extraction

```tsx
// See the actual src/pages/Admin.tsx file for the complete implementation
// The code example below shows the OLD separate auth approach
// The NEW version integrates login directly into the Admin page
```

**Legacy Admin.tsx example (for reference only):**

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

### 8. Update App.tsx

Add routes to `src/App.tsx`:

```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Setup from "./pages/Setup";
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
          <Route path="/setup" element={<Setup />} />
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
- Admin login accessible via `/admin` URL
- Session-based authentication with Supabase Auth
- Automatic redirect for authenticated admins
- Password change enforced on first login

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
   - Navigate to `/admin`
   - The default admin user is auto-created on migration
   - Login with username: `admin`, password: `admin`
   - Change password on first login

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

1. Navigate to `/admin`
2. Log in with admin credentials (default: admin/admin on first setup)
3. Change password when prompted on first login
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

**Label changes don't update automatically**
- Check that realtime is enabled in the database migration
- Verify `ALTER PUBLICATION supabase_realtime ADD TABLE public.label_images;` was executed
- Ensure Index.tsx has the realtime subscription (useEffect with channel)
- Check browser console for websocket connection errors
- Open browser DevTools → Network → WS tab to verify websocket connection
- Test by changing label in Admin dashboard while Index page is open in another tab

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
   - Hook first deactivates ALL labels (is_active = false)
   - Then activates selected label (is_active = true)
   - Database trigger `ensure_single_active_label()` ensures atomicity
   - Realtime event broadcasts to all connected clients
   - Query cache invalidated for immediate UI update
   - **All open browser tabs automatically sync the label change**

3. **Display Process:**
   - Index.tsx calls `useActiveLabelImage()` hook
   - Hook queries for label with `is_active = true`
   - Returns active label URL or null
   - Realtime subscription listens for label_images changes
   - On change event, query cache invalidated and UI updates automatically

4. **Realtime Synchronization:**
   - Label changes broadcast via Supabase Realtime
   - Index page subscribes to `label_images` table changes
   - When admin changes active label, all viewers see update instantly
   - No manual refresh required
   - Works across multiple browser tabs and devices
   - VinylPlayer uses active label or falls back to default (`/images/label-blank-template.png`)
   - Player displays label on spinning vinyl

4. **Deletion Process:**
   - Admin clicks delete on label
   - Database record deleted first
   - Storage file removed second (cleanup)
   - If deleted label was active, no label is active (shows default)
   - Query cache invalidated to update UI

---

## ✅ POST-INSTALLATION VERIFICATION

**Run through this checklist after completing all installation steps:**

### 1. Database Verification

Run these SQL queries to verify database setup:

```sql
-- Should return 3 tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tracks', 'user_roles', 'label_images');

-- Should return 2 functions + 1 for has_role
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('has_role', 'ensure_single_active_label', 'handle_new_user');

-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('single_active_label_trigger', 'on_auth_user_created');

-- Verify storage buckets
SELECT name FROM storage.buckets WHERE name IN ('tracks', 'label-images');
```

**Expected Results:**
- ✅ 3 tables found
- ✅ 4 functions found (has_role, ensure_single_active_label, handle_new_user, create_default_admin)
- ✅ 2 triggers found
- ✅ 2 storage buckets found
- ✅ 1 admin user created (admin@admin.com)
- ✅ 1 default label image (Default Blank Label - active)

### 2. File Structure Verification

Check that all these files exist in your project:

```bash
src/components/VinylPlayer.tsx ✓
src/hooks/useAuth.ts ✓
src/hooks/useUserRole.ts ✓
src/hooks/useTracks.ts ✓
src/hooks/useLabelImages.ts ✓
src/utils/mp3Metadata.ts ✓
src/pages/Index.tsx ✓
src/pages/Setup.tsx ✓
src/pages/Admin.tsx ✓
public/images/turntable-base.png ✓
public/images/vinyl-record.png ✓
public/images/Tonearm.png ✓
public/images/label-blank-template.png ✓
public/images/record-label.png ✓
public/audio/needle-drop.wav ✓
public/audio/needle-stuck.wav ✓
```

### 3. Dependency Verification

```bash
# Check if music-metadata-browser is installed
# Look for it in package.json dependencies
```

### 4. Functionality Testing

**Test each feature in this order:**

1. **Homepage Test:**
   - ✅ Navigate to `/`
   - ✅ Page loads without console errors
   - ✅ Vinyl player displays (even with no tracks)

2. **Authentication Test:**
   - ✅ Navigate to `/admin`
   - ✅ Login form displays (username/password, single-admin only)
   - ✅ Log in with username: `admin`, password: `admin`
   - ✅ Password change dialog appears (REQUIRED on first login)
   - ✅ Successfully change password to a strong password
   - ✅ Save new password in password manager
   - ✅ Redirects to admin dashboard after password change

3. **Admin Dashboard Test:**
   - ✅ Navigate to `/admin`
   - ✅ Dashboard displays track list
   - ✅ "Change Password" button visible in header
   - ✅ "Upload Track" button visible
   - ✅ Label images section visible

4. **Upload Test:**
   - ✅ Click "Upload Track"
   - ✅ Can select MP3 file
   - ✅ Metadata auto-fills (title, artist)
   - ✅ Upload completes successfully
   - ✅ Track appears in list

5. **Playback Test:**
   - ✅ Go back to homepage
   - ✅ Uploaded track appears
   - ✅ Click play button
   - ✅ Vinyl spins
   - ✅ Tonearm moves
   - ✅ Audio plays
   - ✅ Progress bar updates

6. **Label Management Test:**
   - ✅ Go to admin dashboard
   - ✅ Default blank label already exists and is active
   - ✅ Upload custom label image (optional)
   - ✅ Activate custom label (optional)
   - ✅ Go to homepage
   - ✅ Label displays on vinyl (default or custom)

### 5. Common Issues Checklist

If something doesn't work, check:

- [ ] **"Can't log in"** → Use username `admin` and password `admin` (change on first login)
- [ ] **"Password change required"** → This is normal! Change it to continue
- [ ] **"No sign-up option"** → Correct! This is a single-admin system (login only)
- [ ] **"No tracks showing"** → Did you upload at least one track?
- [ ] **"Upload fails"** → Is `music-metadata-browser` installed?
- [ ] **"Blank vinyl"** → Are image assets uploaded to `public/images/`?
- [ ] **"No sound"** → Are audio assets uploaded to `public/audio/`?
- [ ] **"Permission denied"** → Check RLS policies and admin role
- [ ] **"Tonearm wrong size"** → `DEFAULT_CONFIG` not copied correctly

### 6. Emergency Troubleshooting

**If installation fails completely:**

1. **Check console logs** - Look for specific error messages
2. **Verify all 10 code files exist** - Missing files cause import errors
3. **Check database migration completed** - Run verification SQL above
4. **Verify asset files uploaded** - Check browser Network tab for 404s
5. **Verify default admin created** - Migration should auto-create admin@admin.com
6. **Clear browser cache** - Old cached code can cause issues

**Still broken? Check these critical items:**

| Issue | Fix |
|-------|-----|
| Auth errors | Check admin user created: `select * from auth.users where email = 'admin@admin.com';` |
| Upload fails | `music-metadata-browser` not installed |
| Permission denied | Admin user should auto-exist, check: `select * from user_roles;` |
| Visual glitches | Asset files missing or wrong paths |
| Playback fails | Audio files missing from `public/audio/` |

---

## 🔒 Security Notes

### Single-Admin Architecture

This VinylPlayer system is designed with a **single-admin model** for personal or single-operator use:

**Key Security Features:**
- ✅ Only ONE admin account exists in the system
- ✅ No user registration or sign-up functionality
- ✅ Login-only authentication (no public sign-up page)
- ✅ Mandatory password change on first login
- ✅ Row-Level Security (RLS) policies protect all data
- ✅ Admin-only access to track management and uploads

**Password Security:**
1. **Default Credentials MUST Be Changed:**
   - Default: `admin` / `admin` 
   - System FORCES password change on first login
   - Choose a strong password (12+ characters recommended)
   - Include uppercase, lowercase, numbers, and symbols

2. **No Password Recovery:**
   - ⚠️ There is NO password reset mechanism
   - Store your password securely (use a password manager)
   - Losing your password means losing admin access
   - Backup solution: Manual database password reset (advanced users only)

3. **Best Practices:**
   - Use a unique password (not reused from other sites)
   - Consider using a password manager (1Password, Bitwarden, LastPass)
   - Change password regularly (every 3-6 months)
   - Never share admin credentials

**Production Deployment:**

Before deploying to production:

1. ✅ **Change default password** - Never deploy with `admin/admin`
2. ✅ **Use HTTPS** - Always use SSL/TLS for encrypted connections
3. ✅ **Regular backups** - Backup database and track files regularly
4. ✅ **Monitor access** - Check database logs for suspicious activity
5. ✅ **Update dependencies** - Keep all packages up to date
6. ✅ **Review RLS policies** - Ensure data access is properly restricted

**Data Protection:**

- All tracks and metadata are stored in Supabase
- RLS policies ensure only admins can modify data
- Public users can only view and play tracks (read-only)
- Storage buckets are public for playback but upload-restricted
- Admin role checked server-side via `has_role()` function

**Recommended for:**
- Personal music collections
- Single-user applications
- Home media servers
- Demo/portfolio projects

**NOT recommended for:**
- Multi-user music platforms
- Commercial streaming services  
- Applications requiring user registration
- Systems needing password recovery

---

## 🔧 Admin User Provisioning & Auth Normalization

### How the Admin User Is Created

The default admin user (`admin@admin.com` / `admin`) is automatically provisioned by the initial database migration script. This migration:

1. **Creates the admin user** in `auth.users` with:
   - Email: `admin@admin.com`
   - Password: `admin` (bcrypt-hashed)
   - `email_confirmed_at` set to `now()` (email pre-confirmed)
   - `raw_user_meta_data` with `needs_password_change: true` flag

2. **Assigns the admin role** in `public.user_roles` table

3. **Normalizes auth fields** to ensure compatibility with Supabase Auth API:
   - All token fields (`confirmation_token`, `recovery_token`, etc.) are coalesced to empty strings (not NULL)
   - `aud` and `role` fields are set to `'authenticated'`
   - `email_confirmed_at` is set to avoid email verification requirements

### Why Token Normalization Is Required

The Supabase Auth API expects token-related columns to be strings, not NULL. If these fields contain NULL values, the login endpoint will fail with:

```
error finding user: sql: Scan error on column index X, name "..._token": 
converting NULL to string is unsupported
```

The migration script proactively normalizes these fields to prevent login failures.

### Login Flow

1. Navigate to `/admin` (NOT `/auth` - there is no separate auth page)
2. Enter credentials: `admin` / `admin`
3. On first login, you'll be immediately prompted to change the password
4. After password change, the full admin dashboard loads

### If Login Still Fails

If you encounter "Access denied" or "Database error querying schema" after running the migration:

1. **Verify the admin user exists:**
   ```sql
   SELECT email, email_confirmed_at, raw_user_meta_data 
   FROM auth.users 
   WHERE email = 'admin@admin.com';
   ```

2. **Verify the admin role is assigned:**
   ```sql
   SELECT u.email, ur.role 
   FROM auth.users u 
   JOIN public.user_roles ur ON u.id = ur.user_id 
   WHERE u.email = 'admin@admin.com';
   ```

3. **Re-run the normalization update:**
   ```sql
   UPDATE auth.users
   SET
     confirmation_token = COALESCE(confirmation_token, ''),
     recovery_token = COALESCE(recovery_token, ''),
     email_change_token_new = COALESCE(email_change_token_new, ''),
     email_change_token_current = COALESCE(email_change_token_current, ''),
     phone_change_token = COALESCE(phone_change_token, ''),
     reauthentication_token = COALESCE(reauthentication_token, ''),
     email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
     updated_at = NOW()
   WHERE email = 'admin@admin.com';
   ```

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
