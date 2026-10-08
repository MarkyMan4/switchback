import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TILE = 32;
const PAD = 1;
const COLS = 8;
const ROWS = 2;
const CELL = TILE + PAD * 2;

const C = {
  body: [72, 168, 236],
  bodyLight: [150, 210, 248],
  bodyDark: [42, 118, 196],
  outline: [22, 58, 120],
  eye: [18, 20, 36],
  shine: [255, 255, 255],
  blush: [255, 150, 176],
  grass: [86, 148, 52],
  grassLight: [118, 180, 70],
  grassDark: [58, 112, 36],
  grassShadow: [40, 84, 28],
  dirt: [176, 138, 86],
  dirtLight: [204, 170, 114],
  dirtDark: [138, 100, 58],
  dirtShadow: [108, 76, 42],
  pebble: [164, 152, 136],
  pebbleDark: [116, 104, 92],
  pine: [36, 112, 54],
  pineLight: [58, 146, 74],
  pineDark: [22, 82, 40],
  leaf: [52, 132, 56],
  leafLight: [86, 164, 72],
  leafDark: [34, 96, 42],
  trunk: [122, 80, 44],
  trunkDark: [86, 54, 28],
  trunkLight: [148, 104, 62],
  rock: [140, 140, 148],
  rockLight: [184, 184, 190],
  rockDark: [96, 96, 104],
  rockOutline: [64, 64, 72],
  flowerPink: [236, 118, 158],
  flowerYellow: [240, 204, 72],
  flowerWhite: [244, 244, 232],
  stem: [46, 120, 48],
};

function make(w, h) {
  return { w, h, data: new Uint8Array(w * h * 4) };
}

function set(img, x, y, color, a = 255) {
  x = x | 0;
  y = y | 0;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  img.data[i] = color[0];
  img.data[i + 1] = color[1];
  img.data[i + 2] = color[2];
  img.data[i + 3] = a;
}

function get(img, x, y) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return [0, 0, 0, 0];
  const i = (y * img.w + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

function fillEllipse(img, cx, cy, rx, ry, color, a = 255) {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(img, x, y, color, a);
    }
  }
}

function fillRect(img, x, y, w, h, color, a = 255) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) set(img, xx, yy, color, a);
  }
}

function hash(x, y, salt = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function outline(img, color) {
  const edges = [];
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (get(img, x, y)[3] < 128) continue;
      if (
        get(img, x - 1, y)[3] < 128 ||
        get(img, x + 1, y)[3] < 128 ||
        get(img, x, y - 1)[3] < 128 ||
        get(img, x, y + 1)[3] < 128
      ) {
        edges.push([x, y]);
      }
    }
  }
  for (const [x, y] of edges) set(img, x, y, color);
}

function shadeBody(img, cx, cy) {
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const p = get(img, x, y);
      if (p[3] < 128) continue;
      if (p[0] !== C.body[0] || p[1] !== C.body[1]) continue;
      const lit = -(x - cx) * 0.045 - (y - cy) * 0.07;
      if (lit > 0.28) set(img, x, y, C.bodyLight);
      else if (lit < -0.22) set(img, x, y, C.bodyDark);
    }
  }
}

function drawEye(img, cx, cy) {
  fillEllipse(img, cx, cy, 2.15, 3.35, C.eye);
  set(img, cx, cy - 2, C.shine);
  set(img, cx - 1, cy - 1, C.shine);
}

function drawPlayer(pose) {
  const t = make(TILE, TILE);
  const armY = pose === 1 ? [13, 17] : pose === 2 ? [17, 13] : [15, 15];
  const legY = pose === 1 ? [25, 26] : pose === 2 ? [26, 25] : [25, 25];

  fillEllipse(t, 15.5, 14, 11.2, 10.2, C.body);
  fillEllipse(t, 5.2, armY[0], 3.2, 2.6, C.body);
  fillEllipse(t, 25.8, armY[1], 3.2, 2.6, C.body);
  fillEllipse(t, 11, legY[0], 2.8, 3.6, C.body);
  fillEllipse(t, 20, legY[1], 2.8, 3.6, C.body);
  shadeBody(t, 13, 11);
  outline(t, C.outline);
  drawEye(t, 12, 12);
  drawEye(t, 19, 12);
  set(t, 9, 16, C.blush);
  set(t, 8, 16, C.blush);
  set(t, 22, 16, C.blush);
  set(t, 23, 16, C.blush);
  return t;
}

