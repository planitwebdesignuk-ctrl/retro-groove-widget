## Goal

Make the record player look like a real 1970s walnut hi-fi turntable. Nothing about the backend, playback logic, tonearm animation, scrubbing, or the control panel changes — only the artwork and the visual layering around it.

## What gets replaced

Three PNGs currently drive the look:

- `public/images/turntable-base.png` — the flat light-gray deck
- `public/images/vinyl-record.png` — the record
- `public/images/Tonearm.png` — the arm

New photoreal versions, generated as a matched set so lighting direction and material scale agree:

1. **Deck** — walnut veneer plinth with visible grain, brushed-aluminum top plate, black rubber feet, chrome hinge stubs at the back, a 33/45 speed selector and a start/stop button screen-printed in the corner, dark ribbed felt mat area, soft top-left studio light with a real contact shadow into the plinth edge.
2. **Record** — 12" black vinyl with fine concentric groove rings, a visible run-out and lead-in band, subtle specular sheen sweeping across the surface, and a transparent center hole so the existing dynamic label image still shows through unchanged.
3. **Tonearm** — S-shaped chrome tube, counterweight, anti-skate dial, headshell with cartridge and stylus, finger lift, rendered with a transparent background and its own soft cast shadow so it reads as floating above the record.

## Geometry and calibration

The player's positions live in `DEFAULT_CONFIG` in `src/components/VinylPlayer.tsx` (platter left/top/size, tonearm pivot, rest/start/end angles) and are cached in `localStorage` under a version key.

- New deck art is generated at the same aspect ratio (~1.18) with the spindle and the tonearm pivot placed at approximately the current percentages, so the change is mostly a nudge rather than a rebuild.
- After the assets are in, I re-measure the spindle center and pivot point from the rendered image and update `DEFAULT_CONFIG` values, then bump `configVersion` / `STORAGE_KEY` so stale saved calibration is discarded for everyone.
- The three angle constants (REST / START / END) are re-tuned so the stylus sits on the lead-in groove at track start and reaches the run-out at the end — same animation timings, same easings.
- Calibration mode (`?calibrate=1`) keeps working exactly as before.

## Ambient staging

- Warm, dim room gradient behind the deck plus a soft elliptical drop shadow under it, so it reads as an object resting on a surface — added as new design tokens/utilities in `src/index.css`, not hardcoded colors.
- Slight top highlight and vignette layered over the deck via CSS so the deck responds to the same light as the room.
- Faint radial sheen over the spinning record that stays fixed while the record rotates (the illusion of light on vinyl rather than light painted onto it).
- Page background and the palette shift from cool navy toward warm walnut/amber tones to match the new material; the controls panel keeps its current structure and simply inherits the updated tokens.

## Technical notes

- Files touched: `public/images/*` (new art), `src/components/VinylPlayer.tsx` (config values, layered lighting elements only), `src/index.css` and `tailwind.config.ts` (warm tokens, shadow/sheen utilities).
- Untouched: all audio handling, database/label fetching, realtime subscription, progress/scrubbing logic, keyboard calibration handlers, admin routes.
- Verified by screenshotting the player at rest, mid-play, and at track end to confirm the stylus lands correctly on the new geometry.
