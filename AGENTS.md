# AGENTS.md

## What this is

Switchback is a 2D LittleJS game. The player is a climber trying to reach the top of a hill by following a trail of switchbacks (the path zigzags up the slope). Keep the game 2D.

The player character is a little blue sphere with stub arms and legs (no hands or feet) and Kirby-like eyes.

## Stack

- LittleJS (`littlejsengine`) — 2D engine
- Vite 8 — bundler and dev server
- TypeScript
- Bun

## Commands

```bash
bun install
bun run dev
bun run build
bun run preview
bun tools/generate-assets.mjs
```

`build` runs `tsc` then `vite build`. Fix type errors before considering work done.

## Layout

```
src/main.ts                 LittleJS callbacks and engineInit
src/tiles.ts                Tile indices into public/tiles.png
public/tiles.png            32×32 tilesheet, 1px padding, 8 columns
public/favicon.png          Player idle sprite
tools/generate-assets.mjs   Pixel-art generator for the tilesheet
vite.config.ts              base: './' and full reload on save
```

Put runtime images in `public/` so `engineInit(..., ['tiles.png'])` works in both dev and build. Do not import PNGs through Vite for LittleJS textures.

## LittleJS

Call settings (`setCanvasPixelated`, `setTileDefaultSize`, `setTileDefaultPadding`, …) **before** `engineInit`.

Callbacks:

- `gameInit` — once after startup
- `gameUpdate` — 60fps, input and game state (not render)
- `gameUpdatePost` — after physics; camera belongs here
- `gameRender` — behind objects
- `gameRenderPost` — HUD / overlays

World space: **Y is up**, origin bottom-left. Screen space: Y is down. Use world space for gameplay.

Draw tiles with `tile(index, 32)` (padding defaults to 1). Indices live in `src/tiles.ts`.

Extend `EngineObject` for moving entities. Input (`keyIsDown`, `mouseWasPressed`, …) only during update, never during render.

This project uses the ES module build. Import from `littlejsengine`. Do not rely on engine globals.

Vite HMR is disabled on purpose — LittleJS engine state does not survive a hot swap. Saves full-reload the page.

## Tilesheet (`public/tiles.png`)

32×32 tiles, 1px padding on all sides (cell 34×34), 8 columns.

| Index | Name |
| ---: | --- |
| 0 | `playerIdle` |
| 1 | `playerWalkA` |
| 2 | `playerWalkB` |
| 3 | `grass` |
| 4 | `grassAlt` |
| 5 | `dirtTrail` |
| 6 | `dirtTrailPebbles` |
| 7 | `dirtTrailEdge` |
| 8 | `pine` |
| 9 | `roundTree` |
| 10 | `bush` |
| 11 | `shrub` |
| 12 | `fern` |
| 13 | `rock` |
| 14 | `flowers` |
| 15 | `tallGrass` |

Regenerate with `bun tools/generate-assets.mjs` rather than editing the PNG by hand unless you are doing one-off art.

## Code style

- Match existing TypeScript. No comments unless asked.
- `erasableSyntaxOnly` is on — no enums, no namespaces, no parameter properties.
- `verbatimModuleSyntax` is on — use `import type` for types-only imports.
- Do not add unused imports (`noUnusedLocals` / `noUnusedParameters`).
- Do not commit secrets.

## Do not

- Reintroduce the Vite sample app (`counter.ts`, hero images, `#app` markup).
- Use 3D LittleJS plugins for this game.
- Commit unless the user asks.
