import {
  engineInit,
  setCanvasPixelated,
  setTileDefaultPadding,
  setTileDefaultSize,
  vec2,
} from 'littlejsengine';

setCanvasPixelated(true);
setTileDefaultSize(vec2(32));
setTileDefaultPadding(1);

function gameInit() {}

function gameUpdate() {}

function gameUpdatePost() {}

function gameRender() {}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);
