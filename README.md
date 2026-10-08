# Breakout Game

A classic browser-based breakout game built with HTML5 Canvas and JavaScript.  
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

## Description

**Breakout Game** is a modern reimagining of the classic arcade hit. Move your paddle left and right—using your mouse, keyboard, or touch—and keep the ball in play to destroy all bricks at the top of the screen. Play instantly in any modern browser.

## How K2 Think Was Used

This project leverages `K2 Think`—an advanced AI code-assist and productivity platform—to accelerate the game's design and development. K2 Think was used to:
- Generate HTML5 Canvas and JavaScript templates,
- Provide optimized logic for paddle/ball movement, collision handling, and rendering,
- Suggest UI enhancements (score, game over, etc.),
- Accelerate prototyping and game structure design.

## Gameplay

- **Controls**:  
  - **Mouse**: Move your mouse over the game area to control the paddle smoothly and precisely.
  - **Keyboard**: Use the Left and Right arrow keys.
  - **Touch**: Playable on touch devices for mobile browser users.
- **Objective**: Destroy all the bricks without letting the ball fall below your paddle.
- **Scoring**: Earn points for every brick you destroy. Challenge yourself for the highest score!

### Features

- Smooth paddle motion with mouse, keyboard, or touch input
- Real-time collision detection for all game elements
- Score, lives, and level indicators
- Crisp graphics and animations, rendered using Canvas API

## How It Was Built

- **Frontend:** HTML5, CSS, JavaScript
- **Rendering:** Uses Canvas API for smooth 2D graphics
- **Game Engine:** Built from scratch leveraging AI-generated prototypes for the core game loop and logic

---

**Play Now:**  
Visit https://breakout.sala.company to experience the game live!

---
