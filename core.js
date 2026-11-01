'use strict';
// ===== Voxel Survival: Welt, Meshing, Rendering (keine Abhängigkeiten) =====
const CS = 16, CH = 64, SEA = 20, VOL = CS * CS * CH;
const BIOMES = ['Ebene', 'Wald', 'Wüste', 'Gebirge', 'Tundra', 'Taiga', 'Dschungel', 'Savanne', 'Mesa', 'Sumpf', 'Ozean', 'Strand', 'Fluss'];
// id: [name, farbe, härte]
const BLOCKS = [
  null,
  { n: 'Gras', c: [0.33, 0.62, 0.22], h: 0.6 },
  { n: 'Erde', c: [0.47, 0.33, 0.2], h: 0.5 },
  { n: 'Stein', c: [0.5, 0.5, 0.52], h: 1.5 },
  { n: 'Sand', c: [0.85, 0.8, 0.55], h: 0.5 },
  { n: 'Wasser', c: [0.2, 0.4, 0.85], h: 99 },
  { n: 'Holz', c: [0.4, 0.27, 0.14], h: 1.0 },
  { n: 'Blätter', c: [0.16, 0.45, 0.14], h: 0.25 },
  { n: 'Bretter', c: [0.72, 0.56, 0.3], h: 0.8 },
  { n: 'Kohleerz', c: [0.3, 0.3, 0.32], h: 2 },
  { n: 'Eisenerz', c: [0.65, 0.5, 0.42], h: 2.5 },
  { n: 'Bruchstein', c: [0.42, 0.42, 0.45], h: 1.6 },
  { n: 'Glas', c: [0.72, 0.88, 0.95], h: 0.3 },
  { n: 'TNT', c: [0.85, 0.2, 0.15], h: 0.1 },
  { n: 'Werkbank', c: [0.6, 0.4, 0.2], h: 1 },
  { n: 'Ofen', c: [0.35, 0.35, 0.38], h: 1.5 },
  { n: 'Bett', c: [0.8, 0.2, 0.25], h: 0.3 },
  { n: 'Zaubertisch', c: [0.3, 0.1, 0.45], h: 1.5 },
  { n: 'Schnee', c: [0.95, 0.97, 1], h: 0.2 },
  { n: 'Eis', c: [0.6, 0.78, 0.95], h: 0.5 },
  { n: 'Rotsand', c: [0.75, 0.4, 0.2], h: 0.5 },
  { n: 'Ton', c: [0.59, 0.34, 0.26], h: 1.2 },
  { n: 'Kies', c: [0.52, 0.5, 0.5], h: 0.6 },
  { n: 'Kaktus', c: [0.2, 0.5, 0.2], h: 0.4 },
  { n: 'Fichtennadeln', c: [0.11, 0.33, 0.2], h: 0.25 },
  { n: 'Fichtenholz', c: [0.27, 0.2, 0.13], h: 1 },
  { n: 'Gras', c: [0.35, 0.65, 0.25], h: 0.05 },
  { n: 'Rote Blume', c: [0.8, 0.1, 0.1], h: 0.05 },
  { n: 'Gelbe Blume', c: [0.9, 0.8, 0.1], h: 0.05 },
  { n: 'Heller Ton', c: [0.84, 0.7, 0.55], h: 1.2 },
  { n: 'Trockengras', c: [0.65, 0.65, 0.3], h: 0.6 },
  { n: 'Truhe', c: [0.48, 0.3, 0.14], h: 2.5 },
];
const PLANT = (b) => b >= 26 && b <= 28;
const isSolid = (b) => b !== 0 && b !== 5 && !PLANT(b);