function drawGrass(variant) {
  const t = make(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = hash(x, y, variant);
      const n2 = hash(x, y, variant + 9);
      let color = C.grass;
      if (n > 0.72) color = C.grassLight;
      else if (n < 0.22) color = C.grassDark;
      if (n2 > 0.93) color = C.grassShadow;
      set(t, x, y, color);
    }
  }
  if (variant === 1) {
    for (let i = 0; i < 6; i++) {
      const x = 4 + ((i * 5 + 3) % 24);
      const y = 6 + ((i * 7 + 2) % 20);
      set(t, x, y, C.grassLight);
      set(t, x, y - 1, C.grassLight);
    }
  }
  return t;
}

function drawDirt(pebbles) {
  const t = make(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = hash(x, y, 3);
      let color = C.dirt;
      if (n > 0.7) color = C.dirtLight;
      else if (n < 0.22) color = C.dirtDark;
      if (hash(x, y, 4) > 0.94) color = C.dirtShadow;
      set(t, x, y, color);
    }
  }
  const rocks = pebbles
    ? [[6, 8], [14, 18], [22, 7], [9, 24], [25, 21], [18, 12]]
    : [[10, 14], [21, 20]];
  for (const [x, y] of rocks) {
    set(t, x, y, C.pebble);
    set(t, x + 1, y, C.pebble);
    set(t, x, y + 1, C.pebbleDark);
  }
  return t;
}

function drawDirtEdge() {
  const t = drawDirt(false);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const band = Math.min(x, TILE - 1 - x, y, TILE - 1 - y);
      if (band > 6) continue;
      const n = hash(x, y, 6);
      if (band < 3 || n > 0.4) {
        let color = C.grass;
        if (n > 0.75) color = C.grassLight;
        else if (n < 0.25) color = C.grassDark;
        set(t, x, y, color);
      }
    }
  }
  return t;
}

function fillPineLayer(img, topY, botY, topW, botW, cx, color, dark) {
  for (let y = topY; y <= botY; y++) {
    const p = (y - topY) / Math.max(1, botY - topY);
    const w = topW + (botW - topW) * p;
    const x0 = Math.round(cx - w / 2);
    const x1 = Math.round(cx + w / 2);
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === topY;
      set(img, x, y, edge ? dark : color);
    }
  }
}

function drawPine() {
  const t = make(TILE, TILE);
  fillRect(t, 14, 24, 4, 7, C.trunk);
  fillRect(t, 15, 24, 1, 7, C.trunkLight);
  fillRect(t, 17, 25, 1, 6, C.trunkDark);
  fillPineLayer(t, 14, 25, 6, 22, 15.5, C.pine, C.pineDark);
  fillPineLayer(t, 7, 17, 4, 16, 15.5, C.pine, C.pineDark);
  fillPineLayer(t, 1, 10, 2, 10, 15.5, C.pine, C.pineDark);
  for (const [x, y] of [[12, 8], [14, 5], [16, 12], [11, 18], [18, 16]]) {
    set(t, x, y, C.pineLight);
  }
  outline(t, C.pineDark);
  return t;
}

function drawRoundTree() {
  const t = make(TILE, TILE);
  fillRect(t, 14, 22, 4, 9, C.trunk);
  fillRect(t, 15, 22, 1, 9, C.trunkLight);
  fillEllipse(t, 15.5, 13, 11, 11, C.leaf);
  fillEllipse(t, 12, 10, 5, 5, C.leafLight);
  fillEllipse(t, 20, 16, 4, 4, C.leafDark);
  outline(t, C.leafDark);
  return t;
}

function drawBush() {
  const t = make(TILE, TILE);
  fillEllipse(t, 15.5, 20, 12, 8, C.leaf);
  fillEllipse(t, 10, 18, 7, 7, C.leaf);
  fillEllipse(t, 21, 18, 7, 6.5, C.leaf);
  fillEllipse(t, 15.5, 15, 8, 7, C.leaf);
  fillEllipse(t, 12, 16, 4, 3, C.leafLight);
  outline(t, C.leafDark);
  return t;
}

function drawShrub() {
  const t = make(TILE, TILE);
  fillEllipse(t, 15.5, 22, 10, 6, C.leaf);
  fillEllipse(t, 11, 20, 5, 5, C.leaf);
  fillEllipse(t, 20, 20, 5, 5, C.leaf);
  fillEllipse(t, 15, 18, 4, 4, C.leafLight);
  set(t, 12, 17, C.flowerPink);
  set(t, 13, 17, C.flowerPink);
  set(t, 20, 16, C.flowerWhite);
  set(t, 21, 16, C.flowerWhite);
  set(t, 16, 15, C.flowerYellow);
  outline(t, C.leafDark);
  return t;
}

