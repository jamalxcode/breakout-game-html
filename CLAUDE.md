# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Breakout** is a browser Breakout game in two versions, live at https://breakout.sala.company. `index.html` is a start page where the player picks the **Original** (`classic.html`, written by the K2 Think AI in September 2025 and kept exactly as it was) or **Breakout 2.0** (`v2.html` + `v2/`, rebuilt with Claude Code: 4 worlds x 19 levels = 76 levels, 4 bosses, 13 power-ups, stars, music). Tech: vanilla HTML/CSS/JS with the Canvas API; v2 uses native ES modules. No framework, no npm, no build step.

## Commands

There are no package scripts. v2 uses ES modules (`<script type="module">`), which need a web server rather than `file://`. Any static server works, e.g.:

```sh
python3 -m http.server 8000
# game:  http://localhost:8000/v2.html
# tests: http://localhost:8000/v2/tests.html
```

**Tests:** open `v2/tests.html` in a browser. `v2/tests.js` checks the level data (76 levels, 13 columns, max 13 rows, valid brick letters, portals paired, boss placement on every 19th level), power-ups and scoring, then lets a bot play all 76 levels and reports time/lives/stars per level. Run it after changing `levels.js` or `game.js`.

## Architecture

| File | Role |
|---|---|
| `index.html` | Start page: two version cards, an SVG drawing of the original, a live demo iframe of `v2.html?demo`, and a `<dialog>` playing `small k2 think.mp4`. |
| `classic.html` | Original game (mouse only). **Do not change the game code**: it is kept as-is on purpose for comparison. |
| `v2.html` | Breakout 2.0 shell: canvas, overlay menus (`#menu`, `#levels`, `#help`, `#settings`, `#pause`, `#intro`, `#msg`), inline CSS. Loads `v2/main.js`. |
| `v2/levels.js` | `COLS = 13`, `LEVELS_PER_WORLD = 19`, `WORLDS`, and `LEVELS` built from `RAW` string maps. The legend at the top of the file explains the letters: `.` `1-3` `M` metal, `X` explosive, `G` gold, `?` mystery, `P/Q` portals, `K` boss (top-left of a 3x2 block). Options: `slide`, `boss`, `tip`. |
| `v2/game.js` | Pure rules/physics, no drawing, so it is testable: `createGame`, `update(G, dt, input)`, `action`, `applyPow`, `botInput`, `breakableLeft`, `POW`, and size constants (`W=800`, `H=600`, ...). |
| `v2/render.js` | `createRenderer(ctx)`: canvas drawing with cached brick/background images. |
| `v2/audio.js` | Web Audio sound effects and per-world music (`sfx`, `startMusic`, `stopMusic`, `unlockAudio`). |
| `v2/main.js` | Page controller: menus, saving, mouse/keyboard/touch input, music, and the demo mode. |

Non-obvious behavior in `v2/main.js`:
- `?demo` in the URL (used by the start page iframe) adds `body.demo`, hides overlays, and lets `botInput` play forever. In demo mode nothing is saved.
- localStorage keys are prefixed `bo2v2_` and JSON-encoded: `bo2v2_settings`, `bo2v2_progress` (stars/best scores), `bo2v2_run` (resumable run). Access is wrapped in try/catch.
- Default settings respect `prefers-reduced-motion` (shake, flashes and moving backgrounds are off when it is set).

## Deployment

- No GitHub Actions workflow and no `.nojekyll`: GitHub Pages serves the `main` branch directly. **Pushing to `main` deploys live.**
- Custom domain from `CNAME` (`breakout.sala.company`).

## Conventions / gotchas

- Keep the GoatCounter analytics snippet at the end of `index.html`, `classic.html` and `v2.html` intact (endpoint `https://salacompany.goatcounter.com/count`; skipped on localhost; paths prefixed with `location.host`).
- No cache-busting/version strings are used on the v2 modules.
- Mobile: `v2.html` sets `touch-action: none`, disables user selection, and sizes the stage to 4:3 within the viewport. Touch controls are drag to steer, tap to launch/fire. Keep touch working when changing input.
- If you change level count, power-ups or controls, update the README tables, the `#help` legend in `v2.html` and the feature list on `index.html` to match.
- The video filename contains spaces (`small k2 think.mp4`) and is referenced URL-encoded in `index.html`.