// ---------- Rauschen ----------
let SEED = 1;
function hash3(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + (SEED + s) * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const sm = (t) => t * t * (3 - 2 * t);
function noise2(x, z, s) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = sm(x - ix), fz = sm(z - iz);
  const a = hash3(ix, 0, iz, s), b = hash3(ix + 1, 0, iz, s), c = hash3(ix, 0, iz + 1, s), d = hash3(ix + 1, 0, iz + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function noise3(x, y, z, s) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const l = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz, s);
  const x00 = l(0, 0, 0) + (l(1, 0, 0) - l(0, 0, 0)) * fx, x10 = l(0, 1, 0) + (l(1, 1, 0) - l(0, 1, 0)) * fx;
  const x01 = l(0, 0, 1) + (l(1, 0, 1) - l(0, 0, 1)) * fx, x11 = l(0, 1, 1) + (l(1, 1, 1) - l(0, 1, 1)) * fx;
  const y0 = x00 + (x10 - x00) * fy, y1 = x01 + (x11 - x01) * fy;
  return y0 + (y1 - y0) * fz;
}
function fbm(x, z, oct, s) {
  let v = 0, a = 1, t = 0, f = 1;
  for (let i = 0; i < oct; i++) { v += noise2(x * f, z * f, s + i * 17) * a; t += a; a *= 0.5; f *= 2; }
  return v / t;
}

// ---------- Welt ----------
const chunks = new Map();
const ck = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
const allEdits = new Map(); // "cx,cz" -> {idx:id}
const editKey = (cx, cz) => cx + ',' + cz;
const dirtyEditKeys = new Set();
const idx = (x, y, z) => x + z * CS + y * CS * CS;
const getChunk = (cx, cz) => chunks.get(ck(cx, cz));

function getB(x, y, z, missing = 3) {
  if (y < 0) return 3;
  if (y >= CH) return 0;
  const c = chunks.get(ck(x >> 4, z >> 4));
  if (!c) return missing;
  return c.b[idx(x & 15, y, z & 15)];
}

