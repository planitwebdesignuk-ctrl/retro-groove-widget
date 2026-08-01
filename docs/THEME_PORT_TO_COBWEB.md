# Porting the realistic turntable + theme system into Cobweb Strange

> **Who this is for:** the Lovable agent working inside the **Cobweb Strange** project.
> Run it there, not here. Copying between projects only works *inward*, so this
> project (**Retro Groove Widget**) cannot push files out.
>
> **How to start it:** in Cobweb Strange, type `@` in the chat, pick this project, and say:
> *"Follow `docs/THEME_PORT_TO_COBWEB.md` from @Retro Groove Widget and port the turntable
> theme system into this app."*

---

## 0. What you are porting

A photoreal turntable with four selectable looks (**Vintage Walnut**, **Matte Black Studio**,
**Cream Retro Suitcase**, **Brushed Silver Hi-Tech**). Each look bundles its own artwork,
geometry calibration (platter position, tonearm pivot, arm angles) and colour tokens.
An admin picks the look; the choice is stored in one backend row and pushed live to all
visitors over realtime.

**Important context about Cobweb Strange:** it already has its own working
`src/components/VinylPlayer.tsx` (older, no `theme` prop), its own backend
(albums, tracks, band members, store, fundraiser, auth/roles) and its own admin page.
This is a **port into a live app**, not a remix. Do not touch albums, store, fundraiser or
band-member code.

---

## 1. Files to copy from Retro Groove Widget

Copy verbatim (same paths):

| Source path | Purpose |
| --- | --- |
| `src/config/playerThemes.ts` | The four theme presets: assets, geometry, colour tokens, `applyPlayerThemeTokens` |
| `src/hooks/usePlayerTheme.ts` | `useActivePlayerThemeId`, `useActivePlayerTheme`, `usePlayerThemeRealtime`, `useSetPlayerTheme` |
| `src/components/admin/PlayerThemePicker.tsx` | The admin "Look & Feel" card |
| `src/components/VinylPlayer.tsx` | The theme-aware player (**see the diff warning in §5**) |

Assets — 16 files, copy each one to the identical path:

```
public/images/themes/vintage_walnut/{deck.png,record.png,tonearm.png,thumb.jpg}
public/images/themes/matte_black/{deck.png,record.png,tonearm.png,thumb.jpg}
public/images/themes/cream_retro/{deck.png,record.png,tonearm.png,thumb.jpg}
public/images/themes/brushed_silver/{deck.png,record.png,tonearm.png,thumb.jpg}
```

Use `cross_project--copy_project_asset` once per file (`project: "Retro Groove Widget"`),
with `source_path` equal to `target_path`. The paths above are exact — do not guess or rename,
because `playerThemes.ts` references them as literal strings.

Nothing else needs copying. `usePlayerTheme.ts` only depends on `@tanstack/react-query`,
`@/integrations/supabase/client` and `@/hooks/use-toast`, all of which Cobweb Strange
already has.

---

## 2. The one database change

Cobweb Strange needs a single new table. Apply this as a migration (it assumes the existing
`public.has_role(uuid, app_role)` function and `app_role` enum, which Cobweb Strange already has —
verify with a read first; if `has_role` is missing, port it before running this):

```sql
CREATE TABLE public.player_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_theme text NOT NULL DEFAULT 'vintage_walnut',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.player_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.player_settings TO authenticated;
GRANT ALL ON public.player_settings TO service_role;

ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player settings"
  ON public.player_settings FOR SELECT USING (true);

CREATE POLICY "Admins can insert player settings"
  ON public.player_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update player settings"
  ON public.player_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_player_settings_updated_at
  BEFORE UPDATE ON public.player_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the single row the app reads.
INSERT INTO public.player_settings (active_theme) VALUES ('vintage_walnut');

-- Realtime so an admin change reaches open browsers instantly.
ALTER TABLE public.player_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_settings;
```

Notes:
- There is deliberately **no delete policy** — the row is a singleton.
- If Cobweb Strange has no `public.update_updated_at_column()` function, create it in the same
  migration (`SET search_path = public`, sets `NEW.updated_at = now()`), or drop the trigger.
- The hooks read the oldest row (`order by created_at asc limit 1`), so keep exactly one row.
- No storage bucket is needed: theme artwork ships in `public/`.

---

## 3. Integration edits, specific to Cobweb Strange

### 3a. `src/components/AlbumGrid.tsx`

It currently renders one player per album:

```tsx
<VinylPlayer tracks={albumTracks} labelImageUrl={labelImageUrl} />
```

Read the active theme once in this component and pass it down:

```tsx
import { useActivePlayerTheme, usePlayerThemeRealtime } from '@/hooks/usePlayerTheme';

const { theme } = useActivePlayerTheme();
usePlayerThemeRealtime();

<VinylPlayer tracks={albumTracks} labelImageUrl={labelImageUrl} theme={theme} />
```

Call `usePlayerThemeRealtime()` exactly **once** per page, in the highest component that needs it —
if `AlbumGrid` can mount more than once on a page, move that call up to the page instead and keep
only `useActivePlayerTheme()` in the grid.

### 3b. Every other `VinylPlayer` usage

Search for `<VinylPlayer` across `src/` and add `theme={theme}` to each one. The prop is optional
and falls back to Vintage Walnut, so a missed call site renders fine but ignores the admin's choice —
that silent fallback is exactly the bug to avoid, so fix all call sites in one pass.

### 3c. Admin page

Mount the picker as its own card inside the existing admin page (bottom of the main column,
alongside the other admin cards, inside whatever admin-role guard already wraps them):

```tsx
import PlayerThemePicker from '@/components/admin/PlayerThemePicker';
// ...
<PlayerThemePicker />
```

