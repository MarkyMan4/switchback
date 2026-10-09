# Switchback

A 3D driving game built with [LittleJS](https://github.com/KilledByAPixel/LittleJS). Drive a box-and-cylinder car up a hill on a switchback road. Arrow keys or WASD to drive, space to drift (hold to charge a mini-turbo).

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
| `src/main.ts` | LittleJS entry: sky, camera, HUD |
| `src/car.ts` | Car mesh and driving |
| `src/hill.ts` | Height-map hill and switchback road |
