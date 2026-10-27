# Switchback

A 3D driving game built with [LittleJS](https://github.com/KilledByAPixel/LittleJS). Drive a box-and-cylinder car up a hill on a switchback road. Arrow keys or WASD to drive, space to drift (hold to charge a mini-turbo). Finish a level, then press space to load the next one.

Levels live in `src/levels.ts`. Append a `LevelDef` (name, hairpin count, start `z0`, `roadAmp`, `turnRadius`) to add a course. Amplitude and turn radius can be constants or functions of climb `t` from 0 to 1. Level 1 matches the original hill; level 2 shortens the switchbacks as you climb. Open `?level=2` to start on Squeeze, or `?overview=1` to view a hill from above while authoring.

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

## Project

| Path | Role |
| --- | --- |
| `src/main.ts` | LittleJS entry: sky, camera, HUD, level flow |
| `src/car.ts` | Car mesh and driving |
| `src/hill.ts` | Height-map hill and switchback road |
| `src/levels.ts` | Level definitions |
