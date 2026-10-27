import type { Vector3 } from 'littlejsengine';
import {
  EngineObject3D,
  PI,
  ParticleEmitter3D,
  abs,
  atan2,
  buildBox,
  buildCylinder,
  clamp,
  hsl,
  keyDirection,
  keyIsDown,
  lerp,
  sign,
  timeDelta,
  vec3,
} from 'littlejsengine';
import { MAP_SIZE, RIDE_HEIGHT, ROAD_WIDTH, roadDistance, terrain } from './hill.ts';

export const TIRE_HEALTH_MAX = 100;
const TIRE_DRAIN_PER_SEC = 8;
const TIRE_DRAIN_DISTANCE = 18;

const BODY = hsl(0.02, 0.82, 0.48);
const CABIN = hsl(0.58, 0.15, 0.18);
const WHEEL = hsl(0, 0, 0.12);
const TURBOS = [
  { charge: 250, frames: 37, kick: 0.07, bonus: 0.1, hue: 0.58 },
  { charge: 660, frames: 100, kick: 0.13, bonus: 0.2, hue: 0.07 },
  { charge: 1100, frames: 180, kick: 0.34, bonus: 0.5, hue: 0.82 },
];

export class Car extends EngineObject3D {
  speed = 0;
  yaw = 0;
  spin = 0;
  steer = 0;
  driftDir = 0;
  driftCharge = 0;
  boostTime = 0;
  boostLevel = 0;
  drifting = false;
  locked = false;
  tireHealth = TIRE_HEALTH_MAX;
  slide = vec3();
  wheels: EngineObject3D[] = [];
  sparks: ParticleEmitter3D[] = [];
  flames: ParticleEmitter3D[] = [];
  smoke: ParticleEmitter3D[] = [];

  constructor(pos: Vector3, yaw: number) {
    super(pos);
    this.yaw = yaw;
    this.rotation3D.y = yaw;
    this.specular = 0.5;

    this.addChild(new EngineObject3D(vec3(0, 0.14, 0), buildBox(vec3(1.7, 0.5, 4)), undefined, BODY));
    this.addChild(new EngineObject3D(vec3(0, 0.57, 0.35), buildBox(vec3(1.5, 0.48, 1.9)), undefined, CABIN));

    const wheelMesh = buildCylinder(0.76, 0.3, 16);
    const track = 0.92;
    const wheelbase = 1.25;
    for (const x of [-track, track]) {
      for (const z of [-wheelbase, wheelbase]) {
        const wheel = new EngineObject3D(vec3(x, 0, z), wheelMesh, undefined, WHEEL);
        wheel.rotation3D.z = PI / 2;
        this.addChild(wheel);
        this.wheels.push(wheel);
      }
    }

    for (const x of [-track, track]) {
      const sparks = new ParticleEmitter3D(
        vec3(x, -0.28, wheelbase),
        0.12,
        0,
        0,
        0.9,
        undefined,
        hsl(0.12, 1, 0.7),
        hsl(0.06, 1, 0.5),
        hsl(0.08, 1, 0.45, 0),
        hsl(0.02, 1, 0.3, 0),
        0.28,
        0.14,
        0.02,
        0.07,
        0.9,
        0.004,
        0.35,
        0.45,
        true,
      );
      sparks.trailTime = 0.1;
      this.addChild(sparks);
      this.sparks.push(sparks);
    }

    for (const x of [-0.38, 0.38]) {
      const flames = new ParticleEmitter3D(
        vec3(x, 0.16, 1.95),
        0.18,
        0,
        0,
        0.4,
        undefined,
        hsl(0.12, 1, 0.62),
        hsl(0.07, 1, 0.52),
        hsl(0.02, 1, 0.4, 0),
        hsl(0.04, 1, 0.35, 0),
        0.4,
        0.5,
        0.1,
        0.22,
        0.94,
        0.004,
        0.45,
        0.4,
        true,
      );
      flames.rotation3D.x = PI / 2;
      flames.castShadow = false;
      this.addChild(flames);
      this.flames.push(flames);
    }

    for (const x of [-track, track]) {
      const smoke = new ParticleEmitter3D(
        vec3(x, 0.12, wheelbase),
        0.35,
        0,
        0,
        0.85,
        undefined,
        hsl(0.08, 0.05, 0.55, 0.5),
        hsl(0.06, 0.04, 0.38, 0.4),
        hsl(0.08, 0.02, 0.42, 0),
        hsl(0.05, 0.02, 0.22, 0),
        1.15,
        0.32,
        1.15,
        0.018,
        0.96,
        0.006,
        0.4,
        0.4,
        false,
      );
      smoke.castShadow = false;
      this.addChild(smoke);
      this.smoke.push(smoke);
    }
  }