const ctr = (v) => Math.max(0, Math.min(1, (v - 0.5) * 2.6 + 0.5));
const unit = (v) => Math.max(0, Math.min(1, v));
function genChunk(cx, cz) {
  const b = new Uint8Array(VOL), hm = new Uint8Array(256), bm = new Uint8Array(256);
  const ch = { cx, cz, b, hm, bm, mesh: null, dirty: false, cabin: null };
  for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const wx = cx * CS + x, wz = cz * CS + z, ci = x + z * CS;
    const warpX = (noise2(wx * 0.0035, wz * 0.0035, 71) - 0.5) * 56;
    const warpZ = (noise2(wx * 0.0035 + 80, wz * 0.0035 - 80, 73) - 0.5) * 56;
    const tx = wx + warpX, tz = wz + warpZ;
    const c = fbm(tx * 0.0022, tz * 0.0022, 4, 7);
    const t2 = ctr(fbm(tx * 0.0035 + 300, tz * 0.0035, 3, 11)), m2 = ctr(fbm(tx * 0.0045, tz * 0.0045 + 300, 3, 13));
    const rough = fbm(tx * 0.008, tz * 0.008, 2, 17), hills = fbm(tx * 0.015, tz * 0.015, 4, 5), mval = fbm(tx * 0.005, tz * 0.005, 3, 23);
    const ridgeNoise = fbm(tx * 0.012, tz * 0.012, 3, 83), ridge = Math.pow(1 - Math.abs(ridgeNoise * 2 - 1), 1.7);
    let mt = unit(Math.max(0, mval - 0.52) * 3) * (0.25 + ridge * 0.85), h, biome, waterLevel = SEA;
    const ocean = c < 0.4;
    if (ocean) { h = Math.max(4, SEA - 2 - (0.4 - c) * 70); mt = 0; }
    else {
      const inl = sm(unit((c - 0.385) / 0.13));
      h = SEA - 1 + inl * 3 + (c - 0.4) * 22 + (hills - 0.5) * (5 + rough * 18) * inl + mt * 34 * inl;
      h += (fbm(tx * 0.045, tz * 0.045, 2, 87) - 0.5) * (2 + 3 * mt) * inl;
      mt *= inl;
    }
    if (ocean) biome = 10;
    else if (mt > 0.3) biome = 3;
    else if (t2 < 0.3) biome = m2 > 0.5 ? 5 : 4;
    else if (t2 > 0.7) biome = m2 < 0.22 ? 8 : m2 < 0.4 ? 2 : m2 < 0.62 ? 7 : 6;
    else biome = m2 > 0.7 ? 9 : m2 > 0.52 ? 1 : 0;
    if (biome === 2) h += (fbm(tx * 0.03, tz * 0.015, 2, 3) - 0.5) * 9;
    else if (biome === 8) h = Math.floor((h - SEA) / 4) * 4 + SEA + 3;
    else if (biome === 9) h += (fbm(tx * 0.035, tz * 0.035, 2, 29) - 0.5) * 4;
    else if (biome === 4) h = SEA + (h - SEA) * 0.6;
    let river = false, lake = false;
    if (!ocean && biome !== 3) {
      const lakeNoise = fbm(tx * 0.0045 + 900, tz * 0.0045 - 900, 2, 97);
      const basin = sm(unit((lakeNoise - 0.68) / 0.12));
      const lakeLevel = SEA + Math.floor(Math.max(0, Math.min(6, (c - 0.4) * 22)));
      if (basin > 0.25 && h > lakeLevel - 3) {
        h = Math.min(h, lakeLevel + 3 - basin * 7);
        lake = basin > 0.55 && h < lakeLevel;
        if (lake) waterLevel = lakeLevel;
      }
    }
    if (!ocean) {
      const rv = Math.abs(fbm(tx * 0.006 + 700, tz * 0.006, 2, 61) - 0.5);
      const riverLevel = SEA + Math.floor(Math.max(0, Math.min(8, (c - 0.4) * 28)));
      if (rv < 0.018 && h > riverLevel - 2) {
        const f = sm(unit((0.018 - rv) / 0.018));
        h -= (h - (riverLevel - 1)) * f;
        river = f > 0.3;
        if (river) { waterLevel = riverLevel; lake = false; }
      }
    }
    h = Math.max(3, Math.min(CH - 8, Math.floor(h)));
    if (river && biome !== 3) biome = 12; else if (!ocean && biome !== 3 && biome !== 9 && h <= SEA + 1) biome = 11;
    hm[ci] = h; bm[ci] = biome;
    // Oberflächenmaterial
    let top = 1, sub = 2, sd = 3;
    const hh = hash3(wx, 0, wz, 55);
    switch (biome) {
      case 2: top = 4; sub = 4; sd = 4; break;
      case 3: if (h >= 45) { top = 18; sub = 3; } else if (h >= 34) { top = hh < 0.3 ? 22 : 3; sub = 3; } break;
      case 4: top = 18; sub = 2; break;
      case 5: top = hh < 0.3 ? 18 : 1; break;
      case 7: top = 30; break;
      case 8: top = 20; sub = 20; sd = 14; break;
      case 9: top = h > SEA ? 1 : 2; break;
      case 10: top = h > SEA - 5 ? 4 : hh < 0.4 ? 22 : 2; sub = top === 22 ? 22 : 2; break;
      case 11: top = 4; sub = 4; break;
      case 12: top = hh < 0.3 ? 22 : 4; sub = top; break;
    }
    for (let y = 0; y <= h; y++) {
      let id = 3; const depth = h - y;
      if (y === 0) id = 3;
      else if (depth === 0) id = top;
      else if (depth <= sd) id = biome === 8 ? [21, 29, 20, 21, 20, 29][y % 6] : sub;
      else if (y > 4) { const o = hash3(wx, y, wz, 777); if (o < 0.012 && y < 50) id = 9; else if (o > 0.994 && y < 32) id = 10; else if (o < 0.02 && y < 36) id = hash3(wx, y, wz, 778) < 0.5 ? 22 : 3; }
      if (y > 4 && y < h - 2 && Math.abs(noise3(wx * 0.07, y * 0.1, wz * 0.07, 41) - 0.5) < 0.06 && Math.abs(noise3(wx * 0.07, y * 0.1, wz * 0.07, 59) - 0.5) < 0.07) id = 0;
      b[idx(x, y, z)] = id;
    }
    for (let y = h + 1; y <= (river || lake ? waterLevel : SEA); y++) b[idx(x, y, z)] = 5;
    if (h < SEA && t2 < 0.3) b[idx(x, SEA, z)] = 19;
  }
  const put = (x, y, z, id, airOnly) => { if (x < 0 || x >= CS || z < 0 || z >= CS || y < 0 || y >= CH) return; const i = idx(x, y, z); if (!airOnly || b[i] === 0 || PLANT(b[i])) b[i] = id; };
  const blob = (x, y, z, r, id, flat) => { for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy * (flat ? 2 : 1) + dz * dz > r * r + 1) continue; put(x + dx, y + dy, z + dz, id, true); } };
  // Bäume, Kakteen, Felsen, Pflanzen
  for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const ci = x + z * CS, h = hm[ci], biome = bm[ci], g = b[idx(x, h, z)], wx = cx * CS + x, wz = cz * CS + z;
    if (h <= SEA || h + 14 >= CH) continue;
    const r = hash3(wx, 0, wz, 901), r2 = hash3(wx, 1, wz, 902), grassy = g === 1 || g === 30 || g === 18;
    let tree = '';
    if (grassy) tree = biome === 1 ? (r < 0.014 ? 'oak' : '') : biome === 0 ? (r < 0.002 ? 'oak' : '') : biome === 9 ? (r < 0.009 ? 'oak' : '') : biome === 7 ? (r < 0.003 ? 'acacia' : '') : biome === 5 ? (r < 0.016 ? 'spruce' : '') : biome === 4 ? (r < 0.0012 ? 'spruce' : '') : biome === 6 ? (r < 0.024 ? 'jungle' : '') : biome === 3 && h < 42 ? (r < 0.003 ? 'spruce' : '') : '';
    if (g === 4 && (biome === 2 || biome === 8) && r < (biome === 2 ? 0.005 : 0.0025)) tree = 'cactus';
    if (!tree && (biome === 4 || biome === 5 || biome === 3) && r > 0.9984) tree = 'rock';
    const base = h + 1;
    if (tree === 'oak') { const th = 4 + Math.floor(r2 * 2); for (let y = 1; y <= th; y++) put(x, h + y, z, 6); for (let dy = th - 1; dy <= th + 1; dy++) { const rad = dy === th + 1 ? 1 : 2; for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) if (!(Math.abs(dx) === 2 && Math.abs(dz) === 2)) put(x + dx, h + dy, z + dz, 7, true); } }
    else if (tree === 'spruce') { const th = 5 + Math.floor(r2 * 3); for (let y = 1; y <= th; y++) put(x, h + y, z, 25); for (let ly = 2; ly <= th + 1; ly++) { const rad = ly >= th + 1 ? 0 : ((th - ly) % 2 === 0 ? 1 : 2); for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) if (!(rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2)) put(x + dx, h + ly, z + dz, 24, true); } }
    else if (tree === 'jungle') { const th = 8 + Math.floor(r2 * 5); for (let y = 1; y <= th; y++) put(x, h + y, z, 6); for (let ly = th - 2; ly <= th + 1; ly++) { const rad = ly >= th + 1 ? 1 : ly === th ? 3 : 2; for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) if (Math.abs(dx) + Math.abs(dz) <= rad + 1) put(x + dx, h + ly, z + dz, 7, true); } }
    else if (tree === 'acacia') { const th = 4 + Math.floor(r2 * 2); for (let y = 1; y <= th; y++) put(x, h + y, z, 6); for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dz) <= 3) put(x + dx, h + th + 1, z + dz, 7, true); if (Math.abs(dx) + Math.abs(dz) <= 1) put(x + dx, h + th + 2, z + dz, 7, true); } }
    else if (tree === 'cactus') { const ch2 = 1 + Math.floor(r2 * 3); for (let y = 1; y <= ch2; y++) put(x, h + y, z, 23); }
    else if (tree === 'rock') blob(x, base, z, 1 + Math.floor(r2 * 1.9), 11, true);
    else if (grassy && g !== 18 && b[idx(x, base, z)] === 0) {
      const pr = biome === 0 ? 0.1 : biome === 1 ? 0.06 : biome === 6 ? 0.2 : biome === 7 ? 0.12 : biome === 9 ? 0.08 : biome === 5 ? 0.05 : 0;
      if (r < pr) b[idx(x, base, z)] = 26;
      else if (biome === 0 && r > 0.955) b[idx(x, base, z)] = r2 < 0.5 ? 27 : 28;
      else if ((biome === 1 || biome === 9) && r > 0.985) b[idx(x, base, z)] = r2 < 0.5 ? 27 : 28;
    }
  }
  // Eine Hütte pro zufällig versetzter 6x6-Chunk-Region verhindert Chunk-Raster.
  const regionX = Math.floor(cx / 6), regionZ = Math.floor(cz / 6);
  const candidateX = regionX * 6 + Math.floor(hash3(regionX, 5, regionZ, 4242) * 6);
  const candidateZ = regionZ * 6 + Math.floor(hash3(regionX, 6, regionZ, 4242) * 6);
  if (cx === candidateX && cz === candidateZ) {
    const bx = 2 + Math.floor(hash3(cx, 7, cz, 4242) * 7), bz = 2 + Math.floor(hash3(cx, 8, cz, 4242) * 7);
    const base = hm[(bx + 3) + (bz + 3) * CS], bio = bm[(bx + 3) + (bz + 3) * CS];
    if (base > SEA + 1 && base < CH - 12 && bio !== 3 && bio < 10) {
      for (let dz = 0; dz < 7; dz++) for (let dx = 0; dx < 7; dx++) {
        for (let y = 0; y <= 6; y++) b[idx(bx + dx, base + y, bz + dz)] = 0;
        for (let y = base - 2; y < base; y++) b[idx(bx + dx, y, bz + dz)] = 11;
        b[idx(bx + dx, base, bz + dz)] = 8;
        const edge = dx === 0 || dz === 0 || dx === 6 || dz === 6;
        for (let y = 1; y <= 3; y++) {
          if (!edge) continue;
          let id = 8;
          if (y === 2 && ((dx === 3 && (dz === 0 || dz === 6)) || (dz === 3 && (dx === 0 || dx === 6)))) id = 12;
          if (dz === 0 && dx === 2 && y <= 2) id = 0;
          b[idx(bx + dx, base + y, bz + dz)] = id;
        }
        b[idx(bx + dx, base + 4, bz + dz)] = 8;
      }
      b[idx(bx + 5, base + 1, bz + 5)] = 14; b[idx(bx + 1, base + 1, bz + 5)] = 16;
      b[idx(bx + 5, base + 1, bz + 1)] = 31;
      ch.cabin = { x: cx * 16 + bx + 3, z: cz * 16 + bz + 3 };
    }
  }
  const ed = allEdits.get(editKey(cx, cz));
  if (ed) for (const k in ed) b[+k] = ed[k];
  chunks.set(ck(cx, cz), ch);
  return ch;
}

