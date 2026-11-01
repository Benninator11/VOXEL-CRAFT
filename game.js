'use strict';
// ===== Voxel Survival: Gameplay =====
const $ = (id) => document.getElementById(id);
const TEST = location.search.includes('test');
const settings = { rd: 6, fov: 75, sens: 1, fog: 1, vol: 0.5, cb: false, rm: false, cap: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('vs_settings') || '{}')); } catch (e) { /* ignore */ }
const saveSettings = () => { try { localStorage.setItem('vs_settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = Math.random;

// ---------- Items ----------
const ITEMS = {
  100: { n: 'Kohle', c: [0.12, 0.12, 0.12] },
  101: { n: 'Rohes Schwein', c: [0.9, 0.55, 0.55], food: 3 },
  102: { n: 'Apfel', c: [0.85, 0.15, 0.15], food: 4 },
  103: { n: 'Holzspitzhacke', c: [0.72, 0.56, 0.3], tool: 'pick', pow: 3, dur: 60, r: 1 },
  104: { n: 'Holzschwert', c: [0.72, 0.56, 0.3], tool: 'sword', pow: 5, dur: 60, r: 1 },
  105: { n: 'Gebratenes Schwein', c: [0.6, 0.35, 0.2], food: 8 },
  106: { n: 'Eisenbarren', c: [0.85, 0.85, 0.85], r: 2 },
  107: { n: 'Eisenspitzhacke', c: [0.8, 0.8, 0.88], tool: 'pick', pow: 6, dur: 200, r: 2 },
  108: { n: 'Eisenschwert', c: [0.8, 0.8, 0.88], tool: 'sword', pow: 8, dur: 200, r: 2 },
  109: { n: 'Rohes Rindfleisch', c: [0.7, 0.22, 0.22], food: 3 },
  110: { n: 'Steak', c: [0.44, 0.25, 0.14], food: 9 },
  111: { n: 'Rohes Hühnchen', c: [0.93, 0.8, 0.69], food: 2 },
  112: { n: 'Gebratenes Hühnchen', c: [0.78, 0.5, 0.2], food: 6 },
  113: { n: 'Steinspitzhacke', c: [0.52, 0.52, 0.54], tool: 'pick', pow: 5, dur: 130, r: 1 },
  114: { n: 'Steinschwert', c: [0.52, 0.52, 0.54], tool: 'sword', pow: 7, dur: 130, r: 1 },
  115: { n: 'Steinaxt', c: [0.52, 0.52, 0.54], tool: 'axe', pow: 5, dur: 130, r: 1 },
  116: { n: 'Steinschaufel', c: [0.52, 0.52, 0.54], tool: 'shovel', pow: 3, dur: 130, r: 1 },
  117: { n: 'Stock', c: [0.48, 0.32, 0.16] },
  118: { n: 'Fackel', c: [0.98, 0.72, 0.22] },
  119: { n: 'Holzaxt', c: [0.72, 0.56, 0.3], tool: 'axe', pow: 4, dur: 60, r: 1 },
  120: { n: 'Holzschaufel', c: [0.72, 0.56, 0.3], tool: 'shovel', pow: 2, dur: 60, r: 1 },
  121: { n: 'Eisenaxt', c: [0.8, 0.8, 0.88], tool: 'axe', pow: 7, dur: 200, r: 2 },
  122: { n: 'Eisenschaufel', c: [0.8, 0.8, 0.88], tool: 'shovel', pow: 4, dur: 200, r: 2 },
};
const info = (id) => (id < 100 ? BLOCKS[id] : ITEMS[id]);
const inv = new Array(36).fill(null);
let hot = 0;
const mkSlot = (id, n, d, e) => ({ id, n, d: d !== undefined ? d : (ITEMS[id] && ITEMS[id].dur) || 0, e: e || 0 });
function addItem(id, n, d, e) {
  const it = ITEMS[id], tool = !!(it && it.tool), mx = tool ? 1 : 64;
  if (!tool) for (const s of inv) if (s && s.id === id && s.n < mx) { const k = Math.min(n, mx - s.n); s.n += k; n -= k; if (!n) return 0; }
  for (let i = 0; i < 36 && n > 0; i++) if (!inv[i]) { const k = Math.min(n, mx); inv[i] = mkSlot(id, k, d, e); n -= k; }
  uiDirty = true;
  return n;
}
const countItem = (id) => inv.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
function removeItem(id, n) {
  for (let i = 0; i < 36 && n > 0; i++) { const s = inv[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) inv[i] = null; } }
  uiDirty = true;
}
const held = () => inv[hot];
const heldTool = (t) => { const s = held(); return s && ITEMS[s.id] && ITEMS[s.id].tool === t ? s : null; };

// ---------- Rezepte ----------
const BENCH = 14, FURN = 15, ENCH = 17;
const RECIPES = [
  { n: 'Bretter', cat: 'Basis', out: [8, 4], in: [[6, 1]], pattern: [[6]] },
  { n: 'Stöcke', cat: 'Basis', out: [117, 4], in: [[8, 2]], pattern: [[8], [8]] },
  { n: 'Werkbank', cat: 'Basis', out: [14, 1], in: [[8, 4]], pattern: [[8, 8], [8, 8]] },
  { n: 'Truhe', cat: 'Basis', out: [31, 1], in: [[8, 8]], pattern: [[8, 8, 8], [8, 0, 8], [8, 8, 8]], st: BENCH },
  { n: 'Ofen', cat: 'Basis', out: [15, 1], in: [[11, 8]], pattern: [[11, 11, 11], [11, 0, 11], [11, 11, 11]], st: BENCH },
  { n: 'Holzspitzhacke', cat: 'Werkzeug', out: [103, 1], in: [[8, 5]], pattern: [[8, 8, 8], [0, 117, 0], [0, 117, 0]], st: BENCH },
  { n: 'Holzschwert', cat: 'Werkzeug', out: [104, 1], in: [[8, 2], [117, 1]], pattern: [[8], [8], [117]], st: BENCH },
  { n: 'Holzaxt', cat: 'Werkzeug', out: [119, 1], in: [[8, 3], [117, 2]], pattern: [[8, 8], [8, 117], [0, 117]], st: BENCH },
  { n: 'Holzschaufel', cat: 'Werkzeug', out: [120, 1], in: [[8, 1], [117, 2]], pattern: [[8], [117], [117]], st: BENCH },
  { n: 'Steinspitzhacke', cat: 'Werkzeug', out: [113, 1], in: [[11, 3], [117, 2]], pattern: [[11, 11, 11], [0, 117, 0], [0, 117, 0]], st: BENCH },
  { n: 'Steinschwert', cat: 'Werkzeug', out: [114, 1], in: [[11, 2], [117, 1]], pattern: [[11], [11], [117]], st: BENCH },
  { n: 'Steinaxt', cat: 'Werkzeug', out: [115, 1], in: [[11, 3], [117, 2]], pattern: [[11, 11], [11, 117], [0, 117]], st: BENCH },
  { n: 'Steinschaufel', cat: 'Werkzeug', out: [116, 1], in: [[11, 1], [117, 2]], pattern: [[11], [117], [117]], st: BENCH },
  { n: 'Eisenaxt', cat: 'Werkzeug', out: [121, 1], in: [[106, 3], [117, 2]], pattern: [[106, 106], [106, 117], [0, 117]], st: BENCH },
  { n: 'Eisenschaufel', cat: 'Werkzeug', out: [122, 1], in: [[106, 1], [117, 2]], pattern: [[106], [117], [117]], st: BENCH },
  { n: 'Fackeln', cat: 'Bauen', out: [118, 4], in: [[100, 1], [117, 1]], pattern: [[100], [117]] },
  { n: 'Steak', cat: 'Schmelzen', out: [110, 1], in: [[109, 1], [8, 1]], st: FURN },
  { n: 'Gebratenes Hühnchen', cat: 'Schmelzen', out: [112, 1], in: [[111, 1], [8, 1]], st: FURN },
  { n: 'Eisenbarren', cat: 'Schmelzen', out: [106, 1], in: [[10, 1], [100, 1]], st: FURN },
  { n: 'Glas', cat: 'Schmelzen', out: [12, 2], in: [[4, 2], [100, 1]], st: FURN },
  { n: 'Gebratenes Schwein', cat: 'Schmelzen', out: [105, 1], in: [[101, 1], [8, 1]], st: FURN },
  { n: 'Eisenspitzhacke', cat: 'Werkzeug', out: [107, 1], in: [[106, 3], [117, 2]], pattern: [[106, 106, 106], [0, 117, 0], [0, 117, 0]], st: BENCH },
  { n: 'Eisenschwert', cat: 'Werkzeug', out: [108, 1], in: [[106, 2], [117, 1]], pattern: [[106], [106], [117]], st: BENCH },
  { n: 'TNT', cat: 'Mechanik', out: [13, 1], in: [[100, 3], [4, 2]], st: BENCH },
  { n: 'Bett', cat: 'Bauen', out: [16, 1], in: [[8, 6]], st: BENCH },
  { n: 'Zaubertisch', cat: 'Bauen', out: [17, 1], in: [[11, 4], [100, 2]], st: BENCH },
];

// ---------- Zustand ----------
let state = 'menu', uiDirty = true, saveErr = false;
const G = { t: 0.08, seedStr: '', xp: 0, sp: 0, kills: 0, acts: 0, sk: { dmg: 0, stam: 0, craft: 0, luck: 0 }, bossSpawned: false };
const P = { x: 0, y: 40, z: 0, px: 0, py: 40, pz: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, og: false, hp: 20, hunger: 20, thirst: 20, stam: 100, o2: 10, fallMax: 40, sprint: false, atk: 0, swing: 0, inv: 0, spawn: null, target: null, deathPos: null, inWater: false, head: false, drown: 0, starve: 0, step: 0, sleepMsg: 0, rcd: 0, lastW: 0, sprintKey: false };
const W = { rain: false, timer: 150, flash: 0 };
let mobs = [], ents = [], parts = [], fuses = [], brk = null, craftBusy = false;
const chestData = new Map(), craftGrid = new Array(9).fill(null);
let activeChestKey = null;
const keys = {};
let mouseL = false, mouseR = false;

const sunH = () => Math.sin(G.t * Math.PI * 2);
const dayK = () => clamp((sunH() + 0.2) / 0.5, 0, 1);
const isNight = () => sunH() < 0.0;
const maxStam = () => 100 + 10 * G.sk.stam;

// ---------- Audio ----------
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } } return AC || null; }
function tone(f, d, type, v, slide) {
  const a = ac(); if (!a || settings.vol <= 0) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime((v || 0.2) * settings.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d);
}
function noiseBurst(d, v, fc) {
  const a = ac(); if (!a || settings.vol <= 0) return;
  const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (rnd() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = fc; g.gain.value = v * settings.vol;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
let capT = 0;
function caption(t) { if (!settings.cap) return; $('caption').textContent = '[' + t + ']'; capT = 1.5; }
function sfx(n) {
  switch (n) {
    case 'break': noiseBurst(0.12, 0.5, 900); caption('Block zerbrochen'); break;
    case 'place': tone(110, 0.1, 'square', 0.15, -40); caption('Block platziert'); break;
    case 'hurt': tone(160, 0.25, 'sawtooth', 0.25, -90); caption('Schaden'); break;
    case 'eat': noiseBurst(0.15, 0.4, 2500); caption('Essen'); break;
    case 'hit': tone(220, 0.08, 'square', 0.2, -100); caption('Treffer'); break;
    case 'boom': noiseBurst(0.9, 1, 400); tone(60, 0.6, 'sine', 0.5, -30); caption('Explosion'); break;
    case 'thunder': noiseBurst(1.6, 0.8, 300); caption('Donner'); break;
    case 'pick': tone(660, 0.1, 'triangle', 0.15, 200); break;
    case 'step': noiseBurst(0.05, 0.12, 600); break;
  }
}
const PENT = [261.6, 293.7, 329.6, 392, 440, 523.3];
setInterval(() => { if (state === 'play' && ac()) tone(PENT[Math.floor(rnd() * 6)] / (isNight() ? 2 : 1), 3, 'sine', 0.05); }, 4000);

// ---------- Speicher (IndexedDB, Version, Prüfsumme, gzip) ----------
const SAVE_VER = 1;
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const DB = {
  db: null,
  open() { return new Promise((res) => { try { const r = indexedDB.open('voxel-survival', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); } catch (e) { res(false); } }); },
  tx(mode, fn) { return new Promise((res, rej) => { if (!this.db) return rej(new Error('no db')); const t = this.db.transaction('kv', mode), r = fn(t.objectStore('kv')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  get(k) { return this.tx('readonly', (s) => s.get(k)); },
  put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)); },
  clear() { return this.tx('readwrite', (s) => s.clear()); },
  keys() { return this.tx('readonly', (s) => s.getAllKeys()); },
};
async function pack(obj) {
  const s = JSON.stringify(obj); let d = s, z = 0;
  if (typeof CompressionStream !== 'undefined') { d = new Uint8Array(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); z = 1; }
  return { v: SAVE_VER, z, d, sum: fnv(s) };
}
async function unpack(r) {
  if (!r) throw new Error('leer');
  let s = r.d; if (r.z) s = await new Response(new Blob([r.d]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  if (fnv(s) !== r.sum) throw new Error('Prüfsumme');
  let o = JSON.parse(s);
  if (r.v < SAVE_VER) o = migrate(o, r.v);
  return o;
}
function migrate(o) { return o; } // Platz für spätere Versionen
function note(t, ms) { const e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(note.h); note.h = setTimeout(() => (e.style.opacity = 0), ms || 2500); }
let saving = false;
async function flushEdits() {
  if (!DB.db || !dirtyEditKeys.size) return;
  const ks = [...dirtyEditKeys];
  try { for (const k of ks) { await DB.put('c:' + k, await pack(allEdits.get(k))); dirtyEditKeys.delete(k); } saveErr = false; } catch (e) { saveErr = true; }
}
async function saveGame(manual) {
  if (!DB.db || saving || state === 'menu') return;
  saving = true;
  try {
    const meta = { ws: G.worldSpawn, seed: SEED, seedStr: G.seedStr, t: G.t, xp: G.xp, sp: G.sp, kills: G.kills, sk: G.sk, hot, inv, chests: [...chestData], craftGrid, p: { x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, hp: P.hp, hunger: P.hunger, thirst: P.thirst, stam: P.stam, spawn: P.spawn } };
    await DB.put('meta', await pack(meta));
    await flushEdits();
    saveErr = false;
    if (manual) note('Gespeichert');
  } catch (e) { saveErr = true; if (manual) note('Speichern fehlgeschlagen – wird erneut versucht'); }
  saving = false;
}
async function loadGame() {
  let meta = null, bad = 0;
  try { meta = await unpack(await DB.get('meta')); } catch (e) { bad++; }
  allEdits.clear(); chunks.clear();
  if (!meta) return false;
  try {
    for (const k of await DB.keys()) if (String(k).startsWith('c:')) { try { allEdits.set(String(k).slice(2), await unpack(await DB.get(k))); } catch (e) { bad++; } }
  } catch (e) { bad++; }
  G.worldSpawn = meta.ws; SEED = meta.seed; G.seedStr = meta.seedStr; G.t = meta.t; G.xp = meta.xp; G.sp = meta.sp; G.kills = meta.kills; G.sk = meta.sk;
  chestData.clear(); for (const [k, contents] of meta.chests || []) chestData.set(k, contents);
  craftGrid.fill(null); for (let i = 0; i < craftGrid.length; i++) craftGrid[i] = meta.craftGrid && meta.craftGrid[i] || null;
  for (let i = 0; i < 36; i++) inv[i] = meta.inv[i] || null;
  hot = meta.hot; Object.assign(P, meta.p); P.px = P.x; P.py = P.y; P.pz = P.z;
  if (bad) setTimeout(() => note('Beschädigte Speicherdaten ignoriert – betroffene Bereiche aus dem Seed neu erzeugt', 5000), 500);
  return true;
}

// ---------- Physik (gemeinsam für Spieler und Mobs) ----------
function collides(x, y, z, w, h) {
  const hw = w / 2;
  for (let by = Math.floor(y); by <= Math.floor(y + h - 1e-4); by++)
    for (let bz = Math.floor(z - hw); bz <= Math.floor(z + hw - 1e-4); bz++)
      for (let bx = Math.floor(x - hw); bx <= Math.floor(x + hw - 1e-4); bx++)
        if (isSolid(getB(bx, by, bz))) return true;
  return false;
}
function moveBody(e, w, h, dt) {
  e.hitH = false;
  e.x += e.vx * dt; if (collides(e.x, e.y, e.z, w, h)) { e.x -= e.vx * dt; e.vx = 0; e.hitH = true; }
  e.z += e.vz * dt; if (collides(e.x, e.y, e.z, w, h)) { e.z -= e.vz * dt; e.vz = 0; e.hitH = true; }
  e.y += e.vy * dt; e.og = false;
  if (collides(e.x, e.y, e.z, w, h)) {
    if (e.vy < 0) { e.og = true; e.y = Math.floor(e.y) + 1; if (collides(e.x, e.y, e.z, w, h)) e.y -= e.vy * dt; } else e.y -= e.vy * dt;
    e.vy = 0;
  }
}
function surfaceY(x, z) {
  const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4;
  if (!getChunk(cx, cz)) genChunk(cx, cz);
  for (let y = CH - 1; y >= 0; y--) { const bb = getB(Math.floor(x), y, Math.floor(z)); if (bb !== 0 && !PLANT(bb)) return y + 1; }
  return CH;
}
function findSpawn() {
  for (let i = 0; i < 80; i++) {
    const a = i * 2.4, r = i * 6, x = Math.floor(Math.cos(a) * r) + 0.5, z = Math.floor(Math.sin(a) * r) + 0.5, y = surfaceY(x, z);
    { const ch0 = getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4), bi = ch0 ? ch0.bm[(Math.floor(z) & 15) * 16 + (Math.floor(x) & 15)] : 3; if (y > SEA + 1 && y < 40 && getB(Math.floor(x), y - 1, Math.floor(z)) === 1 && (bi === 0 || bi === 1)) return { x, z }; }
  }
  return { x: 0.5, z: 0.5 };
}
function ensureAround(x, z) { const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (!getChunk(cx + dx, cz + dz)) genChunk(cx + dx, cz + dz); }

// ---------- Schaden / Tod ----------
function damagePlayer(a, cause, force) {
  if (state !== 'play' || P.hp <= 0) return;
  if (!force && P.inv > 0) return;
  P.hp -= a; P.inv = force ? P.inv : 0.5; P.lastCause = cause;
  $('hurt').style.opacity = 1; setTimeout(() => ($('hurt').style.opacity = 0), 200);
  sfx('hurt');
  if (P.hp <= 0) die(cause);
}
function die(cause) {
  P.hp = 0; state = 'dead'; P.deathPos = { x: P.x, y: P.y, z: P.z };
  for (let i = 0; i < 36; i++) { const s = inv[i]; if (s) { spawnItem(P.x + (rnd() - 0.5), P.y + 1, P.z + (rnd() - 0.5), s.id, s.n, s.d, s.e, 0); inv[i] = null; } }
  uiDirty = true; $('cause').textContent = 'Todesursache: ' + cause; show('dead');
  if (document.exitPointerLock) document.exitPointerLock();
}
function respawn(tp) {
  const sp = P.spawn || G.worldSpawn || { x: 0.5, z: 0.5 };
  ensureAround(sp.x, sp.z);
  P.x = sp.x; P.z = sp.z; P.y = surfaceY(sp.x, sp.z) + 0.05; P.vx = P.vy = P.vz = 0;
  P.hp = 20; P.hunger = 20; P.thirst = 20; P.stam = maxStam(); P.o2 = 10; P.fallMax = P.y; P.px = P.x; P.py = P.y; P.pz = P.z;
  mobs = mobs.filter((m) => Math.hypot(m.x - P.x, m.z - P.z) > 20);
  if (tp && P.deathPos) { ensureAround(P.deathPos.x, P.deathPos.z); P.x = P.deathPos.x; P.z = P.deathPos.z; P.y = Math.max(P.deathPos.y, surfaceY(P.x, P.z)); P.px = P.x; P.py = P.y; P.pz = P.z; }
  state = 'play'; hideAll(); lock();
}

// ---------- Items am Boden / Partikel / Explosionen ----------
function spawnItem(x, y, z, id, n, d, e, age) { ents.push({ x, y, z, vx: (rnd() - 0.5) * 2, vy: 3, vz: (rnd() - 0.5) * 2, id, n, d, e, age: age === undefined ? 0 : age, life: 300, og: false }); }
const chestKey = (x, y, z) => Math.floor(x) + ',' + Math.floor(y) + ',' + Math.floor(z);
function dropChestContents(x, y, z) {
  const contents = chestData.get(chestKey(x, y, z));
  if (contents) for (const s of contents) if (s) spawnItem(x + 0.5, y + 0.5, z + 0.5, s.id, s.n, s.d, s.e);
  chestData.delete(chestKey(x, y, z));
}
function burst(x, y, z, c, n) { for (let i = 0; i < n; i++) parts.push({ x, y, z, vx: (rnd() - 0.5) * 4, vy: rnd() * 4, vz: (rnd() - 0.5) * 4, c, life: 0.6 + rnd() * 0.3 }); }
function explode(x, y, z, r) {
  sfx('boom');
  const R = Math.ceil(r);
  for (let dz = -R; dz <= R; dz++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dy * dy + dz * dz > r * r) continue;
    const bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz, b = getB(bx, by, bz, 0);
    if (b === 0 || by < 1) continue;
    if (b === 13) { fuses.push({ x: bx, y: by, z: bz, t: 0.4 + rnd() * 0.5 }); }
    else if (b === 31) { dropChestContents(bx, by, bz); if (rnd() < 0.9) spawnItem(bx + 0.5, by + 0.5, bz + 0.5, 31, 1, 0, 0); }
    else if (b !== 5 && rnd() < 0.9 && rnd() < 0.15 && b < 100) spawnItem(bx + 0.5, by + 0.5, bz + 0.5, b === 1 ? 2 : b === 3 ? 11 : b, 1, 0, 0);
    setBlock(bx, by, bz, 0);
  }
  burst(x, y, z, [0.9, 0.5, 0.1], 40);
  const dP = Math.hypot(P.x - x, P.y + 1 - y, P.z - z);
  if (dP < r * 2) { damagePlayer(Math.ceil(14 * (1 - dP / (r * 2))), 'Explosion', true); const k = 9 / Math.max(1, dP); P.vx += (P.x - x) * k * 0.4; P.vz += (P.z - z) * k * 0.4; P.vy += 6; }
  for (const m of mobs) { const d = Math.hypot(m.x - x, m.y - y, m.z - z); if (d < r * 2) hitMob(m, 20 * (1 - d / (r * 2)) + 4, x, z); }
}

// ---------- Mobs ----------
const MOBS = {
  zombie: { n: 'Zombie', w: 0.6, h: 1.8, hp: 20, spd: 2.6, col: [0.25, 0.55, 0.3], dmg: 3, xp: 5, kind: 'melee', hostile: true, burn: true },
  skeleton: { n: 'Skelett', w: 0.6, h: 1.8, hp: 16, spd: 2.2, col: [0.86, 0.86, 0.8], xp: 6, kind: 'ranged', hostile: true, burn: true },
  spider: { n: 'Spinne', w: 1.0, h: 0.8, hp: 14, spd: 3.6, col: [0.22, 0.18, 0.18], dmg: 2, xp: 4, kind: 'melee', hostile: true },
  creeper: { n: 'Creeper', w: 0.6, h: 1.7, hp: 16, spd: 2.4, col: [0.32, 0.72, 0.3], xp: 6, kind: 'creeper', hostile: true },
  boss: { n: 'Nachtkoloss', w: 1.4, h: 2.8, hp: 120, spd: 2.2, col: [0.45, 0.1, 0.5], dmg: 7, xp: 60, kind: 'melee', hostile: true },
  pig: { n: 'Schwein', w: 0.9, h: 0.9, hp: 10, spd: 1.4, col: [0.95, 0.65, 0.7], xp: 1, kind: 'passive' },
  cow: { n: 'Kuh', w: 0.9, h: 1.3, hp: 12, spd: 1.2, col: [0.42, 0.28, 0.18], xp: 1, kind: 'passive' },
  sheep: { n: 'Schaf', w: 0.9, h: 1.2, hp: 10, spd: 1.3, col: [0.95, 0.95, 0.93], xp: 1, kind: 'passive' },
  chicken: { n: 'Huhn', w: 0.4, h: 0.8, hp: 4, spd: 1.6, col: [0.97, 0.97, 0.97], xp: 1, kind: 'passive' },
};
const HOSTILE_POOL = ['zombie', 'zombie', 'zombie', 'skeleton', 'skeleton', 'spider', 'spider', 'creeper', 'creeper'];
const PASSIVE_BY_BIOME = { 0: ['cow', 'sheep', 'pig', 'chicken'], 1: ['pig', 'cow', 'chicken'], 3: ['sheep'], 4: ['sheep'], 5: ['sheep', 'pig'], 6: ['chicken', 'pig'], 7: ['cow', 'sheep'], 9: ['pig', 'cow'] };
let arrows = [];
const wrapA = (a) => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
function spawnMob(type, x, y, z) { mobs.push({ type, x, y, z, vx: 0, vy: 0, vz: 0, hp: MOBS[type].hp, cd: 0, wt: 0, dx: 0, dz: 0, og: false, hurt: 0, flee: 0, fleeX: 0, fleeZ: 0, hitH: false, yaw: rnd() * 6.28, walk: 0, fuse: 0, shoot: 1 + rnd() * 2, side: rnd() < 0.5 ? 1 : -1, angry: false }); }
function hitMob(m, dmg, fx, fz) {
  m.hp -= dmg; m.hurt = 0.3; m.angry = true;
  const d = Math.hypot(m.x - fx, m.z - fz) || 1; m.vx = ((m.x - fx) / d) * 4; m.vz = ((m.z - fz) / d) * 4; m.vy = 3.5;
  if (MOBS[m.type].kind === 'passive') { m.flee = 4.5; m.fleeX = (m.x - fx) / d; m.fleeZ = (m.z - fz) / d; }
  burst(m.x, m.y + MOBS[m.type].h / 2, m.z, [0.8, 0.1, 0.1], 6);
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  const d = MOBS[m.type]; mobs.splice(mobs.indexOf(m), 1);
  G.xp += d.xp; G.kills++; if (G.kills % 3 === 0) { G.sp++; note('Fertigkeitspunkt erhalten!'); }
  const drop = (id, n) => spawnItem(m.x, m.y + 0.5, m.z, id, n, 0, 0);
  if (m.type === 'pig' || m.type === 'sheep') drop(101, 1 + Math.floor(rnd() * 2));
  if (m.type === 'cow') drop(109, 1 + Math.floor(rnd() * 2));
  if (m.type === 'chicken') drop(111, 1);
  if (m.type === 'creeper' || (m.type === 'skeleton' && rnd() < 0.5)) drop(100, 1 + Math.floor(rnd() * 2));
  if (m.type === 'zombie' && rnd() < 0.15) drop(102, 1);
  if (m.type === 'boss') { drop(106, 5); G.bossSpawned = false; note('Nachtkoloss besiegt! +60 XP', 4000); }
  uiDirty = true;
}
let spawnT = 0;
function spawner(dt) {
  spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
  const hostile = mobs.filter((m) => MOBS[m.type].hostile).length, passive = mobs.length - hostile;
  const a = rnd() * 6.28, d = 16 + rnd() * 16, x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
  const ch = getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4);
  if (ch) {
    const y = surfaceY(x, z), top = getB(Math.floor(x), y - 1, Math.floor(z)), biome = ch.bm[(Math.floor(z) & 15) * 16 + (Math.floor(x) & 15)];
    if (top !== 5 && top !== 19 && y < CH - 2) {
      if (isNight()) {
        if (hostile < 8 && biome !== 10) {
          const t = HOSTILE_POOL[Math.floor(rnd() * HOSTILE_POOL.length)]; spawnMob(t, x, y + 0.1, z);
          if (!G.bossSpawned && G.kills >= 5 && rnd() < 0.2) { spawnMob('boss', x, y + 0.1, z); G.bossSpawned = true; note('Ein Nachtkoloss erscheint!', 4000); }
        }
      } else if (passive < 9 && PASSIVE_BY_BIOME[biome] && (top === 1 || top === 30 || top === 18)) {
        const l = PASSIVE_BY_BIOME[biome]; spawnMob(l[Math.floor(rnd() * l.length)], x, y + 0.1, z);
      }
    }
  }
  if (rnd() < 0.25 && hostile < 5) {
    const cx = Math.floor(P.x + (rnd() - 0.5) * 24), cz = Math.floor(P.z + (rnd() - 0.5) * 24), tp = surfaceY(cx, cz);
    for (let yy = 6; yy < tp - 4; yy++) if (getB(cx, yy, cz) === 0 && getB(cx, yy + 1, cz) === 0 && isSolid(getB(cx, yy - 1, cz)) && Math.hypot(cx - P.x, yy - P.y, cz - P.z) > 12) { spawnMob(HOSTILE_POOL[Math.floor(rnd() * HOSTILE_POOL.length)], cx + 0.5, yy, cz + 0.5); break; }
  }
}
function shootArrow(m) {
  const ox = m.x, oy = m.y + 1.5, oz = m.z, tx = P.x, ty = P.y + 1.2, tz = P.z, d = Math.hypot(tx - ox, ty - oy, tz - oz) || 1, sp = 18;
  arrows.push({ x: ox, y: oy, z: oz, vx: ((tx - ox) / d) * sp, vy: ((ty - oy) / d) * sp + d * 0.18, vz: ((tz - oz) / d) * sp, life: 6 });
  tone(300, 0.1, 'triangle', 0.12, -120); caption('Pfeil');
}
function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const q = arrows[i]; q.life -= dt; q.vy -= 9 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    if (q.life <= 0 || isSolid(getB(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)))) { arrows.splice(i, 1); continue; }
    if (Math.abs(q.x - P.x) < 0.45 && Math.abs(q.z - P.z) < 0.45 && q.y > P.y && q.y < P.y + 1.8) { damagePlayer(3, 'Skelett'); arrows.splice(i, 1); }
  }
}
function updateMobs(dt) {
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i], def = MOBS[m.type], dxp = P.x - m.x, dzp = P.z - m.z, dist = Math.hypot(dxp, dzp);
    if (dist > 56) { mobs.splice(i, 1); continue; }
    m.cd -= dt; m.hurt -= dt; m.flee = Math.max(0, m.flee - dt);
    let wx = 0, wz = 0, spd = def.spd, face = null;
    const awake = def.kind !== 'passive' && dist < (def.kind === 'ranged' ? 26 : 30) && (m.type !== 'spider' || isNight() || m.angry);
    const nx = dxp / (dist || 1), nz = dzp / (dist || 1);
    if (def.kind === 'passive' && m.flee > 0) {
      const away = dist < 12 ? 1 : 0;
      wx = away ? -nx : m.fleeX; wz = away ? -nz : m.fleeZ;
      spd *= 2.2; face = Math.atan2(wx, wz);
    } else if (awake) {
      face = Math.atan2(nx, nz);
      if (def.kind === 'ranged') {
        if (dist < 5) { wx = -nx; wz = -nz; } else if (dist > 12) { wx = nx; wz = nz; } else { wx = -nz * m.side; wz = nx * m.side; spd *= 0.6; }
        m.shoot -= dt; if (dist < 22 && m.shoot <= 0 && P.hp > 0) { m.shoot = 1.6 + rnd(); shootArrow(m); }
      } else if (def.kind === 'creeper') {
        if (dist < 3) m.fuse += dt; else m.fuse = Math.max(0, m.fuse - dt * 2);
        if (m.fuse > 0.1) spd = 0; wx = nx; wz = nz;
        if (m.fuse >= 1.5) { mobs.splice(i, 1); explode(m.x, m.y + 0.8, m.z, 2.8); continue; }
      } else { wx = nx; wz = nz; }
    } else {
      m.wt -= dt; if (m.wt <= 0) { m.wt = 1 + rnd() * 3; const an = rnd() * 6.28, still = rnd() < 0.4; m.dx = still ? 0 : Math.cos(an); m.dz = still ? 0 : Math.sin(an); }
      wx = m.dx; wz = m.dz; spd *= 0.6;
    }
    if (wx || wz) { if (face === null || def.kind === 'creeper' || (def.kind === 'ranged' && false)) face = Math.atan2(wx, wz); }
    if (face !== null) m.yaw += wrapA(face - m.yaw) * Math.min(1, dt * 9);
    const inW = getB(Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z)) === 5;
    if (m.hurt <= 0) { m.vx += (wx * spd - m.vx) * Math.min(1, dt * 8); m.vz += (wz * spd - m.vz) * Math.min(1, dt * 8); }
    m.vy -= (inW ? 6 : 28) * dt; if (inW && m.vy < -2) m.vy = -2; if (m.vy < -40) m.vy = -40;
    moveBody(m, def.w, def.h, dt);
    m.walk += Math.hypot(m.vx, m.vz) * dt * 3;
    if (m.hitH && (m.og || inW) && (wx || wz) && spd > 0) m.vy = inW ? 4 : 8;
    if (def.dmg && awake && dist < def.w / 2 + 0.9 && Math.abs(P.y - m.y) < def.h && m.cd <= 0) { m.cd = 1; damagePlayer(def.dmg, def.n); P.vx += wx * 4; P.vz += wz * 4; }
    if (def.burn && dayK() > 0.8 && !W.rain && getB(Math.floor(m.x), Math.floor(m.y + 2), Math.floor(m.z), 0) === 0) { m.hp -= dt * 2; if (m.hp <= 0) { mobs.splice(i, 1); continue; } }
    if (m.y < -10) mobs.splice(i, 1);
  }
  updateArrows(dt);
}

