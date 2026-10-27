import type { Color, Vector3 } from 'littlejsengine';
import {
  EngineObject3D,
  HeightMap,
  PI,
  ParticleEmitter3D,
  abs,
  atan2,
  buildGrid,
  buildRibbon,
  clamp,
  cos,
  hsl,
  hypot,
  lerp,
  noise2D,
  sin,
  smoothStep,
  vec2,
  vec3,
} from 'littlejsengine';
import { sampleLevelParam, type LevelDef } from './levels.ts';

export const MAP_SIZE = 400;
export const ROAD_WIDTH = 11;
export const PEAK_HEIGHT = 34;
export const RIDE_HEIGHT = 0.38;

const SAMPLES = 97;
const SHOULDER = 12;
const STRAIGHT_SAMPLES = 40;
const TURN_SAMPLES = 36;
const FINISH_LENGTH = 8;
const FLATTEN_RADIUS = 12;

const finishPos = vec3();

const path: Vector3[] = [];
let z0 = -50;
let endZ = 142;
let endDirX = 1;
let endDirZ = 0;
export let terrain: HeightMap;

function buildPath(level: LevelDef) {
  path.length = 0;
  z0 = level.z0;
  let z = z0;
  for (let i = 0; i < level.hairpins; i++) {
    const t = level.hairpins <= 1 ? 0 : i / (level.hairpins - 1);
    const tNext = level.hairpins <= 1 ? 0 : (i + 1) / (level.hairpins - 1);
    const amp = sampleLevelParam(level.roadAmp, t);
    const ampNext = sampleLevelParam(level.roadAmp, tNext);
    const radius = sampleLevelParam(level.turnRadius, t);
    const goingRight = i % 2 === 0;
    const x0 = goingRight ? -amp : amp;
    const x1 = goingRight ? amp : -amp;
    for (let s = 0; s < STRAIGHT_SAMPLES; s++) {
      if (i > 0 && s === 0) continue;
      path.push(vec3(lerp(x0, x1, s / STRAIGHT_SAMPLES), 0, z));
    }
    if (i >= level.hairpins - 1) {
      path.push(vec3(x1, 0, z));
      continue;
    }
    for (let s = 1; s <= TURN_SAMPLES; s++) {
      const u = s / TURN_SAMPLES;
      if (goingRight) {
        const a = lerp(-PI / 2, PI / 2, u);
        const xOuter = lerp(amp, ampNext, u);
        path.push(vec3(xOuter + radius * cos(a), 0, z + radius + radius * sin(a)));
      } else {
        const a = lerp(PI / 2, PI * 1.5, u);
        const xOuter = lerp(-amp, -ampNext, u);
        path.push(vec3(xOuter + radius * cos(a), 0, z + radius - radius * sin(a)));
      }
    }
    z += 2 * radius;
  }
  endZ = z;
  const end = path[path.length - 1];
  const prev = path[path.length - 2];
  const dx = end.x - prev.x;
  const dz = end.z - prev.z;
  const len = hypot(dx, dz);
  endDirX = dx / len;
  endDirZ = dz / len;
  finishPos.x = end.x - endDirX * (FINISH_LENGTH / 2);
  finishPos.z = end.z - endDirZ * (FINISH_LENGTH / 2);
}

function cappedRoadDistance(x: number, z: number, bestI: number, bestD: number) {
  if (bestI !== path.length - 1) return bestD;
  const end = path[bestI];
  const past = (x - end.x) * endDirX + (z - end.z) * endDirZ;
  if (past <= 0) return bestD;
  return Math.max(bestD, ROAD_WIDTH / 2 + past);
}

function baseHill(x: number, z: number) {
  const nx = x / (MAP_SIZE / 2);
  const climb = clamp((z - z0) / (endZ - z0));
  const sides = clamp(1 - nx * nx * 1.05);
  const noise = noise2D(x * 0.03, z * 0.03) * 0.12 + noise2D(x * 0.08, z * 0.08) * 0.04;
  const raw = clamp(climb * sides * (1 + noise));
  const d = hypot(x - finishPos.x, z - finishPos.z);
  if (d < FLATTEN_RADIUS) {
    const top = clamp(1 * (1 - nx * nx * 1.05));
    return lerp(raw, top, 1 - smoothStep(d / FLATTEN_RADIUS));
  }
  return raw;
}

