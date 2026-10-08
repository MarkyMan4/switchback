# Switchback

A 2D climbing game built with [LittleJS](https://github.com/KilledByAPixel/LittleJS). You are a climber working your way to the top of a hill by following a trail of switchbacks — a path that zigzags up the slope.

## Play

```bash
bun install
bun run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173/`).

```bash
bun run build    # production build to dist/
bun run preview  # serve the production build
```

## How it plays

You hike a winding trail up a hill. The path does not go straight up — it switchbacks, folding left and right as it climbs. Reach the top.

The world is 2D. The player is a little blue sphere with stub arms and legs and Kirby-like eyes.

## Project

| Path | Role |
| --- | --- |
| `src/main.ts` | LittleJS entry: `gameInit`, `gameUpdate`, `gameUpdatePost`, `gameRender`, `gameRenderPost` |
| `src/tiles.ts` | Tilesheet indices for `public/tiles.png` |
| `public/tiles.png` | 32×32 sprites (1px padding) |
| `tools/generate-assets.mjs` | Regenerates `tiles.png` and `favicon.png` |

```bash
bun tools/generate-assets.mjs
```