// ---------- Welt-Interaktion ----------
function toolMult(b) {
  const axeBlocks = [6, 8, 14, 16, 17, 25, 31], shovelBlocks = [2, 4, 20, 21, 22, 29, 30];
  const kind = axeBlocks.includes(b) ? 'axe' : shovelBlocks.includes(b) ? 'shovel' : 'pick';
  const s = heldTool(kind), def = BLOCKS[b];
  if (!s || def.h < 1) return 1;
  return (ITEMS[s.id].pow / 3) * (s.e ? 1.5 : 1) * 1.6;
}
function useTool(kind) {
  const s = heldTool(kind); if (!s) return;
  s.d--; uiDirty = true;
  if (s.d <= 0) { inv[hot] = null; note('Werkzeug zerbrochen'); sfx('hurt'); }
}
function breakBlock(h) {
  const b = h.b, def = BLOCKS[b], pick = heldTool('pick');
  let drop = b, n = 1;
  if (b === 1) drop = 2; else if (b === 3) drop = 11; else if (b === 9) drop = pick ? 100 : 0; else if (b === 10) drop = pick ? 10 : 0;
  else if (b === 7) drop = rnd() < 0.12 + 0.08 * G.sk.luck ? 102 : 0; else if (b === 12 || b === 24 || b === 26 || b === 19) drop = 0; else if (b === 30) drop = 2;
  if ((b === 9 || b === 10) && pick && rnd() < 0.1 * G.sk.luck) n = 2;
  if (b === 31) dropChestContents(h.x, h.y, h.z);
  setBlock(h.x, h.y, h.z, 0);
  if (drop) spawnItem(h.x + 0.5, h.y + 0.5, h.z + 0.5, drop, n, 0, 0);
  burst(h.x + 0.5, h.y + 0.5, h.z + 0.5, def.c, 18);
  sfx('break');
  if (def.h >= 1) useTool([6, 8, 14, 16, 17, 25, 31].includes(b) && heldTool('axe') ? 'axe' : [2, 4, 20, 21, 22, 29, 30].includes(b) && heldTool('shovel') ? 'shovel' : 'pick');
  if (++G.acts % 20 === 0) { G.sp++; note('Fertigkeitspunkt erhalten!'); }
  P.stam = Math.max(0, P.stam - 1.5);
}
function placeBlock() {
  const s = held(), t = P.target; if (!s || !t || s.id >= 100) return false;
  const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz;
  if (y < 0 || y >= CH) return false;
  const cur = getB(x, y, z, 3); if (cur !== 0 && cur !== 5 && !PLANT(cur)) return false;
  if (isSolid(s.id) && x + 1 > P.x - 0.3 && x < P.x + 0.3 && y + 1 > P.y && y < P.y + 1.8 && z + 1 > P.z - 0.3 && z < P.z + 0.3) return false;
  setBlock(x, y, z, s.id); s.n--; if (!s.n) inv[hot] = null; uiDirty = true; sfx('place'); return true;
}
function eat() {
  const s = held(), it = s && ITEMS[s.id];
  if (!it || !it.food || P.hunger >= 20) return false;
  P.hunger = Math.min(20, P.hunger + it.food); if ((s.id === 101 || s.id === 111) && rnd() < 0.3) damagePlayer(2, 'Rohes Fleisch', true);
  s.n--; if (!s.n) inv[hot] = null; uiDirty = true; sfx('eat'); return true;
}
function lookingAtWater() {
  const d = dirVec();
  for (let t = 0.3; t < 4.5; t += 0.1) { const x = Math.floor(P.x + d[0] * t), y = Math.floor(P.y + 1.62 + d[1] * t), z = Math.floor(P.z + d[2] * t), b = getB(x, y, z, 0); if (b === 5) return true; if (isSolid(b)) return false; }
  return false;
}
function interact() {
  const t = P.target;
  if (t && t.b === 31) { openChest(t.x, t.y, t.z); return; }
  if (t && t.b === 13) { fuses.push({ x: t.x, y: t.y, z: t.z, t: 3 }); note('TNT gezündet!'); return; }
  if (t && t.b === 16) {
    P.spawn = { x: t.x + 0.5, z: t.z + 0.5 };
    if (isNight()) { G.t = 0.02; P.hunger = Math.max(1, P.hunger - 3); P.thirst = Math.max(1, P.thirst - 3); mobs = mobs.filter((m) => !MOBS[m.type].hostile); note('Geschlafen – Spawnpunkt gesetzt'); }
    else note('Spawnpunkt gesetzt (schlafen nur nachts)');
    return;
  }
  if (lookingAtWater()) { P.thirst = Math.min(20, P.thirst + 6); sfx('eat'); note('Getrunken'); return; }
}
function attack() {
  if (P.atk > 0) return false;
  P.atk = 0.45; P.swing = 1;
  const d = dirVec(), ex = P.x, ey = P.y + 1.62, ez = P.z, hit = raycast(ex, ey, ez, d[0], d[1], d[2], 4, true), maxT = hit ? Math.min(hit.t, 4) : 4;
  for (let t = 0.2; t < maxT; t += 0.1) {
    const x = ex + d[0] * t, y = ey + d[1] * t, z = ez + d[2] * t;
    for (const m of mobs) { const def = MOBS[m.type], hw = def.w / 2 + 0.1; if (Math.abs(x - m.x) < hw && Math.abs(z - m.z) < hw && y > m.y - 0.1 && y < m.y + def.h + 0.1) {
      const sw = heldTool('sword') || heldTool('axe'), base = sw ? ITEMS[sw.id].pow : heldTool('pick') ? 2 : 1;
      hitMob(m, base * (1 + 0.1 * G.sk.dmg) * (sw && sw.e ? 1.3 : 1), P.x, P.z);
      if (sw) useTool(ITEMS[sw.id].tool); sfx('hit'); return true;
    } }
  }
  return false;
}
const dirVec = () => [-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)];
function nearStation(id) {
  const x0 = Math.floor(P.x), y0 = Math.floor(P.y), z0 = Math.floor(P.z);
  for (let dy = -3; dy <= 3; dy++) for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) if (getB(x0 + dx, y0 + dy, z0 + dz, 0) === id) return true;
  return false;
}

