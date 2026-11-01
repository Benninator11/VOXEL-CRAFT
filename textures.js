'use strict';
// ===== Prozedurale Pixel-Texturen (16x16) in einem Atlas =====
const TS = 16, AT = 16;
const atlas = document.createElement('canvas');
atlas.width = atlas.height = TS * AT;
const actx = atlas.getContext('2d', { willReadFrequently: true });
let _s = 987654321;
const R = () => { _s = (Math.imul(_s, 1664525) + 1013904223) >>> 0; return _s / 4294967296; };
const cl = (v) => Math.max(0, Math.min(255, v | 0));
function px(t, x, y, c, a) {
  if (x < 0 || y < 0 || x >= TS || y >= TS) return;
  const ox = (t % AT) * TS, oy = Math.floor(t / AT) * TS;
  actx.clearRect(ox + x, oy + y, 1, 1);
  actx.fillStyle = 'rgba(' + cl(c[0]) + ',' + cl(c[1]) + ',' + cl(c[2]) + ',' + (a === undefined ? 1 : a / 255) + ')';
  actx.fillRect(ox + x, oy + y, 1, 1);
}
function tile(t, fn) { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const c = fn(x, y); if (c) px(t, x, y, c, c[3]); } }
const jit = (b, v) => { const n = (R() - 0.5) * 2 * v; return [b[0] + n, b[1] + n, b[2] + n * 0.9]; };
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const T = { white: 0, grassTop: 1, grassSide: 2, dirt: 3, stone: 4, sand: 5, water: 6, logSide: 7, logTop: 8, leaves: 9, planks: 10, coal: 11, iron: 12, cobble: 13, glass: 14, tntSide: 15, tntTop: 16, tntBot: 17, benchTop: 18, benchSide: 19, furnFront: 20, furnSide: 21, furnTop: 22, bedTop: 23, bedSide: 24, enchTop: 25, enchSide: 26, crack: 30, mob: 40, skin: 41 };
const ITEMTILE = { 109: 80, 110: 81, 111: 82, 112: 83, 100: 48, 101: 49, 102: 50, 103: 51, 104: 52, 105: 53, 106: 54, 107: 55, 108: 56, 113: 57, 114: 58, 115: 84, 116: 85, 117: 86, 118: 87, 119: 88, 120: 89, 121: 90, 122: 91 };

