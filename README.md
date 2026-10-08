# Breakout Game

A browser Breakout game in two versions: the AI-written original from 2025 and a rebuilt Version 2.0 from 2026, built with HTML5 Canvas and JavaScript.  
Hosted at https://breakout.sala.company

## Versions

The start page lets you pick which version to play:

| | File | Created | What's in it |
|---|---|---|---|
| **Original** | `classic.html` | September 2025 | The first build, written by the K2 Think AI, kept exactly as it was |
| **Breakout 2.0** | `v2.html` + `v2/` | October 2026 | Rebuilt with Claude Code: 4 worlds, 76 hand-designed levels, 4 bosses, 13 power-ups, stars, music |

### Breakout 2.0

- **4 worlds × 19 levels:** Neon City, Desert Mirage, Deep Ocean and Cosmic Core, each with its own look and music. Every world ends with a boss.
- **Bricks:** tough (2–3 hits), metal (only a Super Bomb breaks it), explosive, gold (1,000 points) and mystery (always drops a power-up). Some rows slide, and portals link parts of a level.
- **Stars:** ★ clear the level, ★★ without losing a life, ★★★ without losing a life and under the target time. Each level keeps its best score.
- **Runs:** score and lives carry from level to level, and progress is saved so you can continue later.
- **Homing:** if you're stuck chasing the last few bricks, the ball starts curving toward them.
- **Settings:** sound, music, screen shake, flashing, moving backgrounds and vibration can each be switched off.
- **Controls:** mouse, keyboard (← → and Space) or touch (drag anywhere, tap to launch and fire).

| Capsule | Power-up | Effect |
|---|---|---|
| **M** | Multi-Ball | Splits every ball into three |
| **R** | Rockets | Tap to fire rockets that blast nearby bricks (12 s) |
| **Z** | Lasers | Tap or hold for rapid-fire lasers (12 s) |
| **B** | Super Bomb | The next hit blows up a huge area, metal included |
| **F** | Fireball | The ball smashes straight through bricks (8 s) |
| **C** | Catch | The bat holds the ball so you can aim (15 s) |
| **W** | Big Bat | A wider paddle (15 s) |
| **S** | Slow Ball | Slows every ball down (10 s) |
| **$** | Bonus | A cash prize from 250 to 5,000 points |
| **+** | Extra Life | One more life |
| **–** | Shrink | A tiny bat (avoid!) |
| **»** | Fast Ball | Faster balls (avoid!) |
| **⇄** | Reverse | Controls flip (avoid!) |

### Code layout

| File | What it does |
|---|---|
| `v2/levels.js` | The 76 level maps and the 4 worlds |
| `v2/game.js` | Game rules and physics (no drawing, so it can be tested) |
| `v2/render.js` | Drawing, with cached brick and background images |
| `v2/audio.js` | Sound effects and music |
| `v2/main.js` | Menus, saving, controls and the start-page demo |
| `v2/tests.html` | Open in a browser to check every level and let a bot play all 76 |

## Version 1.0: the original (September 2025)

The first version was written by `K2 Think`, the AI from Mohamed bin Zayed University of Artificial Intelligence (MBZUAI) in the UAE. It is kept exactly as it was, so you can compare it with 2.0. A screen recording of K2 Think writing it is on the start page ("Watch how it was made") and in this repo as `small k2 think.mp4`.

- **Controls:** mouse only. Move the mouse over the game to steer the paddle. The keyboard and touch don't work in this version.
- **Objective:** destroy all the bricks without letting the ball fall below your paddle.
- **Scoring:** 10 points per brick and a 100-point bonus for each cleared level. Each new level adds a row of bricks and speeds the ball up.

K2 Think was used to:
- Generate the HTML5 Canvas and JavaScript structure
- Write the paddle and ball movement, collision handling and rendering
- Add the score, lives, level and game-over display

## Version 2.0 (October 2026)

Version 2.0 was rebuilt from scratch with [Claude Code](https://claude.com/claude-code) by Anthropic. Claude Code designed the 76 levels, wrote the game engine, graphics, sound and music, wrote the test page, and used a bot to play every level to make sure each one can be finished.

## How it's built

- **Frontend:** HTML5, CSS and JavaScript, with no frameworks or build step
- **Rendering:** the Canvas API
- **Hosting:** GitHub Pages at https://breakout.sala.company

## License

Released under the MIT License. See [LICENSE](LICENSE).
Copyright (c) 2025-2026 SALA CO FOR COMPUTER CONSULTING AND FACILITIES MANAGEMENT ([sala.company](https://sala.company)), Kuwait.

---

**Play now:** https://breakout.sala.company