// ---------- Handwerk / Fertigkeiten / Verzauberung ----------
function canCraft(r) { return r.in.every(([id, n]) => countItem(id) >= n) && (!r.st || nearStation(r.st)); }
function craftSize() { return nearStation(BENCH) ? 3 : 2; }
function craftCellIndices(size) { return size === 3 ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 3, 4]; }
function craftMatch(r, size) {
  const rows = r.pattern, ph = rows.length, pw = Math.max(...rows.map((row) => row.length));
  if (ph > size || pw > size || (r.st && !nearStation(r.st))) return false;
  for (let oy = 0; oy <= size - ph; oy++) for (let ox = 0; ox <= size - pw; ox++) for (let flip = 0; flip < 2; flip++) {
    let match = true;
    for (let y = 0; y < size && match; y++) for (let x = 0; x < size; x++) {
      const iy = y - oy, ix = x - ox, shapeX = flip ? pw - 1 - ix : ix;
      const expected = iy >= 0 && iy < ph && ix >= 0 && ix < pw ? rows[iy][shapeX] || 0 : 0;
      const actual = craftGrid[craftCellIndices(size)[y * size + x]];
      if ((actual ? actual.id : 0) !== expected) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}
function gridRecipe() { const size = craftSize(); return RECIPES.find((r) => r.pattern && craftMatch(r, size)) || null; }
function returnCraftGrid() {
  for (let i = 0; i < craftGrid.length; i++) if (craftGrid[i]) {
    const s = craftGrid[i], left = addItem(s.id, s.n, s.d, s.e);
    if (left) spawnItem(P.x, P.y + 1, P.z, s.id, left, s.d, s.e);
    craftGrid[i] = null;
  }
}
function fillCraftGrid(r) {
  if (!r.pattern || !canCraft(r)) return false;
  returnCraftGrid();
  const size = craftSize(), ph = r.pattern.length, pw = Math.max(...r.pattern.map((row) => row.length));
  if (ph > size || pw > size) return false;
  const oy = Math.floor((size - ph) / 2), ox = Math.floor((size - pw) / 2), indices = craftCellIndices(size);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const id = r.pattern[y][x] || 0; if (!id) continue;
    const slot = inv.find((s) => s && s.id === id);
    if (!slot) { returnCraftGrid(); return false; }
    slot.n--; if (!slot.n) inv[inv.indexOf(slot)] = null;
    craftGrid[indices[(oy + y) * size + ox + x]] = mkSlot(id, 1);
  }
  selSlot = null; renderInv(); return true;
}
function craftFromGrid() {
  const r = gridRecipe();
  if (!r) return;
  for (const i of craftCellIndices(craftSize())) if (craftGrid[i]) { craftGrid[i].n--; if (!craftGrid[i].n) craftGrid[i] = null; }
  const left = addItem(r.out[0], r.out[1]);
  if (left) spawnItem(P.x, P.y + 1, P.z, r.out[0], left, 0, 0, 0);
  sfx('pick'); renderInv();
}
function craft(r) {
  if (craftBusy || !canCraft(r)) return;
  craftBusy = true; note('Herstellen…', 800);
  setTimeout(() => {
    craftBusy = false;
    if (!canCraft(r)) return;
    for (const [id, n] of r.in) removeItem(id, n);
    const left = addItem(r.out[0], r.out[1]); if (left) spawnItem(P.x, P.y + 1, P.z, r.out[0], left, 0, 0, 0);
    sfx('pick'); renderInv();
  }, TEST ? 0 : 700 / (1 + 0.25 * G.sk.craft));
}
function enchantHeld() {
  const s = held(), it = s && ITEMS[s.id];
  if (!it || !it.tool || s.e) return note('Halte ein unverzaubertes Werkzeug');
  if (!nearStation(ENCH)) return note('Zaubertisch in der Nähe nötig');
  if (G.xp < 10) return note('10 XP nötig');
  G.xp -= 10; s.e = 1; note(it.tool === 'pick' ? 'Effizienz verliehen' : 'Schärfe verliehen'); renderInv();
}
function repairHeld() {
  const s = held(), it = s && ITEMS[s.id];
  if (!it || !it.tool || s.d >= it.dur) return note('Nichts zu reparieren');
  const mat = it.r === 2 ? 106 : 8;
  if (countItem(mat) < 1) return note('Material fehlt: ' + info(mat).n);
  removeItem(mat, 1); s.d = Math.min(it.dur, s.d + Math.ceil(it.dur * 0.4)); renderInv();
}
function skillUp(k) { if (G.sp < 1) return; G.sp--; G.sk[k]++; renderInv(); }

// ---------- Spieler-Update ----------
function step(dt) {
  G.t = (G.t + dt / 600) % 1;
  P.px = P.x; P.py = P.y; P.pz = P.z;
  P.atk -= dt; P.inv -= dt; P.swing = Math.max(0, P.swing - dt * 4);
  const f = [-Math.sin(P.yaw), -Math.cos(P.yaw)], r = [Math.cos(P.yaw), -Math.sin(P.yaw)];
  const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  let wx = f[0] * iz + r[0] * ix, wz = f[1] * iz + r[1] * ix; const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
  const sneak = keys.ShiftLeft || keys.ShiftRight, moving = l > 0;
  P.sprint = !sneak && iz > 0 && P.stam > 0 && (P.sprintKey || keys.ControlLeft);
  if (!moving || P.stam <= 0) P.sprint = false;
  let spd = sneak ? 1.8 : P.sprint ? 6.6 : 4.3;
  P.inWater = getB(Math.floor(P.x), Math.floor(P.y + 0.4), Math.floor(P.z), 0) === 5;
  P.head = getB(Math.floor(P.x), Math.floor(P.y + 1.62), Math.floor(P.z), 0) === 5;
  if (P.inWater) spd *= 0.6;
  const k = Math.min(1, dt * (P.og ? 12 : 3));
  P.vx += (wx * spd - P.vx) * k; P.vz += (wz * spd - P.vz) * k;
  if (keys.Space) {
    if (P.inWater) { P.vy = Math.min(P.vy + 30 * dt, 3.2); P.stam = Math.max(0, P.stam - 4 * dt); }
    else if (P.og) { P.vy = 8.6; }
  }
  P.vy -= (P.inWater ? 6 : 28) * dt; if (P.inWater && P.vy < -2.5) P.vy = -2.5; if (P.vy < -45) P.vy = -45;
  const wasG = P.og; moveBody(P, 0.6, 1.8, dt);
  if (!P.og && !P.inWater) P.fallMax = Math.max(P.fallMax, P.y); else if (P.inWater) P.fallMax = P.y;
  if (P.og && !wasG) { const fd = P.fallMax - P.y; if (fd > 3.5) damagePlayer(Math.floor(fd - 3), 'Sturz', true); }
  if (P.og) P.fallMax = P.y;
  if (P.og && moving) { P.step += Math.hypot(P.vx, P.vz) * dt; if (P.step > 2.2) { P.step = 0; sfx('step'); } }
  // Werte
  const hdrain = (P.sprint ? 2.2 : 1) * dt / 30, tdrain = (P.sprint ? 1.6 : 1) * dt / 22;
  P.hunger = Math.max(0, P.hunger - hdrain); P.thirst = Math.max(0, P.thirst - tdrain);
  if (W.rain && getB(Math.floor(P.x), Math.floor(P.y + 2), Math.floor(P.z), 0) === 0 && surfaceY(P.x, P.z) <= P.y + 2) P.thirst = Math.min(20, P.thirst + dt * 0.7);
  if (P.sprint) P.stam = Math.max(0, P.stam - 15 * dt); else if (!(keys.Space && P.inWater)) P.stam = Math.min(maxStam(), P.stam + 12 * dt);
  if (P.hunger >= 15 && P.thirst >= 10 && P.hp < 20) P.hp = Math.min(20, P.hp + dt * 0.5);
  if (P.hunger <= 0 || P.thirst <= 0) { P.starve += dt; if (P.starve >= 2) { P.starve = 0; damagePlayer(1, P.hunger <= 0 ? 'Verhungert' : 'Verdurstet', true); } } else P.starve = 0;
  if (P.head) { P.o2 -= dt; if (P.o2 <= 0) { P.o2 = 0; P.drown += dt; if (P.drown >= 1) { P.drown = 0; damagePlayer(2, 'Ertrunken', true); } } } else { P.o2 = Math.min(10, P.o2 + dt * 4); P.drown = 0; }
  // Ziel + Abbau
  const d = dirVec(); P.target = raycast(P.x, P.y + 1.62, P.z, d[0], d[1], d[2], 5.5);
  if (mouseL && P.target) {
    if (P.atk <= 0 && attack()) brk = null;
    else {
      const t = P.target;
      if (!brk || brk.x !== t.x || brk.y !== t.y || brk.z !== t.z) brk = { x: t.x, y: t.y, z: t.z, p: 0 };
      const hardness = BLOCKS[t.b].h, spdm = toolMult(t.b) * (P.stam < 10 ? 0.5 : 1);
      brk.p += (dt * spdm) / (hardness * 0.8); P.swing = Math.max(P.swing, 0.6);
      brk.snd = (brk.snd || 0) - dt; if (brk.snd <= 0) { brk.snd = 0.2; burst(t.x + 0.5 + t.nx * 0.5, t.y + 0.5 + t.ny * 0.5, t.z + 0.5 + t.nz * 0.5, blockTint(t.b), 3); noiseBurst(0.05, 0.25, 700); }
      if (brk.p >= 1) { breakBlock(t); brk = null; }
    }
  } else { if (mouseL) attack(); brk = null; }
  if (mouseR && P.rcd <= 0) { P.rcd = 0.22; if (!eat()) placeBlock(); }
  P.rcd -= dt;
  // Welt
  updateMobs(dt); spawner(dt);
  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i]; e.age += dt; e.life -= dt;
    e.vy -= 24 * dt; e.vx *= 1 - Math.min(1, dt * 3); e.vz *= 1 - Math.min(1, dt * 3);
    moveBody(e, 0.25, 0.25, dt);
    if (e.age > 0.4 && Math.hypot(e.x - P.x, e.y - P.y - 0.8, e.z - P.z) < 1.5) { const left = addItem(e.id, e.n, e.d, e.e); if (left < e.n) { sfx('pick'); } if (left === 0) { ents.splice(i, 1); continue; } e.n = left; }
    if (e.life <= 0 || e.y < -10) ents.splice(i, 1);
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.vy -= 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.life <= 0) parts.splice(i, 1); }
  for (let i = fuses.length - 1; i >= 0; i--) { const f2 = fuses[i]; f2.t -= dt; if (f2.t <= 0) { fuses.splice(i, 1); if (getB(f2.x, f2.y, f2.z, 0) === 13) setBlock(f2.x, f2.y, f2.z, 0); explode(f2.x + 0.5, f2.y + 0.5, f2.z + 0.5, 3.2); } }
  // Wetter
  W.timer -= dt; if (W.timer <= 0) { W.rain = !W.rain; W.timer = W.rain ? 60 + rnd() * 120 : 120 + rnd() * 240; note(W.rain ? 'Es beginnt zu regnen' : 'Der Regen hört auf'); }
  if (W.rain && rnd() < dt * 0.04) { W.flash = 1; setTimeout(() => sfx('thunder'), 500 + rnd() * 1500); }
  W.flash = Math.max(0, W.flash - dt * 2.5);
  if (capT > 0 && (capT -= dt) <= 0) $('caption').textContent = '';
}

