## The key constraint

Cross-project copying only works **inward**: I can't push files from here into [Cobweb Strange](/projects/fc0407b5-4cd3-4b21-9bac-6456f57a86e9). You have to open that project and have its agent pull from this one by typing `@` in the chat and selecting this project.

## What I found in Cobweb Strange

It already has its own `VinylPlayer.tsx` (older version, no `theme` prop), its own backend (albums, band members, store, fundraiser, tracks, auth) and its own admin page. So this is **not** a remix — it's a port of the new realistic player + theme system into an app that already works. Its player is embedded per-album inside `AlbumGrid.tsx`, which the port has to respect.

## Plan: build a transfer package in this project

I'd add one file here, `docs/THEME_PORT_TO_COBWEB.md`, written as a set of instructions for the *other* project's agent. It would contain:

1. **File manifest** — exactly which files to copy from this project via `@Retro Groove Widget`:
   - `src/config/playerThemes.ts` (theme presets, geometry, tokens)
   - `src/hooks/usePlayerTheme.ts` (read / realtime / admin write)
   - `src/components/admin/PlayerThemePicker.tsx`
   - `src/components/VinylPlayer.tsx` (the theme-aware version)
   - all 16 theme assets under `public/images/themes/<theme>/` (deck, record, tonearm, thumb x4)
2. **The one database change** — the `player_settings` table (single row, `active_theme`), with grants, RLS (public read, admin write) and realtime enabled. Written as ready-to-run SQL so their agent applies it as a migration.
3. **Integration edits for their codebase specifically**, not generic advice:
   - `AlbumGrid.tsx` passes `theme={theme}` into each `VinylPlayer`
   - the page that hosts the grid calls `useActivePlayerTheme()` + `usePlayerThemeRealtime()`
   - mount `PlayerThemePicker` as a "Look & Feel" card in their existing admin page
   - merge the `--knob-*` / `--sheen-vinyl` / `--light-deck` / `--vignette-deck` / `--surface-room` tokens into their `index.css`, and the knob variants into their `button.tsx`
4. **Conflict warnings** — their `VinylPlayer` may have local tweaks worth diffing before overwrite; theme tokens overwrite `:root` colours at runtime, so their site palette will follow the selected turntable style (with a note on how to scope that to just the player if they'd rather keep their own site colours).
5. **Verification checklist** — `?playerTheme=<id>` preview URLs, admin switch pushing live to other tabs, tonearm landing correctly on each deck.

## Then, in Cobweb Strange

You open that project and say: *"Follow docs/THEME_PORT_TO_COBWEB.md from @Retro Groove Widget and port the turntable theme system into this app."* Its agent can read that file and every asset it names directly.

## Technical notes

- Nothing changes functionally in this project — the package is documentation plus the exact SQL and file list.
- I'll optionally also refresh the stale `VINYLPLAYER_INSTALLATION_GUIDE.md` header so it stops claiming only 3 asset files and 3 tables, since it predates the theme system.
- Assets total 16 PNG/JPGs; `copy_project_asset` handles them one at a time, so the manifest lists explicit paths to avoid guesswork.

## One open decision

Whether the selected theme should recolour Cobweb Strange's whole site (as it does here) or only the player area. I'll document both, defaulting to **player-scoped** since that site already has its own established look.
