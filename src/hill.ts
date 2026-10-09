import type { Color, Vector3 } from 'littlejsengine';
import {
  EngineObject3D,
  HeightMap,
  PI,
  atan2,
  buildRibbon,
  clamp,
  cos,
  hsl,
  hypot,
  lerp,
  noise2D,
  render3D,
  sin,
  smoothStep,
  vec2,
  vec3,
} from 'littlejsengine';

export const MAP_SIZE = 400;
export const ROAD_WIDTH = 11;
export const PEAK_HEIGHT = 34;
export const RIDE_HEIGHT = 0.38;

const SAMPLES = 97;
const HAIRPINS = 7;
const ROAD_AMP = 38;
const TURN_RADIUS = 16;
const Z0 = -50;
const SHOULDER = 12;
const STRAIGHT_SAMPLES = 40;
const TURN_SAMPLES = 36;
const FINISH_Z = Z0 + (HAIRPINS - 1) * 2 * TURN_RADIUS + 0.6;
const FLATTEN_RADIUS = 12;

export const finishPos = vec3((HAIRPINS - 1) % 2 === 0 ? -ROAD_AMP : ROAD_AMP, 0, FINISH_Z);

const path: Vector3[] = [];
export let terrain: HeightMap;

function buildPath() {
  path.length = 0;
  for (let i = 0; i < HAIRPINS; i++) {
    const z = Z0 + i * 2 * TURN_RADIUS;
    const goingRight = i % 2 === 0;
    const x0 = goingRight ? -ROAD_AMP : ROAD_AMP;
    const x1 = goingRight ? ROAD_AMP : -ROAD_AMP;
    for (let s = 0; s < STRAIGHT_SAMPLES; s++) {
      if (i > 0 && s === 0) continue;
      path.push(vec3(lerp(x0, x1, s / STRAIGHT_SAMPLES), 0, z));
    }
    if (i >= HAIRPINS - 1) {
      path.push(vec3(x1, 0, z));
      continue;
    }
    for (let s = 1; s <= TURN_SAMPLES; s++) {
      const u = s / TURN_SAMPLES;
      if (goingRight) {
        const a = lerp(-PI / 2, PI / 2, u);
        path.push(vec3(ROAD_AMP + TURN_RADIUS * cos(a), 0, z + TURN_RADIUS + TURN_RADIUS * sin(a)));
      } else {
        const a = lerp(PI / 2, PI * 1.5, u);
        path.push(vec3(-ROAD_AMP + TURN_RADIUS * cos(a), 0, z + TURN_RADIUS - TURN_RADIUS * sin(a)));
      }
    }
  }
}

function baseHill(x: number, z: number) {
  const nx = x / (MAP_SIZE / 2);
  const climb = clamp((z - Z0) / (FINISH_Z - Z0));
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
  for (const p of path) {
    const d = hypot(x - p.x, z - p.z);
    if (d < best) best = d;
  }
  return best;
}

export function startPose() {
  const a = path[0];
  const b = path[1];
  return { pos: a.copy(), yaw: atan2(a.x - b.x, a.z - b.z) };
}

export function buildHill() {
  buildPath();

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

  const finishY = terrain.getHeight(finishPos) + 0.14;
  const finish = new EngineObject3D(finishPos, render3D.planeMesh, undefined, hsl(0.35, 0.65, 0.58));
  finish.pos3D.y = finishY;
  finish.scale3D = vec3(12, 1, 12);
  finish.castShadow = false;

  return terrain;
}
