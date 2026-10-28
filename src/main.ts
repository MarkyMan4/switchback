import {
  BLACK,
  WHITE,
  drawRect,
  drawTextScreen,
  engineInit,
  engineObjectsDestroy,
  hsl,
  keyWasPressed,
  mainCanvasSize,
  render3D,
  timeDelta,
  Render3DPlugin,
  setCanvasClearColor,
  vec2,
  vec3,
} from 'littlejsengine';
import { Car, TIRE_HEALTH_MAX } from './car.ts';
import { RIDE_HEIGHT, atFinish, buildHill, celebrateFinish, hillCenter, startPose, terrain } from './hill.ts';
import { LEVELS } from './levels.ts';

setCanvasClearColor(hsl(0.55, 0.4, 0.72));

let car: Car;
let cleared = false;
let blownTires = false;
let raceStarted = false;
let raceTime = 0;
let levelIndex = 0;

function queryParams() {
  return new URLSearchParams(location.search);
}

function initialLevelIndex() {
  const param = Number(queryParams().get('level'));
  if (Number.isInteger(param) && param >= 1 && param <= LEVELS.length) return param - 1;
  return 0;
}

function overviewMode() {
  return queryParams().has('overview');
}

function formatRaceTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  const whole = Math.floor(secs);
  const hundredths = Math.floor((secs - whole) * 100);
  return `${mins}:${String(whole).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function levelLabel() {
  const level = LEVELS[levelIndex];
  return `Level ${levelIndex + 1}  ${level.name}`;
}

function startLevel() {
  buildHill(LEVELS[levelIndex]);
  const start = startPose();
  start.pos.y = terrain.getHeight(start.pos) + RIDE_HEIGHT;
  car = new Car(start.pos, start.yaw);
  blownTires = false;
  raceStarted = false;
  raceTime = 0;
}

function restartLevel() {
  cleared = false;
  engineObjectsDestroy();
  startLevel();
}

function tireBarColor() {
  if (car.tireHealth < 10) return hsl(0.02, 0.85, 0.52);
  if (car.tireHealth < 50) return hsl(0.1, 0.9, 0.52);
  return hsl(0.32, 0.7, 0.48);
}

function drawTireHud() {
  const center = vec2(mainCanvasSize.x / 2, 96);
  const size = vec2(240, 16);
  const inner = vec2(size.x - 6, size.y - 6);
  const fillWidth = inner.x * (car.tireHealth / TIRE_HEALTH_MAX);
  drawRect(center, size, BLACK, 0, false, true);
  drawRect(center, vec2(size.x - 4, size.y - 4), hsl(0, 0, 0.12), 0, false, true);
  if (fillWidth > 0) {
    const left = center.x - inner.x / 2;
    drawRect(vec2(left + fillWidth / 2, center.y), vec2(fillWidth, inner.y), tireBarColor(), 0, false, true);
  }
  drawTextScreen('TIRES', vec2(center.x, center.y), 12, WHITE, 3);
}

function gameInit() {
  new Render3DPlugin();
  render3D.setSky(hsl(0.58, 0.7, 0.55), hsl(0.55, 0.35, 0.72), hsl(0.32, 0.45, 0.38));
  render3D.setFog(50, 160);
  render3D.sunDirection = vec3(-0.4, 1, 0.35);
  render3D.ambientColor = hsl(0.55, 0.15, 0.45);
  render3D.shadows = true;
  render3D.shadowRange = 90;
  render3D.shadowMapSize = 2048;

  levelIndex = initialLevelIndex();
  startLevel();
  if (overviewMode()) render3D.setFog(280, 520);
  render3D.camera.follow(car.pos3D, vec3(0, 5, 12).rotateY(car.yaw));
}

function gameUpdate() {
  if (cleared) {
    if (keyWasPressed('Space')) {
      cleared = false;
      levelIndex = (levelIndex + 1) % LEVELS.length;
      engineObjectsDestroy();
      startLevel();
    }
    return;
  }
  if (blownTires) {
    if (keyWasPressed('Space')) restartLevel();
    return;
  }
  if (car.tireHealth <= 0) {
    blownTires = true;
    car.locked = true;
    return;
  }
  if (atFinish(car.pos3D.x, car.pos3D.z)) {
    cleared = true;
    car.locked = true;
    celebrateFinish();
  }
}

function gameUpdatePost() {
  if (!raceStarted && car.speed !== 0) raceStarted = true;
  if (raceStarted && !cleared && !blownTires) raceTime += timeDelta;

  if (overviewMode()) {
    const look = hillCenter();
    render3D.camera.follow(look, vec3(90, 70, 110), 1);
    render3D.shadowCenter = look;
    return;
  }

  const target = car.pos3D.add(vec3(0, 2, 0));
  render3D.camera.follow(target, vec3(0, 2, 10).rotateY(car.yaw), 0.15);
  render3D.shadowCenter = car.pos3D;
}

function gameRender() {}

function gameRenderPost() {
  if (cleared) {
    const last = levelIndex === LEVELS.length - 1;
    const prompt = last ? 'Press space to play again from level 1' : 'Press space to go to the next level';
    drawTextScreen(
      `${levelLabel()}\nFinish!\n${formatRaceTime(raceTime)}\n${prompt}`,
      vec2(mainCanvasSize.x / 2, 108),
      36,
      WHITE,
      5,
    );
    return;
  }
  if (blownTires) {
    drawTextScreen(levelLabel(), vec2(mainCanvasSize.x / 2, 28), 26, WHITE, 4);
    drawTireHud();
    drawTextScreen(
      'Tires blown!\nPress space to restart',
      vec2(mainCanvasSize.x / 2, 160),
      36,
      WHITE,
      5,
    );
    return;
  }
  drawTextScreen(levelLabel(), vec2(mainCanvasSize.x / 2, 28), 26, WHITE, 4);
  drawTextScreen(formatRaceTime(raceTime), vec2(mainCanvasSize.x / 2, 62), 32, WHITE, 4);
  drawTireHud();
  drawTextScreen(
    'arrows / WASD: drive   space: drift',
    vec2(mainCanvasSize.x / 2, mainCanvasSize.y - 36),
    24,
    WHITE,
    4,
  );
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