// ---------- Rendering ----------
const fx = $('fx'), fxc = fx.getContext('2d');
const cloudBuf = gl.createBuffer();
let cloudMesh = null, cloudRefresh = 0;
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
const trans = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
let frames = 0, fps = 0, fpsT = 0, menuY = 40, menuReady = false;
const stars = []; { let q = 7; const rr = () => { q = (Math.imul(q, 1103515245) + 12345) >>> 0; return q / 4294967296; }; for (let i = 0; i < 180; i++) { const z = rr() * 2 - 1, a = rr() * 6.283, r = Math.sqrt(1 - z * z); stars.push([Math.cos(a) * r, z, Math.sin(a) * r, 0.5 + rr() * 0.8]); } }
function pushQuad(a, d, size, c) {
  const l = Math.hypot(d[0], d[2]) || 1, rx = -d[2] / l, rz = d[0] / l;
  const ux = -rz * d[1], uy = rz * d[0] - rx * d[2], uz = rx * d[1], cx = d[0] * 90, cy = d[1] * 90, cz = d[2] * 90;
  for (const q of [0, 1, 2, 0, 2, 3]) { const sx = [-1, 1, 1, -1][q] * size, sy = [-1, -1, 1, 1][q] * size; a.push(cx + rx * sx + ux * sy, cy + uy * sy, cz + rz * sx + uz * sy, WUV[0], WUV[1], c[0], c[1], c[2]); }
}