function stoneBase(x, y) { const b = 124 + Math.sin(x * 1.3 + y * 0.7) * 5 + (R() - 0.5) * 16; return [b, b, b + 3]; }
function genTextures() {
  tile(T.white, () => [255, 255, 255]);
  tile(T.grassTop, () => { const g = jit([92, 158, 54], 16); if (R() < 0.08) return shade(g, 0.8); return g; });
  const drop = []; for (let x = 0; x < 16; x++) drop[x] = 3 + Math.floor(R() * 3);
  tile(T.grassSide, (x, y) => (y < drop[x] ? jit([92, 158, 54], 14) : jit([121, 85, 58], 12)));
  tile(T.dirt, () => { const c = jit([121, 85, 58], 12); return R() < 0.07 ? shade(c, 0.75) : c; });
  tile(T.stone, (x, y) => { const c = stoneBase(x, y); return R() < 0.06 ? shade(c, 0.8) : c; });
  tile(T.sand, () => jit([219, 207, 144], 9));
  tile(T.water, (x, y) => { const c = jit([42, 96, 205], 10); return (x + y * 2) % 9 === 0 ? mixc(c, [120, 170, 255], 0.5) : c; });
  tile(T.logSide, (x) => { const k = 0.8 + 0.2 * Math.sin(x * 2.1) + (R() - 0.5) * 0.15; return shade([108, 80, 48], k); });
  tile(T.logTop, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (d > 6.5) return jit([92, 66, 38], 8); return Math.floor(Math.hypot(x - 7.5, y - 7.5)) % 2 ? jit([158, 122, 74], 8) : jit([132, 100, 60], 8); });
  tile(T.leaves, () => { if (R() < 0.16) return [0, 0, 0, 0]; const c = jit([50, 132, 42], 26); return c; });
  tile(T.planks, (x, y) => { const row = Math.floor(y / 4), line = y % 4 === 3; let c = jit([172, 135, 78], 8); if (row % 2 ? x === 5 && y % 4 !== 3 : x === 11 && y % 4 !== 3) c = shade(c, 0.78); return line ? shade(c, 0.7) : c; });
  const ore = (t, col) => { const sp = []; for (let i = 0; i < 6; i++) sp.push([2 + R() * 12, 2 + R() * 12]); tile(t, (x, y) => { for (const s of sp) if (Math.hypot(x - s[0], y - s[1]) < 1.9 + R() * 0.5) return jit(col, 14); return stoneBase(x, y); }); };
  ore(T.coal, [36, 36, 38]); ore(T.iron, [214, 166, 126]);
  const seeds = []; for (let i = 0; i < 7; i++) seeds.push([R() * 16, R() * 16, 0.75 + R() * 0.3]);
  const cob = (x, y) => { let b = 1e9, b2 = 1e9, bi = 0; for (let i = 0; i < seeds.length; i++) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) { const d = Math.hypot(x - seeds[i][0] - ox, y - seeds[i][1] - oy); if (d < b) { b2 = b; b = d; bi = i; } else if (d < b2) b2 = d; } return b2 - b < 1.1 ? shade([70, 70, 74], 1) : shade(jit([128, 128, 132], 8), seeds[bi][2]); };
  tile(T.cobble, cob);
  tile(T.glass, (x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; if (e) return [205, 232, 240, 255]; if ((x === y || x === y + 1) && x > 2 && x < 8) return [235, 248, 255, 255]; return [200, 230, 240, 0]; });
  const font = { T: ['111', '010', '010', '010', '010'], N: ['101', '111', '111', '101', '101'] };
  tile(T.tntSide, (x, y) => { if (y >= 5 && y <= 10) { const lx = x - 2; const L = ['T', 'N', 'T']; const ci = Math.floor(lx / 4); if (y >= 6 && y <= 10 && lx >= 0 && lx < 12 && lx % 4 < 3 && ci < 3 && font[L[ci]][y - 6][lx % 4] === '1') return [30, 30, 30]; return jit([228, 224, 214], 6); } return jit([196, 38, 30], 10); });
  tile(T.tntTop, (x, y) => (Math.hypot(x - 7.5, y - 7.5) < 1.6 ? [30, 30, 30] : jit([186, 36, 28], 9)));
  tile(T.tntBot, () => jit([160, 30, 24], 8));
  tile(T.benchTop, (x, y) => (x % 8 === 0 || y % 8 === 0 ? jit([100, 70, 36], 6) : jit([176, 138, 80], 8)));
  tile(T.benchSide, (x, y) => (y < 3 ? jit([96, 66, 34], 6) : (x === 2 || x === 13) && y > 3 ? jit([120, 120, 128], 6) : jit([168, 130, 74], 8)));
  tile(T.furnSide, cob);
  tile(T.furnTop, (x, y) => shade(cob(x, y), 0.85));
  tile(T.furnFront, (x, y) => { if (x > 3 && x < 12 && y > 4 && y < 12) return y > 9 ? [230, 120 + (x % 3) * 25, 30] : [24, 24, 26]; if (x > 4 && x < 11 && y > 1 && y < 4) return [40, 40, 44]; return cob(x, y); });
  tile(T.bedTop, (x, y) => (y < 5 ? jit([240, 240, 240], 5) : jit([190, 40, 48], 10)));
  tile(T.bedSide, (x, y) => (y > 10 ? jit([150, 110, 60], 8) : y < 5 ? jit([205, 50, 58], 8) : jit([230, 230, 230], 6)));
  tile(T.enchTop, (x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; if (e) return [150, 30, 40]; if ((x + y) % 5 === 0) return [90, 220, 230]; return jit([28, 18, 42], 6); });
  tile(T.enchSide, (x, y) => (y < 4 ? [150, 30, 40] : (x * 3 + y) % 11 === 0 ? [140, 90, 220] : jit([32, 22, 46], 6)));
  tile(27, (x, y) => x > 1 && x < 14 && y > 1 && y < 14 ? (y === 7 || y === 8 ? [82, 45, 18] : jit([146, 92, 48], 9)) : [72, 43, 22]);
  tile(28, (x, y) => (y === 3 || y === 12 || x === 3 || x === 12) ? [80, 48, 23] : jit([128, 77, 38], 8));
  // Risse (Abbau-Animation), 10 Stufen
  const pts = []; for (let w = 0; w < 5; w++) { let x = 7 + (R() - 0.5) * 6, y = 7 + (R() - 0.5) * 6, a = R() * 6.28; for (let i = 0; i < 28; i++) { a += (R() - 0.5) * 1.2; x += Math.cos(a) * 0.9; y += Math.sin(a) * 0.9; pts.push([Math.round(x), Math.round(y), i]); } }
  for (let s = 0; s < 10; s++) { const lim = 3 + s * 3; for (const p of pts) if (p[2] < lim) px(T.crack + s, p[0], p[1], [10, 10, 10], 215); }
  tile(T.mob, () => { const n = 205 + R() * 50; return [n, n, n]; });
  tile(T.skin, () => jit([208, 152, 118], 10));
  // ---- Item-Icons ----
  const ol = [24, 18, 14];
  const circle = (t, cx, cy, r, c, v) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r) px(t, x, y, d > r - 0.9 ? shade(c, 0.7) : jit(c, v)); } };
  circle(48, 8, 8, 5, [34, 34, 36], 8); for (const [x, y] of [[6, 6], [9, 7], [7, 10], [10, 5]]) px(48, x, y, [90, 90, 96]);
  circle(49, 8, 8, 5.4, [236, 150, 150], 10); circle(49, 8, 8, 2.5, [250, 200, 200], 6);
  circle(53, 8, 8, 5.4, [150, 90, 50], 10); circle(53, 8, 8, 2.5, [190, 130, 80], 6);
  circle(50, 8, 9, 5, [210, 36, 36], 10); px(50, 6, 7, [255, 150, 150]); px(50, 8, 3, [90, 60, 30]); px(50, 8, 4, [90, 60, 30]); for (const [x, y] of [[9, 3], [10, 3], [10, 4]]) px(50, x, y, [60, 170, 50]);
  const ingot = (t, c) => { for (let y = 5; y < 12; y++) for (let x = 3; x < 14; x++) { const sh = x - 3 > 10 - (y - 5) * 1 ? 0.8 : 1; if (x - (11 - y) >= -4 && x - (11 - y) <= 4 + 3) px(t, x, y, y === 5 || x === 3 ? shade(c, 1.15) : shade(c, sh * (0.85 + (R() - 0.5) * 0.1))); } };
  ingot(54, [226, 226, 232]);
  const handle = (t) => { for (let i = 3; i < 14; i++) { px(t, i - 1, 15 - i, [92, 64, 34]); px(t, i, 15 - i, [128, 92, 50]); } };
  const pick = (t, c) => { handle(t); for (const [x, y] of [[4, 4], [5, 3], [6, 2], [7, 2], [8, 2], [9, 2], [10, 3], [11, 4], [12, 5], [12, 6], [4, 5], [3, 6], [5, 4], [6, 3], [7, 3], [8, 3], [9, 3], [10, 4], [11, 5]]) px(t, x, y, jit(c, 10)); };
  pick(51, [176, 138, 80]); pick(55, [226, 226, 232]);
  const sword = (t, c) => { for (let i = 0; i < 9; i++) { px(t, 13 - i, 2 + i, shade(c, 1.1)); px(t, 12 - i, 2 + i, jit(c, 8)); px(t, 13 - i, 3 + i, shade(c, 0.8)); } for (let i = 0; i < 4; i++) { px(t, 3 + i, 10 + i - 2 + 0, [110, 78, 40]); px(t, 5 + i, 8 + i - 2 + 2, [110, 78, 40]); } px(t, 3, 12, [92, 64, 34]); px(t, 2, 13, [92, 64, 34]); px(t, 2, 14, [92, 64, 34]); };
  sword(52, [176, 138, 80]); sword(56, [226, 226, 232]);
  const toolIcon = (t, col, kind) => {
    for (let i = 3; i < 14; i++) px(t, i - 1, 15 - i, [112, 78, 42]);
    if (kind === 'sword') { for (let i = 0; i < 9; i++) px(t, 13 - i, 2 + i, jit(col, 8)); return; }
    if (kind === 'shovel') { for (const [x, y] of [[6, 2], [7, 2], [5, 3], [6, 3], [7, 3], [8, 3], [5, 4], [6, 4], [7, 4], [8, 4], [6, 5], [7, 5]]) px(t, x, y, jit(col, 8)); return; }
    const points = kind === 'axe' ? [[4, 3], [5, 2], [6, 2], [7, 3], [7, 4], [6, 5], [5, 5]] : [[4, 4], [5, 3], [6, 2], [7, 2], [8, 2], [9, 2], [10, 3], [11, 4], [4, 5], [3, 6], [5, 4], [6, 3], [7, 3], [8, 3], [9, 3], [10, 4]];
    for (const [x, y] of points) px(t, x, y, jit(col, 8));
  };
  toolIcon(57, [112, 112, 118], 'pick'); toolIcon(58, [112, 112, 118], 'sword');
  toolIcon(84, [112, 112, 118], 'axe'); toolIcon(85, [112, 112, 118], 'shovel');
  for (let y = 3; y < 14; y++) px(86, 7, y, [132, 92, 48]);
  tile(87, (x, y) => y > 3 && y < 13 && x > 5 && x < 10 ? (y < 7 ? [255, 224, 112] : [190, 112, 36]) : [0, 0, 0, 0]);
  toolIcon(88, [176, 138, 80], 'axe'); toolIcon(89, [176, 138, 80], 'shovel');
  toolIcon(90, [226, 226, 232], 'axe'); toolIcon(91, [226, 226, 232], 'shovel');

  // ---- neue Biom-Blöcke ----
  tile(60, () => jit([246, 249, 253], 5));
  tile(61, (x, y) => ((x + y) % 7 === 0 ? [214, 238, 255] : jit([160, 200, 240], 8)));
  tile(62, () => jit([192, 102, 52], 10));
  tile(63, () => jit([152, 88, 66], 6));
  tile(64, () => { const c = jit([138, 132, 130], 24); return R() < 0.15 ? shade(c, 0.7) : c; });
  tile(65, (x, y) => (x === 0 || x === 15 ? [18, 84, 30] : x % 4 === 2 && y % 3 === 1 ? [232, 242, 205] : jit([34, 132, 52], 10)));
  tile(66, (x, y) => (Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) > 6.5 ? [18, 84, 30] : jit([54, 152, 62], 10)));
  tile(67, () => (R() < 0.14 ? [0, 0, 0, 0] : jit([30, 88, 56], 18)));
  tile(68, (x) => shade([72, 54, 36], 0.8 + 0.2 * Math.sin(x * 2.3) + (R() - 0.5) * 0.15));
  tile(69, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (d > 6.5) return jit([60, 44, 28], 6); return Math.floor(Math.hypot(x - 7.5, y - 7.5)) % 2 ? jit([112, 84, 54], 6) : jit([90, 66, 42], 6); });
  { const bl = []; for (let x = 0; x < 16; x++) bl[x] = R() < 0.65 ? 5 + Math.floor(R() * 9) : 0;
    tile(70, (x, y) => (bl[x] && y >= 16 - bl[x] ? jit([84, 150, 48], 22) : [0, 0, 0, 0])); }
  const flower = (t, pet) => tile(t, (x, y) => { if ((x === 7 || x === 8) && y >= 8) return jit([60, 130, 40], 10); if (x >= 5 && x <= 10 && y >= 3 && y <= 8 && !((x === 5 || x === 10) && (y === 3 || y === 8)) ) return (x === 7 || x === 8) && (y === 5 || y === 6) ? [250, 230, 90] : jit(pet, 10); if ((x === 4 || x === 11) && y >= 4 && y <= 6) return [0, 0, 0, 0]; if (y > 11 && (x === 5 || x === 10)) return jit([60, 130, 40], 10); return [0, 0, 0, 0]; });
  flower(71, [214, 30, 36]); flower(72, [248, 214, 40]);
  tile(73, () => jit([216, 182, 142], 6));
  tile(74, () => jit([166, 168, 76], 14));
  { const dr = []; for (let x = 0; x < 16; x++) dr[x] = 3 + Math.floor(R() * 3); tile(75, (x, y) => (y < dr[x] ? jit([166, 168, 76], 14) : jit([121, 85, 58], 12))); }
  const circ2 = (t, cx, cy, r, c, v) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r) px(t, x, y, d > r - 0.9 ? shade(c, 0.7) : jit(c, v)); } };
  circ2(80, 8, 8, 5.4, [176, 56, 56], 10); for (const [x, y] of [[6, 6], [9, 8], [7, 10]]) px(80, x, y, [236, 190, 190]);
  circ2(81, 8, 8, 5.4, [112, 62, 36], 10); for (const [x, y] of [[6, 7], [9, 9]]) px(81, x, y, [60, 30, 18]);
  circ2(82, 7, 6, 4.2, [238, 204, 176], 8); for (let i = 0; i < 5; i++) px(82, 10 + i, 9 + i, [235, 235, 225]); px(82, 14, 13, [245, 245, 240]); px(82, 15, 14, [245, 245, 240]);
  circ2(83, 7, 6, 4.2, [200, 130, 50], 10); for (let i = 0; i < 5; i++) px(83, 10 + i, 9 + i, [235, 235, 225]); px(83, 14, 13, [245, 245, 240]); px(83, 15, 14, [245, 245, 240]);
  void ol;
  atlasReady();
}
function atlasReady() { }
genTextures();