export function roadDistance(x: number, z: number) {
  let best = 1e9;
  let bestI = 0;
  for (let i = 0; i < path.length; i++) {
    const d = hypot(x - path[i].x, z - path[i].z);
    if (d < best) {
      best = d;
      bestI = i;
    }
  }
  return cappedRoadDistance(x, z, bestI, best);
}

export function atFinish(x: number, z: number) {
  return abs(x - finishPos.x) <= FINISH_LENGTH / 2 && abs(z - finishPos.z) <= ROAD_WIDTH / 2;
}

export function celebrateFinish() {
  const pos = vec3(finishPos.x, terrain.getHeight(finishPos) + 1.8, finishPos.z);
  for (const hue of [0, 0.1, 0.16, 0.33, 0.58, 0.78]) {
    const confetti = new ParticleEmitter3D(
      pos,
      vec3(FINISH_LENGTH, 1, ROAD_WIDTH),
      2.8,
      70,
      1.35,
      undefined,
      hsl(hue, 0.9, 0.62),
      hsl(hue, 0.85, 0.48),
      hsl(hue, 0.75, 0.55, 0),
      hsl(hue, 0.75, 0.4, 0),
      2.2,
      0.55,
      0.28,
      0.18,
      0.99,
      -0.005,
      0.35,
      0.45,
    );
    confetti.angleSpeed = 0.28;
    confetti.castShadow = false;
    for (let n = 0; n < 12; n++) confetti.emitParticle();
  }
}

export function startPose() {
  const a = path[0];
  const b = path[1];
  return { pos: a.copy(), yaw: atan2(a.x - b.x, a.z - b.z) };
}

export function hillCenter() {
  return vec3(0, 4, (z0 + endZ) / 2);
}

export function buildHill(level: LevelDef) {
  buildPath(level);

  const heights: number[][] = [];
  const colors: Color[][] = [];
  const grass = hsl(0.32, 0.52, 0.34);
  const rock = hsl(0.08, 0.22, 0.4);
  const dirt = hsl(0.09, 0.4, 0.28);
  const asphalt = hsl(0, 0, 0.2);

  for (let r = 0; r < SAMPLES; r++) {
    const heightRow: number[] = [];
    const colorRow: Color[] = [];
    for (let c = 0; c < SAMPLES; c++) {
      const x = (c / (SAMPLES - 1) - 0.5) * MAP_SIZE;
      const z = (r / (SAMPLES - 1) - 0.5) * MAP_SIZE;
      const hill = baseHill(x, z);
      let bestD = 1e9;
      let bestI = 0;
      for (let i = 0; i < path.length; i++) {
        const d = hypot(x - path[i].x, z - path[i].z);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
      const rp = path[bestI];
      bestD = cappedRoadDistance(x, z, bestI, bestD);
      const blend = smoothStep(clamp((bestD - ROAD_WIDTH / 2) / SHOULDER));
      heightRow.push(lerp(baseHill(rp.x, rp.z), hill, blend));
      if (bestD < ROAD_WIDTH / 2) colorRow.push(asphalt);
      else if (bestD < ROAD_WIDTH / 2 + 1.8) colorRow.push(dirt);
      else colorRow.push(grass.lerp(rock, hill * 0.85));
    }
    heights.push(heightRow);
    colors.push(colorRow);
  }

  terrain = new HeightMap(heights, vec2(MAP_SIZE), PEAK_HEIGHT, colors, vec3(), true);

  const points: Vector3[] = [];
  for (const p of path) {
    const q = p.copy();
    q.y = terrain.getHeight(q) + 0.12;
    points.push(q);
  }
  const road = new EngineObject3D(vec3(), buildRibbon(points, ROAD_WIDTH, hsl(0, 0, 0.18)));
  road.castShadow = false;

  const light = hsl(0, 0, 0.95);
  const dark = hsl(0, 0, 0.14);
  const finish = new EngineObject3D(
    finishPos,
    buildGrid(vec2(FINISH_LENGTH, ROAD_WIDTH), vec2(FINISH_LENGTH, ROAD_WIDTH), (x, z) =>
      (Math.floor(x) + Math.floor(z)) & 1 ? light : dark,
    ),
  );
  finish.pos3D.y = terrain.getHeight(finishPos) + 0.16;
  finish.castShadow = false;

  return terrain;
}
