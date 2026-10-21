import {
  WHITE,
  drawTextScreen,
  engineInit,
  engineObjectsDestroy,
  hsl,
  keyWasPressed,
  mainCanvasSize,
  render3D,
  Render3DPlugin,
  setCanvasClearColor,
  vec2,
  vec3,
} from 'littlejsengine';
import { Car } from './car.ts';
import { RIDE_HEIGHT, atFinish, buildHill, celebrateFinish, startPose, terrain } from './hill.ts';

setCanvasClearColor(hsl(0.55, 0.4, 0.72));

let car: Car;
let cleared = false;

function startLevel() {
  buildHill();
  const start = startPose();
  start.pos.y = terrain.getHeight(start.pos) + RIDE_HEIGHT;
  car = new Car(start.pos, start.yaw);
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

  startLevel();
  render3D.camera.follow(car.pos3D, vec3(0, 5, 12).rotateY(car.yaw));
}

function gameUpdate() {
  if (cleared) {
    if (keyWasPressed('Space')) {
      cleared = false;
      engineObjectsDestroy();
      startLevel();
    }
    return;
  }
  if (atFinish(car.pos3D.x, car.pos3D.z)) {
    cleared = true;
    car.locked = true;
    celebrateFinish();
  }
}

function gameUpdatePost() {
  const target = car.pos3D.add(vec3(0, 2, 0));
  render3D.camera.follow(target, vec3(0, 2, 10).rotateY(car.yaw), 0.15);
  render3D.shadowCenter = car.pos3D;
}

function gameRender() {}

function gameRenderPost() {
  if (cleared) {
    drawTextScreen(
      'Finish!\nPress space to go to the next level',
      vec2(mainCanvasSize.x / 2, 78),
      36,
      WHITE,
      5,
    );
    return;
  }
  drawTextScreen(
    'arrows / WASD: drive   space: drift',
    vec2(mainCanvasSize.x / 2, mainCanvasSize.y - 36),
    24,
    WHITE,
    4,
  );
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
