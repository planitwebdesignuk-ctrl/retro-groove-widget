## Goal

Give the admin a "Look & Feel" section where they pick one of four turntable styles. The choice is saved in the backend and applies instantly for every visitor — swapping both the turntable artwork and the surrounding page palette. Playback, controls, and tonearm animation logic stay exactly as they are.

## The four styles

1. **Vintage Walnut** — the current warm wood hi-fi deck, amber/brass accents, dark brown room.
2. **Matte Black Studio** — dark grey metal DJ deck, cool grey/white accents, near-black room.
3. **Cream Retro Suitcase** — 1960s portable player in cream/tan, pastel teal accents, warm light room.
4. **Brushed Silver Hi-Tech** — silver/glass audiophile deck, cool blue-grey accents, neutral cool room.

Each style is a complete set: deck image, record image, tonearm image, plus its own colour palette.

## How it works

A theme is a bundled preset in code containing:
- its three images (deck / record / tonearm)
- the geometry calibration for those images (platter position and size, tonearm pivot and rest/start/end angles) — every artwork needs its own numbers, so each theme carries them
- its palette values (background, card, accent, text) and the deck lighting/shadow values

The player reads the active theme name from the database, then draws with that theme's images, calibration, and palette. The existing calibration/dev-tuning keys keep working, scoped per theme so tuning one style never disturbs another.

## Admin section

A new "Look & Feel" card on the admin page:
- Four selectable tiles, each showing a small preview thumbnail of that deck, its name and a one-line description
- The active one is visibly marked; clicking a tile saves it and shows a confirmation toast
- A note that the change is live for all visitors immediately

## Player page

- Loads the active theme on mount; falls back to Vintage Walnut if nothing is set
- Subscribes to theme changes the same way the record label already does, so an admin switching styles updates open browsers without a refresh

## Technical notes

- New table `player_settings`: a single-row settings table with an `active_theme` text column, readable by everyone, writable by admins only (matching the existing `label_images` policy shape, with the required grants). Seeded with `vintage_walnut`.
- New `src/config/playerThemes.ts` holding the four presets (assets, calibration, CSS variable values). This is the single source of truth for both the player and the admin previews.
- Palette applied by writing the theme's HSL values onto the existing semantic tokens (`--background`, `--card`, `--accent`, deck shadow/light/sheen tokens) at runtime — no hardcoded colour classes in components.
- New assets generated into `public/images/themes/<theme>/` (deck, record, tonearm) plus a small thumbnail per theme for the admin tiles. The current walnut images move under `vintage_walnut/`.
- New hooks `usePlayerTheme()` (read + realtime) and `useSetPlayerTheme()` (admin write) alongside the existing label hooks.
- `VinylPlayer.tsx` changes are limited to sourcing images/calibration/palette from the active theme; the animation state machine, audio logic, and control layout are untouched.
- Each new deck needs a calibration pass (platter centre, tonearm pivot, rest/start/end angles verified visually against the artwork) before it ships.
