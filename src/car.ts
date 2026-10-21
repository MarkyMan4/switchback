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
  vec3,
} from 'littlejsengine';
import { MAP_SIZE, RIDE_HEIGHT, ROAD_WIDTH, roadDistance, terrain } from './hill.ts';

const BODY = hsl(0.02, 0.82, 0.48);
const CABIN = hsl(0.58, 0.15, 0.18);
const WHEEL = hsl(0, 0, 0.12);
const CHARGE_FRAMES = 50;
const BOOST_FRAMES = 42;

export class Car extends EngineObject3D {
  speed = 0;
  yaw = 0;
  spin = 0;
  steer = 0;
  driftDir = 0;
  driftCharge = 0;
  boostTime = 0;
  drifting = false;
  locked = false;
  slide = vec3();
  wheels: EngineObject3D[] = [];
  sparks: ParticleEmitter3D[] = [];

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
  }

  update() {
    const input = keyDirection();
    const offRoad = roadDistance(this.pos3D.x, this.pos3D.z) - ROAD_WIDTH / 2;
    if (this.locked) {
      input.x = 0;
      input.y = 0;
      this.drifting = false;
      this.driftCharge = 0;
    }
    const space = keyIsDown('Space') && !this.locked;
    if (space && this.speed > 0.1 && (this.drifting || input.x)) {
      if (!this.drifting) this.driftDir = sign(input.x);
      this.drifting = true;
      this.driftCharge += 1;
    } else {
      if (this.drifting && this.driftCharge >= CHARGE_FRAMES) {
        this.boostTime = BOOST_FRAMES;
        this.speed += 0.16;
      }
      this.drifting = false;
      this.driftCharge = 0;
    }

    if (this.boostTime > 0) this.boostTime -= 1;
    const boosting = this.boostTime > 0;
    const maxFwd = (offRoad < 0 ? 0.45 : 0.22) + (boosting ? 0.22 : 0);
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

    const sparkRate = this.drifting ? (this.driftCharge >= CHARGE_FRAMES ? 140 : 80) : 0;
    for (const sparks of this.sparks) sparks.emitRate = sparkRate;
  }
}