function drawMob(dyn, m) {
  const d = MOBS[m.type], hurt = m.hurt > 0, flash = m.fuse > 0 && Math.floor(m.fuse * 8) % 2 === 0;
  const C = (c) => (flash ? [1.7, 1.7, 1.7] : hurt ? [1, 0.45, 0.45] : c), T0 = T.mob, y = m.yaw, sw = Math.sin(m.walk) * 0.45;
  const L = (x0, y0, z0, x1, y1, z1, c, sc) => { const k = sc || 1; pushBoxR(dyn, m.x, m.y, m.z, y, x0 * k, y0 * k, z0 * k, x1 * k, y1 * k, z1 * k, C(c), T0); };
  const t = m.type;
  if (t === 'zombie' || t === 'boss') {
    const k = d.h / 1.8, sk = [0.2, 0.45, 0.62], pants = [0.22, 0.22, 0.5], skin = d.col;
    L(-0.3, 0, -0.15 + sw * 0.3, 0, 0.7, 0.15 + sw * 0.3, pants, k); L(0, 0, -0.15 - sw * 0.3, 0.3, 0.7, 0.15 - sw * 0.3, pants, k);
    L(-0.3, 0.7, -0.15, 0.3, 1.4, 0.15, sk, k); L(-0.25, 1.4, -0.25, 0.25, 1.9 - 0.1, 0.25, skin, k);
    L(-0.17, 1.58, 0.25, -0.05, 1.66, 0.27, [0.02, 0.02, 0.02], k); L(0.05, 1.58, 0.25, 0.17, 1.66, 0.27, [0.02, 0.02, 0.02], k);
    L(-0.55, 1.1, 0.0, -0.3, 1.4, 0.65, skin, k); L(0.3, 1.1, 0.0, 0.55, 1.4, 0.65, skin, k);
  } else if (t === 'skeleton') {
    const b = d.col;
    L(-0.2, 0, -0.08 + sw * 0.25, -0.02, 0.7, 0.08 + sw * 0.25, b); L(0.02, 0, -0.08 - sw * 0.25, 0.2, 0.7, 0.08 - sw * 0.25, b);
    L(-0.2, 0.7, -0.1, 0.2, 1.4, 0.1, [0.78, 0.78, 0.72]); L(-0.25, 1.4, -0.25, 0.25, 1.85, 0.25, b);
    L(-0.17, 1.58, 0.25, -0.05, 1.68, 0.27, [0.03, 0.03, 0.03], 1); L(0.05, 1.58, 0.25, 0.17, 1.68, 0.27, [0.03, 0.03, 0.03], 1);
    L(-0.33, 1.1, 0.1, -0.2, 1.4, 0.6, b); L(0.2, 1.1, 0.1, 0.33, 1.4, 0.6, b); L(-0.04, 0.95, 0.5, 0.04, 1.6, 0.58, [0.42, 0.3, 0.16]);
  } else if (t === 'creeper') {
    const b = d.col, sq = 1 + (m.fuse > 0 ? m.fuse * 0.18 : 0);
    L(-0.25, 0, -0.3 + sw * 0.15, -0.02, 0.5, -0.08 + sw * 0.15, b); L(0.02, 0, -0.3 - sw * 0.15, 0.25, 0.5, -0.08 - sw * 0.15, b);
    L(-0.25, 0, 0.08 - sw * 0.15, -0.02, 0.5, 0.3 - sw * 0.15, b); L(0.02, 0, 0.08 + sw * 0.15, 0.25, 0.5, 0.3 + sw * 0.15, b);
    L(-0.25 * sq, 0.5, -0.15 * sq, 0.25 * sq, 1.3, 0.15 * sq, b); L(-0.25 * sq, 1.3, -0.25 * sq, 0.25 * sq, 1.75, 0.25 * sq, [b[0] * 1.1, b[1] * 1.1, b[2] * 1.1]);
    const dk = [0.03, 0.08, 0.03]; L(-0.19, 1.5, 0.25 * sq, -0.06, 1.63, 0.27 * sq, dk); L(0.06, 1.5, 0.25 * sq, 0.19, 1.63, 0.27 * sq, dk); L(-0.06, 1.33, 0.25 * sq, 0.06, 1.5, 0.27 * sq, dk);
  } else if (t === 'spider') {
    const b = d.col;
    L(-0.35, 0.3, -0.95, 0.35, 0.78, -0.25, b); L(-0.25, 0.3, -0.25, 0.25, 0.68, 0.25, [b[0] * 1.2, b[1] * 1.2, b[2] * 1.2]); L(-0.2, 0.36, 0.25, 0.2, 0.7, 0.62, b);
    L(-0.13, 0.52, 0.62, -0.04, 0.6, 0.64, [0.9, 0.05, 0.05]); L(0.04, 0.52, 0.62, 0.13, 0.6, 0.64, [0.9, 0.05, 0.05]);
    for (let i = 0; i < 4; i++) { const z0 = -0.35 + i * 0.22 + (i % 2 ? sw : -sw) * 0.12; L(-0.95, 0.22, z0, -0.22, 0.3, z0 + 0.07, b); L(0.22, 0.22, z0, 0.95, 0.3, z0 + 0.07, b); L(-0.95, 0, z0, -0.87, 0.3, z0 + 0.07, b); L(0.87, 0, z0, 0.95, 0.3, z0 + 0.07, b); }
  } else if (t === 'pig') {
    const c = d.col;
    L(-0.45, 0.25, -0.4, 0.45, 0.8, 0.4, c); L(-0.25, 0.4, 0.4, 0.25, 0.85, 0.8, [c[0] * 0.97, c[1] * 0.88, c[2] * 0.88]); L(-0.12, 0.45, 0.8, 0.12, 0.62, 0.86, [1, 0.6, 0.65]);
    L(-0.18, 0.65, 0.78, -0.1, 0.72, 0.81, [0.1, 0.1, 0.1]); L(0.1, 0.65, 0.78, 0.18, 0.72, 0.81, [0.1, 0.1, 0.1]);
    for (const [lx, lz, ph] of [[-0.25, -0.3, 1], [0.25, -0.3, -1], [-0.25, 0.3, -1], [0.25, 0.3, 1]]) L(lx - 0.08, 0, lz - 0.08 + sw * 0.15 * ph, lx + 0.08, 0.25, lz + 0.08 + sw * 0.15 * ph, [c[0] * 0.85, c[1] * 0.75, c[2] * 0.75]);
  } else if (t === 'cow') {
    const c = d.col;
    L(-0.35, 0.5, -0.6, 0.35, 1.1, 0.5, c); L(-0.2, 0.9, -0.3, 0.1, 1.12, 0.1, [0.95, 0.95, 0.95]); L(0.05, 0.6, -0.55, 0.36, 1.12, -0.2, [0.95, 0.95, 0.95]);
    L(-0.25, 0.8, 0.5, 0.25, 1.25, 0.9, [c[0] * 1.1, c[1] * 1.1, c[2] * 1.1]); L(-0.17, 0.82, 0.88, 0.17, 1.0, 0.95, [0.85, 0.7, 0.6]);
    L(-0.3, 1.2, 0.55, -0.22, 1.34, 0.62, [0.95, 0.95, 0.85]); L(0.22, 1.2, 0.55, 0.3, 1.34, 0.62, [0.95, 0.95, 0.85]);
    L(-0.17, 1.08, 0.88, -0.1, 1.14, 0.9, [0.05, 0.05, 0.05]); L(0.1, 1.08, 0.88, 0.17, 1.14, 0.9, [0.05, 0.05, 0.05]);
    for (const [lx, lz, ph] of [[-0.22, -0.45, 1], [0.22, -0.45, -1], [-0.22, 0.35, -1], [0.22, 0.35, 1]]) L(lx - 0.09, 0, lz - 0.09 + sw * 0.14 * ph, lx + 0.09, 0.5, lz + 0.09 + sw * 0.14 * ph, [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8]);
  } else if (t === 'sheep') {
    L(-0.4, 0.45, -0.55, 0.4, 1.12, 0.5, [0.97, 0.97, 0.95]); L(-0.22, 0.78, 0.5, 0.22, 1.2, 0.88, [0.4, 0.38, 0.36]);
    L(-0.14, 1.0, 0.88, -0.07, 1.06, 0.9, [0.05, 0.05, 0.05]); L(0.07, 1.0, 0.88, 0.14, 1.06, 0.9, [0.05, 0.05, 0.05]); L(-0.22, 1.12, 0.45, 0.22, 1.28, 0.8, [0.97, 0.97, 0.95]);
    for (const [lx, lz, ph] of [[-0.22, -0.4, 1], [0.22, -0.4, -1], [-0.22, 0.32, -1], [0.22, 0.32, 1]]) L(lx - 0.07, 0, lz - 0.07 + sw * 0.14 * ph, lx + 0.07, 0.45, lz + 0.07 + sw * 0.14 * ph, [0.45, 0.42, 0.4]);
  } else if (t === 'chicken') {
    L(-0.15, 0.25, -0.2, 0.15, 0.6, 0.2, [0.97, 0.97, 0.97]); L(-0.08, 0.55, 0.12, 0.08, 0.82, 0.27, [0.97, 0.97, 0.97]); L(-0.04, 0.62, 0.27, 0.04, 0.68, 0.35, [0.95, 0.6, 0.1]); L(-0.02, 0.8, 0.14, 0.02, 0.9, 0.24, [0.85, 0.1, 0.1]);
    L(-0.12, 0.4, -0.3, 0.12, 0.55, -0.18, [0.9, 0.9, 0.9]);
    L(-0.1, 0, -0.03 + sw * 0.1, -0.06, 0.25, 0.01 + sw * 0.1, [0.95, 0.7, 0.1]); L(0.06, 0, -0.03 - sw * 0.1, 0.1, 0.25, 0.01 - sw * 0.1, [0.95, 0.7, 0.1]);
  }
}
const blockTint = (id) => (BLOCKS[id] ? BLOCKS[id].c : [1, 1, 1]);
function render(alpha) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25), w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; fx.width = innerWidth; fx.height = innerHeight; }
  const menu = state === 'menu', k = dayK();
  let sky = mix([0.02, 0.03, 0.09], [0.5, 0.74, 0.96], k), light = 0.3 + 0.7 * k;
  const dusk = Math.abs(sunH()); if (dusk < 0.2) sky = mix(sky, [0.95, 0.55, 0.3], (1 - dusk / 0.2) * 0.5);
  const rdv = menu ? 5 : settings.rd;
  let far = rdv * CS * 0.95 * (menu ? 1 : settings.fog);
  if (W.rain && !menu) { sky = mix(sky, [0.4, 0.42, 0.46].map((v) => v * (0.3 + 0.7 * k)), 0.6); light *= 0.8; far *= 0.7; }
  if (W.flash > 0) { sky = mix(sky, [1, 1, 1], W.flash * 0.6); light = Math.min(1.2, light + W.flash * 0.5); }
  if (P.head && !menu) { sky = [0.1, 0.25, 0.5].map((v) => v * (0.3 + 0.7 * k)); far = 18; }
  gl.viewport(0, 0, w, h); gl.clearColor(sky[0], sky[1], sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  let ex, ey, ez, dv, px0, pz0;
  if (menu) {
    if (!menuReady) return;
    const yw = performance.now() / 11000, pc = -0.22; ex = 0.5; ez = 0.5; ey = menuY + Math.sin(yw * 2) * 1.5;
    dv = [-Math.sin(yw) * Math.cos(pc), Math.sin(pc), -Math.cos(yw) * Math.cos(pc)]; px0 = 0.5; pz0 = 0.5;
  } else {
    if (state === 'dead' || !chunks.size) { /* weiter */ }
    ex = P.px + (P.x - P.px) * alpha; ey = P.py + (P.y - P.py) * alpha + 1.62 - (keys.ShiftLeft ? 0.15 : 0); ez = P.pz + (P.z - P.pz) * alpha; dv = dirVec(); px0 = P.x; pz0 = P.z;
  }
  const fovMul = P.sprint && !settings.rm && !menu ? 1.08 : 1;
  const proj = persp(((menu ? 70 : settings.fov) * fovMul * Math.PI) / 180, w / h, 0.1, 400);
  gl.useProgram(prog);
  gl.uniform3f(U.cam, 0, 0, 0); gl.uniform3fv(U.fog, sky); gl.uniform1f(U.fn, 1e5); gl.uniform1f(U.ff, 1e6); gl.uniform1f(U.light, 1); gl.uniform1f(U.alpha, 1);
  // Himmel: Sterne, Sonne, Mond (additiv)
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.uniformMatrix4fv(U.m, false, mul(proj, lookAt([0, 0, 0], dv)));
  const sk = [], ang = G.t * Math.PI * 2, sd = [0.2, Math.sin(ang), Math.cos(ang)], sl = Math.hypot(...sd); sd[0] /= sl; sd[1] /= sl; sd[2] /= sl;
  const night = 1 - k; if (night > 0.05 && !W.rain) for (const s of stars) pushQuad(sk, s, 0.35 * s[3], [night * s[3], night * s[3], night * s[3]]);
  pushQuad(sk, sd, 8, [1, 0.92, 0.55]); pushQuad(sk, [-sd[0], -sd[1], -sd[2]], 5.5, [0.8, 0.85, 1]);
  drawDyn(sk);
  gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  const mvp = mul(proj, lookAt([ex, ey, ez], [ex + dv[0], ey + dv[1], ez + dv[2]]));
  gl.uniformMatrix4fv(U.m, false, mvp); gl.uniform3f(U.cam, ex, ey, ez);
  gl.uniform1f(U.fn, far * 0.6); gl.uniform1f(U.ff, far); gl.uniform1f(U.light, light);
  const pcx = Math.floor(px0) >> 4, pcz = Math.floor(pz0) >> 4, vis = [];
  for (const c of chunks.values()) {
    if (!c.mesh) continue;
    const ddx = c.cx - pcx, ddz = c.cz - pcz; if (ddx * ddx + ddz * ddz > (rdv + 1) * (rdv + 1)) continue;
    const cxw = c.cx * CS + 8 - ex, czw = c.cz * CS + 8 - ez;
    if (cxw * dv[0] + czw * dv[2] < -24 && ddx * ddx + ddz * ddz > 2) continue;
    vis.push(c); if (c.mesh.op) drawBuf(c.mesh.op);
  }
  if (!menu) {
    const dyn = [];
    for (const m of mobs) drawMob(dyn, m);
    for (const q of arrows) { const l = Math.hypot(q.vx, q.vy, q.vz) || 1; pushBox(dyn, q.x - 0.04 - Math.abs(q.vx / l) * 0.3, q.y - 0.04 - Math.abs(q.vy / l) * 0.3, q.z - 0.04 - Math.abs(q.vz / l) * 0.3, q.x + 0.04 + Math.abs(q.vx / l) * 0.3, q.y + 0.04 + Math.abs(q.vy / l) * 0.3, q.z + 0.04 + Math.abs(q.vz / l) * 0.3, [0.75, 0.65, 0.45], 0); }
    const tm = performance.now() / 600;
    for (const e of ents) {
      const by = e.y + 0.18 + Math.sin(tm + e.x) * 0.05;
      if (e.id < 100) pushBox(dyn, e.x - 0.14, by, e.z - 0.14, e.x + 0.14, by + 0.28, e.z + 0.14, [1, 1, 1], cubeTiles(e.id));
      else { const t = ITEMTILE[e.id], sp = tm * 1.2, cx2 = Math.cos(sp) * 0.22, sx2 = Math.sin(sp) * 0.22; pushPlane(dyn, e.x, by + 0.22, e.z, cx2, 0, sx2, 0, 0.22, 0, t, [1, 1, 1]); }
    }
    for (const p of parts) { const s = 0.04 + p.life * 0.05; pushBox(dyn, p.x - s, p.y - s, p.z - s, p.x + s, p.y + s, p.z + s, p.c, 0); }
    for (const f2 of fuses) if (Math.floor(f2.t * 4) % 2 === 0) pushBox(dyn, f2.x - 0.01, f2.y - 0.01, f2.z - 0.01, f2.x + 1.01, f2.y + 1.01, f2.z + 1.01, [1.6, 1.6, 1.6], T.tntSide);
    drawDyn(dyn);
    // Umriss + Geisterblock
    gl.uniform1f(U.fn, 1e5); gl.uniform1f(U.ff, 1e6);
    const lines = [], t = P.target;
    if (t && state === 'play') {
      pushWire(lines, t.x - 0.003, t.y - 0.003, t.z - 0.003, t.x + 1.003, t.y + 1.003, t.z + 1.003, [0, 0, 0]);
      const s = held(); if (s && s.id < 100) { const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz; pushWire(lines, x + 0.02, y + 0.02, z + 0.02, x + 0.98, y + 0.98, z + 0.98, [0.4, 1, 0.4]); }
    }
    gl.uniform1f(U.light, 1); drawDyn(lines, gl.LINES);
    gl.uniform1f(U.fn, far * 0.6); gl.uniform1f(U.ff, far); gl.uniform1f(U.light, light);
  }
  // Transparente Passes: Risse, Wasser, Wolken
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  if (!menu && brk && state === 'play') { const cr = [], st = Math.min(9, Math.floor(brk.p * 10)); pushBox(cr, brk.x - 0.003, brk.y - 0.003, brk.z - 0.003, brk.x + 1.003, brk.y + 1.003, brk.z + 1.003, [1, 1, 1], T.crack + st); gl.uniform1f(U.alpha, 1); drawDyn(cr); }
  gl.uniform1f(U.alpha, 0.66);
  for (const c of vis) if (c.mesh.wt) drawBuf(c.mesh.wt);
  { // Wolkengeometrie nur viermal pro Sekunde neu erzeugen und hochladen.
    const now = performance.now();
    if (!cloudMesh || now - cloudRefresh >= 250) {
      const cl = [], sz = 12, drift = now / 1000 * 0.6, ccx = Math.floor((ex + drift) / sz), ccz = Math.floor(ez / sz), cc = W.rain ? [0.7, 0.72, 0.76] : [1, 1, 1];
      for (let dz = -11; dz <= 11; dz++) for (let dx = -11; dx <= 11; dx++) { const gx = ccx + dx, gz = ccz + dz; if (noise2(gx * 0.33, gz * 0.33, 99) > (W.rain ? 0.44 : 0.56)) { const x0 = gx * sz - drift, z0 = gz * sz; pushBox(cl, x0, CH + 12, z0, x0 + sz, CH + 15, z0 + sz, cc, 0); } }
      gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cl), gl.STATIC_DRAW);
      cloudMesh = { buf: cloudBuf, n: cl.length / 8 };
      cloudRefresh = now;
    }
    gl.uniform1f(U.alpha, 0.82); gl.uniform1f(U.light, Math.max(0.45, light)); if (cloudMesh.n) drawBuf(cloudMesh);
  }
  gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(U.alpha, 1);
  // Hand
  if (!menu && (state === 'play' || state === 'paused')) {
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const bob = settings.rm ? 0 : Math.sin(performance.now() / 160) * 0.012 * Math.min(1, Math.hypot(P.vx, P.vz) / 4);
    const sw = Math.sin((1 - P.swing) * Math.PI) * (P.swing > 0 ? 1 : 0);
    const held0 = held(), isItem = held0 && held0.id >= 100, tool = held0 && ITEMS[held0.id] && ITEMS[held0.id].tool;
    gl.uniform3f(U.cam, 0, 0, 0); gl.uniform1f(U.fn, 1e5); gl.uniform1f(U.ff, 1e6); gl.uniform1f(U.light, 0.6 + 0.4 * k);
    // Arm
    const HA = mul(trans(0.36, -0.4 + bob, -0.35), mul(rotX(-0.15 - sw * 0.9), rotY(-0.12)));
    gl.uniformMatrix4fv(U.m, false, mul(proj, HA));
    const arm = []; pushBox(arm, -0.06, -0.07, -0.1, 0.06, 0.05, 0.4, [1, 1, 1], T.skin); drawDyn(arm);
    if (held0) {
      const sc = tool === 'sword' ? 0.2 : isItem ? 0.14 : 0;
      const HI = mul(trans(0.34, -0.36 + bob, -0.55 - sw * 0.05), mul(rotX(-sw * 1.2), mul(rotY(-0.25), rotZ(tool ? 0.55 : 0.3))));
      gl.uniformMatrix4fv(U.m, false, mul(proj, HI));
      const it = [];
      if (isItem) pushPlane(it, sc * 0.75, sc * 0.75, 0, sc, 0, 0, 0, sc, 0, ITEMTILE[held0.id], [1, 1, 1]);
      else pushBox(it, -0.08, 0, -0.08, 0.08, 0.16, 0.08, [1, 1, 1], cubeTiles(held0.id));
      drawDyn(it);
    }
  }
  fxc.clearRect(0, 0, fx.width, fx.height);
  if (!menu) {
    if (W.rain) { fxc.strokeStyle = 'rgba(180,200,230,.5)'; fxc.beginPath(); for (let i = 0; i < 160; i++) { const x = rnd() * fx.width, y = rnd() * fx.height; fxc.moveTo(x, y); fxc.lineTo(x - 4, y + 16); } fxc.stroke(); }
    if (W.flash > 0.2) { fxc.fillStyle = 'rgba(255,255,255,' + W.flash * 0.5 + ')'; fxc.fillRect(0, 0, fx.width, fx.height); }
    if (P.head) { fxc.fillStyle = 'rgba(20,60,140,.35)'; fxc.fillRect(0, 0, fx.width, fx.height); }
  }
}