It self-contains its `Card`, loading state, thumbnails, colour swatches, active badge and toasts.

### 3d. `src/index.css`

Add these tokens inside the `:root` block if they are absent. They are the defaults the player
and the control knobs read before a theme overrides them at runtime:

```css
--warm-shadow: 22 40% 4%;
--vinyl-glow: 34 55% 45%;

/* Physical control knobs (buttons) — overridden per player theme */
--knob-top: 30 14% 72%;
--knob-mid: 30 12% 60%;
--knob-bottom: 28 14% 44%;
--knob-text: 26 25% 14%;
--knob-edge: 26 20% 24%;
--knob-outline: 28 18% 30%;
--knob-shadow: 22 40% 5%;

/* Physical staging: light, sheen, cast shadow, room */
--shadow-deck:
  0 2px 2px hsl(var(--warm-shadow) / 0.6),
  0 30px 45px -12px hsl(var(--warm-shadow) / 0.85),
  0 70px 90px -40px hsl(var(--warm-shadow) / 0.9);
--light-deck: radial-gradient(120% 90% at 18% -10%, hsl(38 60% 88% / 0.55) 0%, hsl(38 40% 70% / 0.18) 35%, transparent 70%);
--vignette-deck: radial-gradient(130% 110% at 45% 35%, transparent 45%, hsl(var(--warm-shadow) / 0.35) 100%);
--sheen-vinyl: radial-gradient(140% 120% at 22% 12%, hsl(38 45% 82% / 0.3) 0%, hsl(34 35% 70% / 0.1) 28%, transparent 58%);
--surface-room: radial-gradient(ellipse 120% 90% at 50% -20%, hsl(28 22% 15%) 0%, hsl(26 24% 9%) 45%, hsl(24 26% 5%) 100%);
```

And these utilities in the `@layer utilities` block:

```css
.bg-vignette { background: var(--surface-room); }

.deck-surface-shadow::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -3%;
  width: 88%;
  height: 8%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, hsl(var(--warm-shadow) / 0.75) 0%, transparent 70%);
  filter: blur(14px);
  pointer-events: none;
}
```

`.bg-vignette` is optional — apply it only to the section that hosts the player if Cobweb Strange
should keep its own page background (see §4).

### 3e. `src/components/ui/button.tsx` (optional but recommended)

In Retro Groove Widget the `default`, `outline` and `secondary` button variants are restyled as
physical knobs using the `--knob-*` tokens, so the transport controls change material with the
theme. Copy those three variant strings from this project's `button.tsx`. **Read Cobweb Strange's
existing `button.tsx` first** — every button in that app uses these variants, so if the knob look
is unwanted site-wide, add a new `knob` variant instead and use it only inside `VinylPlayer.tsx`.

---

## 4. Decision: how far should the theme recolour the site?

`applyPlayerThemeTokens()` writes the theme's tokens onto `document.documentElement`, so in
Retro Groove Widget the **whole page** follows the turntable style (Cream Retro turns the site
light, for instance).

**Default recommendation for Cobweb Strange: scope it to the player.** That site has an
established look of its own, and Cream Retro's light palette would invert it.

To scope it, change the player's theme effect so tokens land on the player wrapper instead of the
document root:

1. In `playerThemes.ts`, give `applyPlayerThemeTokens` an optional target:
   `(theme: PlayerTheme, target: HTMLElement = document.documentElement)`.
2. In `VinylPlayer.tsx`, pass the outermost player `ref` element as the target in the
   `useEffect(..., [theme])`.

Because every token is consumed via `hsl(var(--token))`, CSS inheritance confines the palette to
that subtree with no further changes. If the user later wants the full site-wide recolour, drop the
target argument and it behaves like this project.

---

## 5. Conflicts and gotchas

- **Diff `VinylPlayer.tsx` before overwriting.** Cobweb Strange's copy may carry local tweaks
  (its default `labelImageUrl` is `/images/label-cobnet-strange.png`, and it may have per-album
  behaviour). Port those differences forward into the new file rather than losing them; the
  theme-aware version's default label is different.
- **Calibration is per theme and per artwork.** The geometry numbers in `playerThemes.ts`
  (`platter`, `tonearm`, `angles`) are measured against those exact PNGs. If an asset is
  regenerated or resized, the tonearm will land in the wrong place.
- **localStorage keys are namespaced** (`vinyl-player-config-v12-<themeId>`), so a stale calibration
  from an earlier build cannot leak between themes.
- **Preview without committing:** `?playerTheme=<id>` on any page renders that style for the current
  visitor only, without touching the stored setting. Ids: `vintage_walnut`, `matte_black`,
  `cream_retro`, `brushed_silver`.
- **Realtime must be enabled** on `player_settings` (last two SQL lines) or admin changes only
  appear after a manual refresh.
- **RLS:** reads are public on purpose so anonymous visitors get the right look; writes are
  admin-only via `has_role`.

---

## 6. Verification checklist

1. Home / album page renders the deck with no broken images (check the network tab for 404s on
   `/images/themes/...`).
2. Visit `?playerTheme=matte_black`, `?playerTheme=cream_retro`, `?playerTheme=brushed_silver` —
   deck, record, tonearm and knobs all change, and the tonearm still rests on the plinth (not
   floating, not overlapping the controls).
3. Play a track on each theme: the arm swings onto the outer groove and tracks inward, ending
   before the centre label.
4. As an admin, pick a style in **Look & Feel** — a toast confirms, the badge moves, and a second
   browser tab updates without a refresh.
5. As a signed-out visitor, the chosen style is the one that loads.
6. Non-admins get no picker, and a direct write attempt is rejected by RLS.