// Block-Seitenzuordnung: faces 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
const TILEMAP = {
  1: { t: T.grassTop, s: T.grassSide, b: T.dirt }, 2: T.dirt, 3: T.stone, 4: T.sand, 5: T.water,
  6: { t: T.logTop, s: T.logSide, b: T.logTop }, 7: T.leaves, 8: T.planks, 9: T.coal, 10: T.iron, 11: T.cobble, 12: T.glass,
  13: { t: T.tntTop, s: T.tntSide, b: T.tntBot }, 14: { t: T.benchTop, s: T.benchSide, b: T.planks },
  15: { t: T.furnTop, s: T.furnSide, b: T.furnTop, f: T.furnFront }, 16: { t: T.bedTop, s: T.bedSide, b: T.planks },
  17: { t: T.enchTop, s: T.enchSide, b: T.enchSide }, 31: { t: 27, s: 28, b: 27 },
  18: 60, 19: 61, 20: 62, 21: 63, 22: 64, 23: { t: 66, s: 65, b: 66 }, 24: 67, 25: { t: 69, s: 68, b: 69 },
  26: 70, 27: 71, 28: 72, 29: 73, 30: { t: 74, s: 75, b: 3 },
};
function tileFor(id, face) {
  const m = TILEMAP[id]; if (typeof m === 'number') return m;
  if (face === 2) return m.t; if (face === 3) return m.b;
  if (face === 4 && m.f !== undefined) return m.f;
  return m.s;
}
const cubeTiles = (id) => [0, 1, 2, 3, 4, 5].map((f) => tileFor(id, f));

// UI-Icons (Dataurls)
const iconCache = new Map();
function iconURL(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const src = (t) => [(t % AT) * TS, Math.floor(t / AT) * TS, TS, TS];
  if (id >= 100) { g.drawImage(atlas, ...src(ITEMTILE[id]), 0, 0, 32, 32); }
  else if (id >= 26 && id <= 28) { g.drawImage(atlas, ...src(tileFor(id, 2)), 0, 0, 32, 32); }
  else {
    const face = (t, m, dark) => { g.save(); g.setTransform(...m); g.drawImage(atlas, ...src(t), 0, 0, TS, TS); if (dark) { g.fillStyle = 'rgba(0,0,0,' + dark + ')'; g.fillRect(0, 0, TS, TS); } g.restore(); };
    face(tileFor(id, 2), [1, 0.5, -1, 0.5, 16, 0]);
    face(tileFor(id, 4), [1, 0.5, 0, 1, 0, 8], 0.22);
    face(tileFor(id, 0), [1, -0.5, 0, 1, 16, 16], 0.4);
  }
  const u = c.toDataURL(); iconCache.set(id, u); return u;
}