// ---------- Karte ----------
const mapMem = new Map(), found = new Map();
function colAt(x, z) {
  const c = getChunk(x >> 4, z >> 4); if (!c) return null;
  const lx = x & 15, lz = z & 15;
  for (let y = CH - 1; y >= 0; y--) { const b = c.b[idx(lx, y, lz)]; if (b) { const col = BLOCKS[b].c, s = 0.7 + 0.3 * (y / CH); return [col[0] * s * 255, col[1] * s * 255, col[2] * s * 255]; } }
  return [0, 0, 0];
}
function updateMap() {
  const R = 48, mc = $('mini').getContext('2d'), im = mc.createImageData(96, 96);
  for (let j = 0; j < 96; j++) for (let i = 0; i < 96; i++) {
    const wx = Math.floor(P.x) - R + i * 1, wz = Math.floor(P.z) - R + j * 1; // 1 Block = 1 px bei 96 px => Radius 48
    const col = colAt(wx, wz), o = (j * 96 + i) * 4;
    if (col) { im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255;
      const k = ck(wx >> 4, wz >> 4); let m = mapMem.get(k); if (!m) { m = new Uint8Array(256 * 3); mapMem.set(k, m); }
      const q = ((wz & 15) * 16 + (wx & 15)) * 3; m[q] = col[0]; m[q + 1] = col[1]; m[q + 2] = col[2] }
    else im.data[o + 3] = 255;
  }
  mc.putImageData(im, 0, 0); mc.fillStyle = '#fff'; mc.fillRect(R - 2, R - 2, 4, 4);
  for (const c of chunks.values()) if (c.cabin && Math.hypot(c.cabin.x - P.x, c.cabin.z - P.z) < 50) found.set(c.cx + ',' + c.cz, c.cabin);
  for (const m of mobs) { const dx = m.x - P.x + R, dz = m.z - P.z + R; if (dx > 0 && dz > 0 && dx < 96 && dz < 96) { mc.fillStyle = m.type === 'pig' ? '#fbb' : '#f33'; mc.fillRect(dx - 1, dz - 1, 3, 3); } }
}
function drawBigMap() {
  const c = $('map'), g = c.getContext('2d'), R = 128, im = g.createImageData(512, 512);
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    const wx = Math.floor(P.x) - R + (i >> 1), wz = Math.floor(P.z) - R + (j >> 1), m = mapMem.get(ck(wx >> 4, wz >> 4)), o = (j * 512 + i) * 4;
    im.data[o + 3] = 255;
    if (m) { const q = ((wz & 15) * 16 + (wx & 15)) * 3; im.data[o] = m[q]; im.data[o + 1] = m[q + 1]; im.data[o + 2] = m[q + 2]; }
  }
  g.putImageData(im, 0, 0);
  for (const s of found.values()) { const x = (s.x - P.x + R) * 2, y = (s.z - P.z + R) * 2; g.fillStyle = '#fd0'; g.fillRect(x - 5, y - 5, 10, 10); g.strokeStyle = '#000'; g.strokeRect(x - 5, y - 5, 10, 10); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(256, 256, 5, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText('N', 250, 16); g.fillText('Entdeckte Strukturen: ' + found.size, 8, 504);
}

// ---------- HUD / UI ----------
const hotEl = $('hot'); for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'slot'; hotEl.appendChild(d); }
const rarity = (s) => (s.e ? 3 : ITEMS[s.id] && ITEMS[s.id].r === 2 ? 2 : ITEMS[s.id] && ITEMS[s.id].r === 1 ? 1 : 0);
function tip(s) {
  const it = info(s.id), t = ITEMS[s.id]; let o = it.n;
  if (t && t.tool) o += '\nHaltbarkeit: ' + s.d + '/' + t.dur + (t.tool === 'pick' ? '\nAbbau-Tempo x' + (t.pow / 3).toFixed(1) : '\nSchaden ' + t.pow);
  if (t && t.food) o += '\nNahrung +' + t.food;
  if (s.e) o += '\nVerzaubert: ' + (t.tool === 'pick' ? 'Effizienz' : 'Schärfe');
  return o;
}
function slotHTML(s) {
  if (!s) return '';
  const t = ITEMS[s.id], rc = ['transparent', '#6c6', '#6af', '#c6f'][rarity(s)];
  return '<img class="ic" src="' + iconURL(s.id) + '" style="filter:drop-shadow(0 0 2px ' + rc + ')">' + (s.n > 1 ? '<b>' + s.n + '</b>' : '') + (t && t.tool && s.d < t.dur ? '<em style="--w:' + (100 * s.d / t.dur) + '%;--c:hsl(' + (120 * s.d / t.dur) + ',80%,45%)"></em>' : '');
}
function renderHot() { [...hotEl.children].forEach((e, i) => { e.className = 'slot' + (i === hot ? ' sel' : ''); e.innerHTML = slotHTML(inv[i]); e.title = inv[i] ? tip(inv[i]) : ''; }); }
let selSlot = null, invTab = 'i';
function renderCraftGrid() {
  const size = craftSize(), el = $('craftGrid'), indices = craftCellIndices(size), recipe = gridRecipe();
  el.style.setProperty('--cols', size);
  el.innerHTML = indices.map((i) => '<div class="slot" data-cs="' + i + '">' + slotHTML(craftGrid[i]) + '</div>').join('');
  const result = $('craftResult');
  result.innerHTML = recipe ? slotHTML(mkSlot(recipe.out[0], recipe.out[1])) : '';
  result.disabled = !recipe;
  $('craftHint').textContent = size === 3 ? 'Werkbank: 3×3 · Klick auf Rezept = Zutaten einsetzen' : 'Inventar: 2×2 · Werkbank für größere Rezepte';
}
function renderInv() {
  let h = '';
  if (invTab === 'i') {
    h = '<div id="grid">' + inv.map((s, i) => '<div class="slot' + (selSlot === i ? ' sel' : '') + '" data-i="' + i + '" title="' + (s ? tip(s).replace(/"/g, '') : '') + '">' + slotHTML(s) + '</div>').join('') + '</div>' +
      '<p style="max-width:440px;font-size:12px;opacity:.8">Klicke einen Slot, dann einen zweiten zum Verschieben/Tauschen. Erste Reihe = Hotbar. Shift+Klick: in Hotbar/Inventar verschieben.<br>XP: <b>' + G.xp + '</b> · Fertigkeitspunkte: <b>' + G.sp + '</b></p>' +
      '<div class="row"><button id="bEnch" style="min-width:0">Verzaubern (10 XP)</button><button id="bRep" style="min-width:0">Reparieren</button><button id="bSort" style="min-width:0">Sortieren</button></div>';
  } else {
    const S = [['dmg', 'Schaden (+10 %)'], ['stam', 'Ausdauer (+10 max)'], ['craft', 'Herstellungs-Tempo'], ['luck', 'Beute-Glück']];
    h = '<p>Fertigkeitspunkte: <b>' + G.sp + '</b> (alle 20 Abbauten / 3 Kills)</p>' + S.map(([k, n]) => '<div class="row" style="margin:4px 0"><button data-k="' + k + '" style="min-width:230px">' + n + ' – Stufe ' + G.sk[k] + '</button></div>').join('');
  }
  $('invL').innerHTML = h;
  const q = $('rs').value.toLowerCase(); let cat = '', rh = '';
  for (const r of RECIPES) {
    if (q && !(r.n.toLowerCase().includes(q) || r.cat.toLowerCase().includes(q))) continue;
    if (r.cat !== cat) { cat = r.cat; rh += '<div style="opacity:.6;margin-top:4px">' + cat + '</div>'; }
    const ok = canCraft(r), st = r.st ? (r.st === BENCH ? ' [Werkbank]' : ' [Ofen]') : '';
    rh += '<button data-r="' + RECIPES.indexOf(r) + '" ' + (ok ? '' : 'disabled') + '><img src="' + iconURL(r.out[0]) + '"><span>' + r.n + ' ×' + r.out[1] + st + '<br><span style="opacity:.7">' + r.in.map(([id, n]) => n + '× ' + info(id).n).join(', ') + '</span></span></button>';
  }
  $('recipes').innerHTML = rh;
  renderCraftGrid();
}
$('invL').addEventListener('click', (e) => {
  const sl = e.target.closest('[data-i]'), kk = e.target.closest('[data-k]');
  if (kk) return skillUp(kk.dataset.k);
  if (e.target.id === 'bEnch') return enchantHeld(); if (e.target.id === 'bRep') return repairHeld();
  if (e.target.id === 'bSort') { const all = inv.slice(9).filter(Boolean).sort((a, b) => a.id - b.id); for (let i = 9; i < 36; i++) inv[i] = all[i - 9] || null; return renderInv(); }
  if (!sl) return; const i = +sl.dataset.i;
  if (e.shiftKey && inv[i]) { const to = i < 9 ? [9, 36] : [0, 9]; for (let j = to[0]; j < to[1]; j++) if (!inv[j]) { inv[j] = inv[i]; inv[i] = null; break; } }
  else if (selSlot === null) { if (inv[i]) selSlot = i; }
  else { const a = inv[selSlot], b = inv[i]; if (selSlot !== i) { if (a && b && a.id === b.id && !ITEMS[a.id]?.tool && b.n < 64) { const k = Math.min(a.n, 64 - b.n); b.n += k; a.n -= k; if (!a.n) inv[selSlot] = null; } else { inv[selSlot] = b; inv[i] = a; } } selSlot = null; }
  uiDirty = true; renderInv();
});
$('recipes').addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { const r = RECIPES[+b.dataset.r]; if (r.pattern) { if (!fillCraftGrid(r)) note('Zutaten oder Werkbank fehlen'); } else craft(r); } });
$('craftGrid').addEventListener('click', (e) => {
  const cell = e.target.closest('[data-cs]'); if (!cell) return;
  const i = +cell.dataset.cs, current = craftGrid[i];
  if (selSlot !== null && inv[selSlot]) {
    const source = inv[selSlot];
    if (!current || current.id === source.id) {
      craftGrid[i] = current || mkSlot(source.id, 0, source.d, source.e);
      craftGrid[i].n++; source.n--; if (!source.n) inv[selSlot] = null;
      selSlot = null;
    }
  } else if (current) {
    const left = addItem(current.id, current.n, current.d, current.e);
    if (!left) craftGrid[i] = null; else current.n = left;
  }
  renderInv();
});
$('craftResult').addEventListener('click', craftFromGrid);
$('rs').addEventListener('input', renderInv);
document.querySelectorAll('.tabs [data-t]').forEach((b) => b.addEventListener('click', () => { invTab = b.dataset.t; renderInv(); }));
$('rs').addEventListener('keydown', (e) => e.stopPropagation());

function renderChest() {
  const contents = chestData.get(activeChestKey) || [];
  $('chestGrid').innerHTML = contents.map((s, i) => '<div class="slot" data-chest="' + i + '">' + slotHTML(s) + '</div>').join('');
  $('chestInv').innerHTML = inv.map((s, i) => '<div class="slot" data-chestinv="' + i + '">' + slotHTML(s) + '</div>').join('');
}
function openChest(x, y, z) {
  activeChestKey = chestKey(x, y, z);
  if (!chestData.has(activeChestKey)) {
    const contents = new Array(27).fill(null), c = getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4);
    const cabinChest = c && c.cabin && Math.floor(c.cabin.x) + 2 === Math.floor(x) && Math.floor(c.cabin.z) - 2 === Math.floor(z);
    if (cabinChest) {
      const loot = [8, 8, 11, 100, 102, 106, 4, 9], count = 3 + Math.floor(hash3(x, y, z, 5100) * 3);
      for (let n = 0; n < count; n++) {
        let i = Math.floor(hash3(x, y + n, z, 5200) * contents.length);
        while (contents[i]) i = (i + 1) % contents.length;
        const id = loot[Math.floor(hash3(x, y + n, z, 5300) * loot.length)];
        contents[i] = mkSlot(id, id === 8 || id === 11 ? 2 + Math.floor(hash3(x, y + n, z, 5400) * 5) : 1 + Math.floor(hash3(x, y + n, z, 5400) * 2));
      }
    }
    chestData.set(activeChestKey, contents);
  }
  state = 'chest'; show('chest'); renderChest(); if (document.exitPointerLock) document.exitPointerLock(); saveGame();
}
function closeChest() { state = 'play'; activeChestKey = null; hideAll(); lock(); saveGame(); }
$('chestPanel').addEventListener('click', (e) => {
  const chestSlot = e.target.closest('[data-chest]'), invSlot = e.target.closest('[data-chestinv]'), contents = chestData.get(activeChestKey);
  if (!contents) return;
  if (chestSlot) {
    const i = +chestSlot.dataset.chest, s = contents[i]; if (!s) return;
    const left = addItem(s.id, s.n, s.d, s.e), moved = s.n - left;
    s.n = left; if (!s.n) contents[i] = null;
    if (moved) saveGame();
  } else if (invSlot) {
    const i = +invSlot.dataset.chestinv, s = inv[i]; if (!s) return;
    let remaining = s.n, max = ITEMS[s.id] && ITEMS[s.id].tool ? 1 : 64;
    for (const c of contents) if (c && c.id === s.id && c.n < max) { const moved = Math.min(remaining, max - c.n); c.n += moved; remaining -= moved; if (!remaining) break; }
    for (let j = 0; j < contents.length && remaining > 0; j++) if (!contents[j]) { const moved = Math.min(remaining, max); contents[j] = mkSlot(s.id, moved, s.d, s.e); remaining -= moved; }
    const moved = s.n - remaining; s.n = remaining; if (!s.n) inv[i] = null;
    if (moved) saveGame();
  } else return;
  uiDirty = true; renderChest();
});
$('bChestClose').addEventListener('click', closeChest);

