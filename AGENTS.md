# AGENTS.md

## What this is

Switchback is a 3D LittleJS driving game. The player drives a car built from primitive meshes (boxes and cylinders). Keep the game 3D.

## Stack

- LittleJS (`littlejsengine`) — engine plus built-in Render3D plugin
- Vite 8 — bundler and dev server
- TypeScript
- Bun

## Commands

```bash
bun install
bun run dev
bun run build
bun run preview
```

`build` runs `tsc` then `vite build`. Fix type errors before considering work done.

## Layout

```
src/main.ts                 LittleJS callbacks, chase camera, engineInit
src/car.ts                  Car mesh and arcade driving
src/hill.ts                 Height-map hill and switchback road
vite.config.ts              base: './' and full reload on save
```

No tilesheet. Game objects are meshes from `buildBox`, `buildCylinder`, and similar.

## LittleJS

Call settings (`setCanvasClearColor`, …) **before** `engineInit`.

Create `new Render3DPlugin()` in `gameInit` before any `EngineObject3D` or mesh builders used by objects.

Callbacks:

- `gameInit` — once after startup
- `gameUpdate` — 60fps, input and game state (not render)
- `gameUpdatePost` — after physics; camera belongs here unless using `CameraControl3D`
- `gameRender` — behind objects
- `gameRenderPost` — HUD / overlays

World space is **Y up**, right-handed. Objects face **-Z**. Use `vec3` and `pos3D` / `rotation3D` / `scale3D`.

Input (`keyIsDown`, `mouseWasPressed`, …) only during update, never during render.

This project uses the ES module build. Import from `littlejsengine`. Do not rely on engine globals.

Vite HMR is disabled on purpose — LittleJS engine state does not survive a hot swap. Saves full-reload the page.

## Code style

- Match existing TypeScript. No comments unless asked.
- `erasableSyntaxOnly` is on — no enums, no namespaces, no parameter properties.
- `verbatimModuleSyntax` is on — use `import type` for types-only imports.
- Do not add unused imports (`noUnusedLocals` / `noUnusedParameters`).
- Do not commit secrets.

## Do not

- Reintroduce the Vite sample app (`counter.ts`, hero images, `#app` markup).
- Reintroduce the old 2D climber, tilesheet, or `tools/generate-assets.mjs`.
- Commit unless the user asks.