function drawFern() {
  const t = make(TILE, TILE);
  for (let y = 8; y < 30; y++) set(t, 15, y, C.stem);
  for (let i = 0; i < 7; i++) {
    const y = 10 + i * 2;
    const w = 3 + Math.min(i, 6 - i);
    for (let x = 0; x < w; x++) {
      set(t, 14 - x, y - Math.floor(x / 2), C.leaf);
      set(t, 16 + x, y - Math.floor(x / 2) + 1, C.leaf);
    }
  }
  outline(t, C.leafDark);
  return t;
}

function drawRock() {
  const t = make(TILE, TILE);
  fillEllipse(t, 16, 20, 11, 8, C.rock);
  fillEllipse(t, 12, 18, 5, 4, C.rockLight);
  fillEllipse(t, 22, 22, 4, 3, C.rockDark);
  outline(t, C.rockOutline);
  return t;
}

function drawFlowers() {
  const t = drawGrass(0);
  const blooms = [
    [8, 10, C.flowerPink],
    [18, 8, C.flowerYellow],
    [12, 20, C.flowerWhite],
    [24, 18, C.flowerPink],
    [6, 24, C.flowerYellow],
  ];
  for (const [x, y, color] of blooms) {
    set(t, x, y + 2, C.stem);
    set(t, x, y + 1, C.stem);
    set(t, x, y, color);
    set(t, x + 1, y, color);
    set(t, x, y - 1, color);
    set(t, x - 1, y, color);
  }
  return t;
}

function drawTallGrass() {
  const t = make(TILE, TILE);
  const blades = [
    [6, 28, 10],
    [10, 30, 14],
    [14, 29, 12],
    [18, 31, 16],
    [22, 28, 11],
    [26, 30, 13],
    [8, 26, 8],
    [20, 27, 9],
  ];
  for (const [x, base, h] of blades) {
    for (let i = 0; i < h; i++) {
      const lean = Math.floor(i / 5);
      set(t, x + lean, base - i, i > h - 3 ? C.grassLight : C.grass);
    }
  }
  outline(t, C.grassDark);
  return t;
}

function blit(sheet, col, row, tile) {
  const ox = col * CELL + PAD;
  const oy = row * CELL + PAD;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const p = get(tile, x, y);
      set(sheet, ox + x, oy + y, p, p[3]);
    }
  }
  for (let i = 0; i < TILE; i++) {
    const top = get(tile, i, 0);
    const bot = get(tile, i, TILE - 1);
    const left = get(tile, 0, i);
    const right = get(tile, TILE - 1, i);
    set(sheet, ox + i, oy - 1, top, top[3]);
    set(sheet, ox + i, oy + TILE, bot, bot[3]);
    set(sheet, ox - 1, oy + i, left, left[3]);
    set(sheet, ox + TILE, oy + i, right, right[3]);
  }
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, payload, crc]);
}

function writePNG(path, img) {
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;
    for (let x = 0; x < img.w; x++) {
      const si = (y * img.w + x) * 4;
      const di = y * (img.w * 4 + 1) + 1 + x * 4;
      raw[di] = img.data[si];
      raw[di + 1] = img.data[si + 1];
      raw[di + 2] = img.data[si + 2];
      raw[di + 3] = img.data[si + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
}

const sheet = make(COLS * CELL, ROWS * CELL);
const tiles = [
  drawPlayer(0),
  drawPlayer(1),
  drawPlayer(2),
  drawGrass(0),
  drawGrass(1),
  drawDirt(false),
  drawDirt(true),
  drawDirtEdge(),
  drawPine(),
  drawRoundTree(),
  drawBush(),
  drawShrub(),
  drawFern(),
  drawRock(),
  drawFlowers(),
  drawTallGrass(),
];

tiles.forEach((tile, i) => blit(sheet, i % COLS, Math.floor(i / COLS), tile));

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writePNG(join(root, 'public', 'tiles.png'), sheet);
writePNG(join(root, 'public', 'favicon.png'), drawPlayer(0));
console.log(`wrote public/tiles.png (${sheet.w}x${sheet.h}) and public/favicon.png`);