function heldLabel() { const s = held(), e = $('held'); if (!s) { e.style.opacity = 0; return; } e.textContent = info(s.id).n + (s.e ? ' (verzaubert)' : ''); e.style.opacity = 1; clearTimeout(heldLabel.h); heldLabel.h = setTimeout(() => (e.style.opacity = 0), 1500); }
let hudT = 0;
function updateHUD() {
  const set = (cls, v, mx, txt) => { const b = document.querySelector('.bar.' + cls); b.firstElementChild.style.width = (100 * v / mx) + '%'; b.lastElementChild.textContent = txt; };
  set('hp', P.hp, 20, 'Leben ' + Math.ceil(P.hp)); set('hu', P.hunger, 20, 'Hunger ' + Math.ceil(P.hunger)); set('th', P.thirst, 20, 'Durst ' + Math.ceil(P.thirst)); set('st', P.stam, maxStam(), 'Ausdauer ' + Math.ceil(P.stam));
  const ox = document.querySelector('.bar.ox'); ox.classList.toggle('hidden', P.o2 >= 10); set('ox', P.o2, 10, 'Luft ' + Math.ceil(P.o2));
  const biome = BIOMES[(getChunk(Math.floor(P.x) >> 4, Math.floor(P.z) >> 4) || { bm: [0] }).bm[(Math.floor(P.z) & 15) * 16 + (Math.floor(P.x) & 15)] || 0];
  const hh = Math.floor(((G.t * 24 + 6) % 24)), mm = Math.floor((((G.t * 24 + 6) % 24) - hh) * 60);
  $('info').innerHTML = 'XYZ ' + P.x.toFixed(1) + ' ' + P.y.toFixed(1) + ' ' + P.z.toFixed(1) + '<br>' + biome + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + (W.rain ? ' · Regen' : '') + '<br>XP ' + G.xp + ' · Punkte ' + G.sp;
  const hd = ((-P.yaw % 6.2832) + 6.2832) % 6.2832; $('compass').textContent = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'][Math.round(hd / 0.7854) % 8] + ' ' + Math.round(hd * 57.3) + '°';
  $('savei').textContent = saveErr ? '⚠ Speichern fehlgeschlagen' : '';
  const dbg = $('dbg'); if (!dbg.classList.contains('hidden')) dbg.textContent = 'FPS ' + fps + '\nChunks ' + chunks.size + ' (Mesh ' + [...chunks.values()].filter((c) => c.mesh).length + ')\nMobs ' + mobs.length + '\nItems ' + ents.length + '\nMem ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'n/a') + '\nSeed ' + G.seedStr;
}