  update() {
    const input = keyDirection();
    const offRoad = roadDistance(this.pos3D.x, this.pos3D.z) - ROAD_WIDTH / 2;
    if (!this.locked && offRoad >= 0) {
      const intensity = 1 + clamp(offRoad / TIRE_DRAIN_DISTANCE) * 2;
      this.tireHealth = clamp(this.tireHealth - TIRE_DRAIN_PER_SEC * intensity * timeDelta, 0, TIRE_HEALTH_MAX);
    }
    if (this.locked) {
      input.x = 0;
      input.y = 0;
      this.drifting = false;
      this.driftCharge = 0;
      this.boostTime = 0;
      this.boostLevel = 0;
    }
    const space = keyIsDown('Space') && !this.locked;
    if (space && this.speed > 0.1 && (this.drifting || input.x)) {
      if (!this.drifting) this.driftDir = sign(input.x);
      this.drifting = true;
      this.driftCharge += input.x * this.driftDir > 0 ? 5 : 2;
      if (this.driftCharge > TURBOS[2].charge) this.driftCharge = TURBOS[2].charge;
    } else {
      if (this.drifting) {
        let tier = 0;
        for (let i = 0; i < TURBOS.length; i++) if (this.driftCharge >= TURBOS[i].charge) tier = i + 1;
        if (tier > 0) {
          const turbo = TURBOS[tier - 1];
          this.boostTime = turbo.frames;
          this.boostLevel = tier;
          this.speed += turbo.kick;
        }
      }
      this.drifting = false;
      this.driftCharge = 0;
    }

    if (this.boostTime > 0) {
      this.boostTime -= 1;
      if (this.boostTime === 0) this.boostLevel = 0;
    }
    const boosting = this.boostTime > 0;
    const bonus = this.boostLevel > 0 ? TURBOS[this.boostLevel - 1].bonus : 0;
    const maxFwd = (offRoad < 0 ? 0.45 : 0.22) + (boosting ? bonus : 0);
    this.speed += input.y * (boosting ? 0.016 : 0.01);
    this.speed *= offRoad < 0 ? (boosting ? 0.993 : 0.99) : 0.95;
    if (this.locked) this.speed *= 0.8;
    this.speed = clamp(this.speed, -0.12, maxFwd);

    const inward = input.x * this.driftDir;
    const tightness = inward >= 0 ? lerp(0.4, 1.5, inward) : lerp(0.4, 0.06, -inward);
    const turn = this.drifting ? this.driftDir * 0.024 * tightness : input.x * 0.03;
    this.yaw -= turn * clamp(abs(this.speed) * 5) * sign(this.speed);

    const forward = vec3(0, 0, -1).rotateY(this.yaw);
    if (this.drifting) this.slide = this.slide.lerp(forward.scale(this.speed), 0.08);
    else this.slide = forward.scale(this.speed);
    this.pos3D = this.pos3D.add(this.slide);
    const limit = MAP_SIZE / 2 - 4;
    this.pos3D.x = clamp(this.pos3D.x, -limit, limit);
    this.pos3D.z = clamp(this.pos3D.z, -limit, limit);
    this.pos3D.y = terrain.getHeight(this.pos3D) + RIDE_HEIGHT;
    const ahead = this.pos3D.add(forward.scale(1.5));
    const behind = this.pos3D.subtract(forward.scale(1.5));
    const rise = terrain.getHeight(ahead) - terrain.getHeight(behind);
    const roll = lerp(this.rotation3D.z, this.drifting ? -this.driftDir * 0.28 : 0, 0.2);
    this.rotation3D = vec3(atan2(rise, 3), this.yaw, roll);

    this.spin -= this.speed / RIDE_HEIGHT;
    const steerTarget = this.drifting ? -this.driftDir * 0.7 - input.x * 0.2 : -input.x * 0.5;
    this.steer = lerp(this.steer, steerTarget, 0.2);
    for (const wheel of this.wheels) {
      const steer = wheel.pos3D.z < 0 ? this.steer : 0;
      wheel.rotation3D = vec3(this.spin, steer, PI / 2);
    }

    let tier = 0;
    if (this.drifting) for (let i = 0; i < TURBOS.length; i++) if (this.driftCharge >= TURBOS[i].charge) tier = i + 1;
    const hue = tier === 0 ? 0.13 : TURBOS[tier - 1].hue;
    const sparkRate = this.drifting ? 50 + tier * 45 : 0;
    for (const sparks of this.sparks) {
      sparks.emitRate = sparkRate;
      sparks.sizeStart = 0.1 + tier * 0.05;
      sparks.colorStartA = hsl(hue, 1, tier === 0 ? 0.55 : 0.65);
      sparks.colorStartB = hsl(hue, 1, tier === 0 ? 0.4 : 0.5);
      sparks.colorEndA = hsl(hue, 1, 0.45, 0);
      sparks.colorEndB = hsl(hue, 0.9, 0.3, 0);
    }

    const flameRate = this.drifting || this.boostLevel === 0 ? 0 : 160 + this.boostLevel * 80;
    for (const flames of this.flames) {
      flames.emitRate = flameRate;
      flames.sizeStart = 0.24 + this.boostLevel * 0.16;
    }

    const worn = this.tireHealth < 50;
    const critical = this.tireHealth < 10;
    const smokeRate = !worn ? 0 : critical ? 110 : 28;
    for (const smoke of this.smoke) {
      smoke.emitRate = smokeRate;
      smoke.sizeStart = critical ? 0.62 : 0.32;
      smoke.sizeEnd = critical ? 2.1 : 1.15;
      smoke.speed = critical ? 0.03 : 0.018;
      smoke.colorStartA = hsl(0.08, 0.05, critical ? 0.42 : 0.55, critical ? 0.62 : 0.5);
      smoke.colorStartB = hsl(0.06, 0.04, critical ? 0.22 : 0.38, critical ? 0.5 : 0.4);
    }
  }
}