function setBlock(x, y, z, id, record = true) {
  if (y < 0 || y >= CH) return;
  const cx = x >> 4, cz = z >> 4, c = getChunk(cx, cz);
  if (!c) return;
  const i = idx(x & 15, y, z & 15);
  if (c.b[i] === id) return;
  c.b[i] = id;
  if (record) {
    const k = editKey(cx, cz);
    let e = allEdits.get(k);
    if (!e) allEdits.set(k, (e = {}));
    e[i] = id;
    dirtyEditKeys.add(k);
  }
  c.dirty = true;
  const lx = x & 15, lz = z & 15;
  if (lx === 0) markDirty(cx - 1, cz); if (lx === 15) markDirty(cx + 1, cz);
  if (lz === 0) markDirty(cx, cz - 1); if (lz === 15) markDirty(cx, cz + 1);
}
function markDirty(cx, cz) { const c = getChunk(cx, cz); if (c) c.dirty = true; }

// ---------- Meshing ----------
const FACES = [
  { d: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], s: 0.82 },
  { d: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.82 },
  { d: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], s: 1 },
  { d: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5 },
  { d: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.68 },
  { d: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], s: 0.68 },
];
const AOV = [0.5, 0.68, 0.84, 1], ONE3 = [1, 1, 1];
//            Ebene Wald Wüste Gebirge Tundra Taiga Dschungel Savanne Mesa Sumpf Ozean Strand Fluss
const GTINT = [[1, 1, 1], [0.82, 0.98, 0.78], [1, 1, 1], [0.86, 1, 0.9], [0.8, 0.95, 0.95], [0.66, 0.9, 0.86], [0.62, 1.05, 0.5], [1.05, 1, 0.8], [1, 1, 0.8], [0.58, 0.72, 0.42], [1, 1, 1], [1, 1, 1], [1, 1, 1]];
const WTINT = [[1, 1, 1], [1, 1, 1], [1, 1, 1], [0.9, 1, 1], [0.75, 0.88, 1], [0.8, 0.95, 1], [0.7, 1, 0.9], [1, 1, 1], [1, 1, 0.9], [0.55, 0.78, 0.6], [0.9, 1, 1.1], [1, 1, 1], [0.9, 1, 1.1]];
const WUV = [0.5 / 16, 0.5 / 16];
function faceUV(F, v, tile) {
  const ax = F.d[0] ? 0 : F.d[1] ? 1 : 2;
  let u, w;
  if (ax === 1) { u = v[0]; w = v[2]; } else { u = ax === 0 ? v[2] : v[0]; w = 1 - v[1]; }
  return [((tile % 16) + 0.001 + u * 0.998) / 16, (Math.floor(tile / 16) + 0.001 + w * 0.998) / 16];
}
function faceVisible(b, nb) {
  if (nb === 0 || PLANT(nb)) return true;
  if (b === 5) return false;
  if (nb === 5) return true;
  if (nb === 12) return b !== 12;
  return false;
}
function buildMesh(ch) {
  const op = [], wt = [];
  const ox = ch.cx * CS, oz = ch.cz * CS, b = ch.b;
  const solidAt = (x, y, z) => {
    if (y < 0) return true; if (y >= CH) return false;
    const id = x >= 0 && x < CS && z >= 0 && z < CS ? b[idx(x, y, z)] : getB(ox + x, y, oz + z, 0);
    return id !== 0 && id !== 5 && id !== 12 && !PLANT(id);
  };
  const ao4 = [0, 0, 0, 0], p = [0, 0, 0];
  for (let y = 0; y < CH; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const id = b[idx(x, y, z)];
    if (id === 0) continue;
    const out = id === 5 ? wt : op;
    const jit = 0.94 + 0.12 * hash3(ox + x, y, oz + z, 3);
    const cave = y < ch.hm[x + z * CS] - 3 ? 0.55 : 1;
    const bio = ch.bm[x + z * CS], tn = id === 5 ? WTINT[bio] : id === 7 || id === 26 ? GTINT[bio] : null;
    if (PLANT(id)) {
      const tl = tileFor(id, 2), u0 = ((tl % 16) + 0.001) / 16, u1 = ((tl % 16) + 0.999) / 16, v0 = (Math.floor(tl / 16) + 0.001) / 16, v1 = (Math.floor(tl / 16) + 0.999) / 16, kk = 0.95 * jit * cave, T3 = tn || [1, 1, 1];
      for (const [ax0, az0, ax1, az1] of [[0, 0, 1, 1], [1, 0, 0, 1]]) {
        const V = [[ax0, 0, az0, u0, v1], [ax1, 0, az1, u1, v1], [ax1, 1, az1, u1, v0], [ax0, 1, az0, u0, v0]];
        for (const q of [0, 1, 2, 0, 2, 3]) { const v = V[q]; op.push(ox + x + v[0], y + v[1], oz + z + v[2], v[3], v[4], kk * T3[0], kk * T3[1], kk * T3[2]); }
      }
      continue;
    }
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], n = F.d, nx = x + n[0], ny = y + n[1], nz = z + n[2];
      let nb;
      if (nx >= 0 && nx < CS && nz >= 0 && nz < CS && ny >= 0 && ny < CH) nb = b[idx(nx, ny, nz)];
      else nb = getB(ox + nx, ny, oz + nz, 0);
      if (!faceVisible(id, nb)) continue;
      const tile = tileFor(id, f), ax = n[0] ? 0 : n[1] ? 1 : 2, ta = (ax + 1) % 3, tb = (ax + 2) % 3;
      const lower = id === 5 && getB(ox + x, y + 1, oz + z, 0) !== 5;
      const vs = F.v, vert = [];
      for (let q = 0; q < 4; q++) {
        const v = vs[q];
        let ao = 3;
        if (id !== 5) {
          const sa = v[ta] ? 1 : -1, sb = v[tb] ? 1 : -1;
          p[0] = nx; p[1] = ny; p[2] = nz;
          const bx = [nx, ny, nz];
          const c1 = bx.slice(); c1[ta] += sa; const c2 = bx.slice(); c2[tb] += sb; const c3 = c1.slice(); c3[tb] += sb;
          const s1 = solidAt(c1[0], c1[1], c1[2]), s2 = solidAt(c2[0], c2[1], c2[2]), s3 = solidAt(c3[0], c3[1], c3[2]);
          ao = s1 && s2 ? 0 : 3 - (s1 + s2 + s3);
        }
        ao4[q] = ao;
        const k = F.s * jit * cave * AOV[ao], uv = faceUV(F, v, tile);
        const T3 = tn || (id === 1 && f === 2 ? GTINT[bio] : null) || ONE3;
        vert.push([ox + x + v[0], y + (lower && v[1] ? 0.88 : v[1]), oz + z + v[2], uv[0], uv[1], k * T3[0], k * T3[1], k * T3[2]]);
      }
      const tri = ao4[0] + ao4[2] < ao4[1] + ao4[3] ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
      for (const q of tri) { const v = vert[q]; for (let i = 0; i < 8; i++) out.push(v[i]); }
    }
  }
  return { op: new Float32Array(op), wt: new Float32Array(wt) };
}