// ---------- Screens / Eingabe ----------
const SCREENS = ['menu', 'pause', 'inv', 'chest', 'dead', 'mapS'];
function hideAll() { for (const s of SCREENS) $(s).classList.add('hidden'); }
function show(s) { hideAll(); $(s).classList.remove('hidden'); }
function lock() { if (TEST) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
function pause() { if (state !== 'play') return; state = 'paused'; mouseL = mouseR = false; show('pause'); $('sRd').value = settings.rd; $('sFog').value = settings.fog; $('sFov').value = settings.fov; $('sSens').value = settings.sens; $('sVol').value = settings.vol; $('sCb').checked = settings.cb; $('sRm').checked = settings.rm; $('sCap').checked = settings.cap; }
function resume() { state = 'play'; hideAll(); lock(); }
function openInv() { state = 'inv'; selSlot = null; show('inv'); renderInv(); if (document.exitPointerLock) document.exitPointerLock(); }
function openMap() { state = 'map'; show('mapS'); drawBigMap(); if (document.exitPointerLock) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && state === 'play' && !TEST) pause(); });
addEventListener('blur', () => { if (state === 'play' && !TEST) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveGame(); } });
addEventListener('beforeunload', () => { saveGame(); });
addEventListener('keydown', (e) => {
  if (['INPUT'].includes(e.target.tagName) && e.target.type === 'text') return;
  if (e.code === 'F3') { e.preventDefault(); $('dbg').classList.toggle('hidden'); return; }
  if (state === 'inv' && (e.code === 'KeyE' || e.code === 'Escape')) { state = 'play'; hideAll(); lock(); saveGame(); return; }
  if (state === 'chest' && (e.code === 'KeyE' || e.code === 'Escape')) { closeChest(); return; }
  if (state === 'map' && (e.code === 'KeyM' || e.code === 'Escape')) { state = 'play'; hideAll(); lock(); return; }
  if (state !== 'play') { if (state === 'paused' && e.code === 'Escape') resume(); return; }
  if (e.code === 'Escape' && TEST) pause();
  if (e.code === 'KeyW' && !e.repeat) { const n = performance.now(); if (n - (P.lastW || 0) < 300) P.sprintKey = true; P.lastW = n; }
  keys[e.code] = true;
  if (e.code === 'KeyE') openInv(); else if (e.code === 'KeyM') openMap(); else if (e.code === 'KeyF' && !e.repeat) interact();
  else if (/^Digit[1-9]$/.test(e.code)) { hot = +e.code.slice(5) - 1; uiDirty = true; heldLabel(); }
  if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyW') P.sprintKey = false; });
addEventListener('mousemove', (e) => { if (state !== 'play' || (!TEST && document.pointerLockElement !== canvas)) return; P.yaw -= e.movementX * 0.0022 * settings.sens; P.pitch = clamp(P.pitch - e.movementY * 0.0022 * settings.sens, -1.55, 1.55); });
addEventListener('mousedown', (e) => { if (state !== 'play') return; ac() && AC.resume(); if (e.button === 0) { mouseL = true; } if (e.button === 2) mouseR = true; });
addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { if (state !== 'play') return; hot = (hot + (e.deltaY > 0 ? 1 : 8)) % 9; uiDirty = true; heldLabel(); });
canvas.addEventListener('click', () => { if (state === 'play' && !TEST && document.pointerLockElement !== canvas) lock(); });

// Menüs
$('bRes').onclick = resume; $('bSave').onclick = () => saveGame(true);
$('bQuit').onclick = async () => { await saveGame(); state = 'menu'; $('hud').classList.add('hidden'); initMenuWorld(); show('menu'); refreshMenu(); };
$('bFull').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ } };
const bind = (id, k, num) => { $(id).oninput = (e) => { settings[k] = num ? +e.target.value : e.target.checked; saveSettings(); document.body.classList.toggle('cb', settings.cb); }; };
bind('sRd', 'rd', 1); bind('sFog', 'fog', 1); bind('sFov', 'fov', 1); bind('sSens', 'sens', 1); bind('sVol', 'vol', 1); bind('sCb', 'cb'); bind('sRm', 'rm'); bind('sCap', 'cap');
document.body.classList.toggle('cb', settings.cb);
$('bResp').onclick = () => respawn(false); $('bTp').onclick = () => respawn(true);
async function refreshMenu() { let has = false; try { has = !!(await DB.get('meta')); } catch (e) { has = false; } $('bCont').disabled = !has; }
function resetState() {
  Object.assign(P, { hp: 20, hunger: 20, thirst: 20, stam: 100, o2: 10, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, spawn: null, deathPos: null, atk: 0, inv: 0, rcd: 0 });
  Object.assign(G, { t: 0.08, xp: 0, sp: 0, kills: 0, acts: 0, sk: { dmg: 0, stam: 0, craft: 0, luck: 0 }, bossSpawned: false });
  mobs = []; arrows = []; ents = []; parts = []; fuses = []; inv.fill(null); craftGrid.fill(null); chestData.clear(); activeChestKey = null; hot = 0; mapMem.clear(); found.clear(); W.rain = false; W.timer = 150;
}
function begin(isNew) {
  chunks.forEach(freeMesh);
  if (isNew) { const s = P, sp = findSpawn(); G.worldSpawn = sp; ensureAround(sp.x, sp.z); s.x = sp.x; s.z = sp.z; s.y = surfaceY(sp.x, sp.z) + 0.05; s.px = s.x; s.py = s.y; s.pz = s.z; s.fallMax = s.y; }
  else { ensureAround(P.x, P.z); P.fallMax = P.y; }
  state = 'play'; hideAll(); $('hud').classList.remove('hidden'); uiDirty = true; lock();
}
$('bNew').onclick = async () => {
  if (!$('bCont').disabled && !$('bNew').dataset.sure) { $('bNew').dataset.sure = 1; $('bNew').textContent = 'Sicher? Alter Spielstand wird gelöscht!'; $('bNew').classList.add('danger'); setTimeout(() => { delete $('bNew').dataset.sure; $('bNew').textContent = 'Neue Welt'; $('bNew').classList.remove('danger'); }, 3500); return; }
  delete $('bNew').dataset.sure; $('bNew').textContent = 'Neue Welt'; $('bNew').classList.remove('danger');
  const s = $('seed').value.trim(); G.seedStr = s || String(Math.floor(rnd() * 1e9));
  chunks.forEach(freeMesh); chunks.clear(); allEdits.clear(); dirtyEditKeys.clear(); resetState();
  SEED = (/^-?\d+$/.test(G.seedStr) ? parseInt(G.seedStr, 10) : fnv(G.seedStr)) | 0;
  try { await DB.clear(); } catch (e) { /* ignore */ }
  begin(true); addItem(104, 1); addItem(102, 3); saveGame();
};
$('bCont').onclick = async () => { chunks.forEach(freeMesh); resetState(); if (await loadGame()) begin(false); else note('Kein gültiger Spielstand'); };

// ---------- Menü-Panorama ----------
function initMenuWorld() {
  chunks.forEach(freeMesh); chunks.clear(); allEdits.clear(); dirtyEditKeys.clear(); SEED = 777; G.t = 0.14; W.rain = false;
  ensureAround(0.5, 0.5); menuY = surfaceY(0.5, 0.5) + 14; menuReady = true;
}
const SPLASH = ['Kein Creeper weit und breit!', 'Jetzt mit Rissen!', 'Gebaut ohne Engine!', 'Pixel für Pixel!', 'Überlebe die Nacht!', 'TNT ist dein Freund!', 'Vorsicht, Zombies!', 'Einmal tief graben!'];
$('splash').textContent = SPLASH[Math.floor(rnd() * SPLASH.length)];

// ---------- Hauptschleife ----------
let last = performance.now(), acc = 0, autoT = 0, flushT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  frames++; fpsT += dt; if (fpsT >= 1) { fps = frames; frames = 0; fpsT = 0; }
  if (state === 'menu') { if (menuReady) streamChunks(0.5, 0.5, 5, 8); }
  if (state !== 'menu') {
    if (state === 'play') { acc += dt; while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; } autoT += dt; }
    streamChunks(P.x, P.z, settings.rd, state === 'play' ? 7 : 3); remeshDirty();
    if (uiDirty) { renderHot(); uiDirty = false; }
    hudT -= dt; if (hudT <= 0) { hudT = 0.1; updateHUD(); }
    if (state === 'play') { mapT -= dt; if (mapT <= 0) { mapT = 0.4; updateMap(); } }
    if (autoT >= 60) { autoT = 0; saveGame(); }
    flushT -= dt; if (flushT <= 0) { flushT = 0.5; flushEdits(); }
  }
  render(acc * 60);
}
let mapT = 0;
requestAnimationFrame(frame);

// ---------- Start ----------
(async () => {
  const ok = await DB.open(); if (!ok) note('Speichern nicht verfügbar (IndexedDB)', 4000);
  refreshMenu();
  if (!TEST) initMenuWorld();
  if (TEST) { SEED = 1234; G.seedStr = '1234'; $('bCont').disabled = true; begin(true); addItem(104, 1); addItem(103, 1); addItem(8, 20); addItem(102, 3); }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

// Dev-Konsole
window.DEV = { P, G, W, inv, mobs: () => mobs, chunks, set: (s) => (state = s), get state() { return state; }, keys, spawnMob, explode, setBlock, getB, craft, RECIPES, addItem, saveGame, loadGame, unpack, DB, damagePlayer, interact, attack, respawn, step, countItem, placeBlock, setHot: (i) => { hot = i; uiDirty = true; }, press: (b) => { mouseL = b; } };
window.cmd = (s) => {
  const [c, ...a] = s.split(' ');
  if (c === 'time') G.t = +a[0]; else if (c === 'tp') { P.x = +a[0]; P.y = +a[1]; P.z = +a[2]; } else if (c === 'give') addItem(+a[0], +(a[1] || 1));
  else if (c === 'spawn') spawnMob(a[0], P.x + 3, P.y, P.z); else if (c === 'rain') W.rain = !W.rain; else if (c === 'heal') { P.hp = 20; P.hunger = 20; P.thirst = 20; } else if (c === 'xp') G.xp += +a[0];
  return 'ok';
};