// ---------- WebGL ----------
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, `attribute vec3 p;attribute vec2 t;attribute vec3 c;uniform mat4 m;uniform vec3 cam;varying vec3 vc;varying vec2 vt;varying float vd;
void main(){gl_Position=m*vec4(p,1.);vc=c;vt=t;vd=length(p-cam);}`));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision mediump float;varying vec3 vc;varying vec2 vt;varying float vd;uniform sampler2D tex;uniform vec3 fog;uniform float fn,ff,light,alpha;
void main(){vec4 tc=texture2D(tex,vt);if(tc.a<0.5)discard;vec3 col=tc.rgb*vc*light;float f=clamp((vd-fn)/(ff-fn),0.,1.);gl_FragColor=vec4(mix(col,fog,f),alpha*tc.a);}`));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const A = { p: gl.getAttribLocation(prog, 'p'), t: gl.getAttribLocation(prog, 't'), c: gl.getAttribLocation(prog, 'c') };
const U = {}; for (const n of ['m', 'cam', 'fog', 'fn', 'ff', 'light', 'alpha', 'tex']) U[n] = gl.getUniformLocation(prog, n);
gl.enableVertexAttribArray(A.p); gl.enableVertexAttribArray(A.t); gl.enableVertexAttribArray(A.c);
gl.enable(gl.DEPTH_TEST);
const atlasTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.uniform1i(U.tex, 0);

function persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), nf = 1 / (n - fa); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) * nf, -1, 0, 0, 2 * fa * n * nf, 0]; }
function lookAt(e, c) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
}
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

function upload(arr) {
  if (!arr.length) return null;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
  return { buf, n: arr.length / 8 };
}
function freeMesh(ch) { if (!ch.mesh) return; for (const k of ['op', 'wt']) if (ch.mesh[k]) gl.deleteBuffer(ch.mesh[k].buf); ch.mesh = null; }
function meshChunk(ch) {
  freeMesh(ch);
  const m = buildMesh(ch);
  ch.mesh = { op: upload(m.op), wt: upload(m.wt) };
  ch.dirty = false;
}
function attribs() {
  gl.vertexAttribPointer(A.p, 3, gl.FLOAT, false, 32, 0);
  gl.vertexAttribPointer(A.t, 2, gl.FLOAT, false, 32, 12);
  gl.vertexAttribPointer(A.c, 3, gl.FLOAT, false, 32, 20);
}
function drawBuf(o, mode) { gl.bindBuffer(gl.ARRAY_BUFFER, o.buf); attribs(); gl.drawArrays(mode || gl.TRIANGLES, 0, o.n); }
const dynBuf = gl.createBuffer();
function drawDyn(arr, mode) {
  if (!arr.length) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.DYNAMIC_DRAW);
  attribs();
  gl.drawArrays(mode || gl.TRIANGLES, 0, arr.length / 8);
}
// tile: Zahl oder Array mit 6 Kacheln (pro Fläche)
function pushBox(a, x0, y0, z0, x1, y1, z1, c, tile) {
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], t = Array.isArray(tile) ? tile[f] : (tile || 0), k = F.s;
    for (const q of [0, 1, 2, 0, 2, 3]) {
      const v = F.v[q], uv = faceUV(F, v, t);
      a.push(v[0] ? x1 : x0, v[1] ? y1 : y0, v[2] ? z1 : z0, uv[0], uv[1], c[0] * k, c[1] * k, c[2] * k);
    }
  }
}
// gedrehte Box (lokale Koordinaten, +z = vorn), yaw um die Y-Achse
function pushBoxR(a, ox, oy, oz, yaw, x0, y0, z0, x1, y1, z1, c, tile) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], t = Array.isArray(tile) ? tile[f] : (tile || 0), k = F.s;
    for (const q of [0, 1, 2, 0, 2, 3]) {
      const v = F.v[q], uv = faceUV(F, v, t), lx = v[0] ? x1 : x0, lz = v[2] ? z1 : z0;
      a.push(ox + lx * cs + lz * sn, oy + (v[1] ? y1 : y0), oz - lx * sn + lz * cs, uv[0], uv[1], c[0] * k, c[1] * k, c[2] * k);
    }
  }
}
// flache Fläche mit voller Kachel (für Items, ohne Seitenkanten)
function pushPlane(a, cx, cy, cz, ux, uy, uz, vx, vy, vz, tile, c) {
  const u0 = ((tile % 16) + 0.001) / 16, u1 = ((tile % 16) + 0.999) / 16, v0 = (Math.floor(tile / 16) + 0.001) / 16, v1 = (Math.floor(tile / 16) + 0.999) / 16;
  const V = [[-1, -1, u0, v1], [1, -1, u1, v1], [1, 1, u1, v0], [-1, 1, u0, v0]];
  for (const q of [0, 1, 2, 0, 2, 3]) { const p = V[q]; a.push(cx + ux * p[0] + vx * p[1], cy + uy * p[0] + vy * p[1], cz + uz * p[0] + vz * p[1], p[2], p[3], c[0], c[1], c[2]); }
}
function pushWire(a, x0, y0, z0, x1, y1, z1, c) {
  const P = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
  for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) a.push(...P(i), WUV[0], WUV[1], ...c, ...P(j), WUV[0], WUV[1], ...c);
}

// ---------- Streaming ----------
let spiral = [], spiralR = -1;
function buildSpiral(R) { spiral = []; for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dz * dz <= R * R + 1) spiral.push([dx, dz, dx * dx + dz * dz]); spiral.sort((a, b) => a[2] - b[2]); spiralR = R; }
let lastUnload = 0;
function streamChunks(px, pz, rd, budgetMs) {
  if (spiralR !== rd + 1) buildSpiral(rd + 1);
  const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS), t0 = performance.now();
  let did = true;
  while (did && performance.now() - t0 < budgetMs) {
    did = false;
    for (const [dx, dz] of spiral) {
      if (!getChunk(pcx + dx, pcz + dz)) { genChunk(pcx + dx, pcz + dz); did = true; break; }
    }
    if (did) continue;
    for (const [dx, dz, d2] of spiral) {
      if (d2 > rd * rd) continue;
      const c = getChunk(pcx + dx, pcz + dz);
      if (c && !c.mesh && getChunk(c.cx + 1, c.cz) && getChunk(c.cx - 1, c.cz) && getChunk(c.cx, c.cz + 1) && getChunk(c.cx, c.cz - 1)) { meshChunk(c); did = true; break; }
    }
  }
  const now = performance.now();
  if (now - lastUnload > 1000) {
    lastUnload = now;
    for (const [k, c] of chunks) {
      const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
      if (d > rd + 2) freeMesh(c);
      if (d > rd + 5) chunks.delete(k); // Edits liegen separat in allEdits
    }
  }
}
function remeshDirty() { for (const c of chunks.values()) if (c.dirty && c.mesh && getChunk(c.cx + 1, c.cz) && getChunk(c.cx - 1, c.cz) && getChunk(c.cx, c.cz + 1) && getChunk(c.cx, c.cz - 1)) meshChunk(c); }

// ---------- Raycast ----------
function raycast(ox, oy, oz, dx, dy, dz, maxD, solidOnly) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = dx ? Math.abs(1 / dx) : 1e30, tdy = dy ? Math.abs(1 / dy) : 1e30, tdz = dz ? Math.abs(1 / dz) : 1e30;
  let tx = dx ? ((sx > 0 ? x + 1 - ox : ox - x) * tdx) : 1e30, ty = dy ? ((sy > 0 ? y + 1 - oy : oy - y) * tdy) : 1e30, tz = dz ? ((sz > 0 ? z + 1 - oz : oz - z) * tdz) : 1e30;
  let nx = 0, ny = 0, nz = 0, t = 0;
  while (t <= maxD) {
    const b = getB(x, y, z, 0);
    if (solidOnly ? isSolid(b) : b !== 0 && b !== 5) return { x, y, z, nx, ny, nz, t, b };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}
