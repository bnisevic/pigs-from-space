(() => {
'use strict';

/* ============================================================
   PIGS FROM SPACE
   Arkadna pucačina u stilu Space Invaders. Svemirske svinje
   napadaju farmu, a ti ih braniš iz raketa. Sve je nacrtano
   programski (piksel-mape), zvuk je sintetizovan (Web Audio),
   pa nema nikakvih spoljnih fajlova.
   ============================================================ */

// ---------- Konstante ----------
const W = 480, H = 640, SCALE = 3;
const HUD_H = 36;
const COLS = 8, COL_GAP = 12, ROW_GAP = 12;
const PLAYER_Y = 566;
const GROUND_Y = 604;
const BAR_CELL = 6, BAR_COLS = 10, BAR_ROWS = 6, BAR_Y = 488;
const BAR_W = BAR_CELL * BAR_COLS, BAR_H = BAR_CELL * BAR_ROWS;
const INVADE_Y = PLAYER_Y - 2;
const FONT = '"Press Start 2P", monospace';

// ---------- Palete boja ----------
const PAL = {
  pink:  { P: '#ff9ec4', D: '#e2739c', K: '#2a1a24' },
  boar:  { P: '#b07040', D: '#7a4a22', K: '#1e1208' },
  alien: { P: '#8ef06a', D: '#4fae35', K: '#0f2a0a' },
  ship:  { C: '#62d6ff', Y: '#ffe25a', W: '#ffffff' },
  ufo:   { P: '#ff9ec4', D: '#e2739c', K: '#2a1a24', G: '#9aa7ff', S: '#5b6cff', Y: '#ffe25a' },
  mud:   { B: '#7a4a1e', L: '#a2683a' },
  hay:   { H: '#e8c547', S: '#c9a437' },
};

// ---------- Sprajtovi (piksel-mape, '.' = providno) ----------
const PIG_A = [
  '..P......P..',
  '.PP......PP.',
  '.PPPPPPPPPP.',
  'PPPPPPPPPPPP',
  'PPKPPPPPPKPP',
  'PPPPPPPPPPPP',
  'PPPDDDDDDPPP',
  'PPPDKDDKDPPP',
  'PPPDDDDDDPPP',
  '.PPPPPPPPPP.',
  '..PP.PP.PP..',
];
const PIG_B = [
  '..P......P..',
  '.PP......PP.',
  '.PPPPPPPPPP.',
  'PPPPPPPPPPPP',
  'PPPKPPPPKPPP',
  'PPPPPPPPPPPP',
  'PPPDDDDDDPPP',
  'PPPDKDDKDPPP',
  'PPPDDDDDDPPP',
  '.PPPPPPPPPP.',
  '.PP..PP..PP.',
];
const SHIP = [
  '......Y......',
  '.....YYY.....',
  '.....CCC.....',
  '....CCWCC....',
  '..C.CCWCC.C..',
  '.CC.CCCCC.CC.',
  'CCCCCCCCCCCCC',
  'CCCCCCCCCCCCC',
  '.CC..CCC..CC.',
];
const UFO_A = [
  '.......P....P.......',
  '........PPPP........',
  '.......PPPPPP.......',
  '.......PKPPKP.......',
  '.......PDDDDP.......',
  '......GGGGGGGG......',
  '....GGGGGGGGGGGG....',
  '..GGGGGGGGGGGGGGGG..',
  'SSSYSSSYSSSSYSSSYSSS',
  '..SSSSSSSSSSSSSSSS..',
  '.....SS......SS.....',
];
const UFO_B = UFO_A.slice();
UFO_B[8] = 'SSYSSSYSSSYSSSYSSSSS';
const MUD = [
  '.BB.',
  'BBLB',
  'BBBB',
  '.BB.',
];
const BAR_SHAPE = [
  '..HHHHHH..',
  '.HHHHHHHH.',
  'HHHHHHHHHH',
  'HHHHHHHHHH',
  'HHH....HHH',
  'HHH....HHH',
];

function makeSprite(rows, pal, scale, flash) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = flash ? '#ffffff' : pal[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

const PIG_TYPES = {
  pink:  { pal: PAL.pink,  hp: 1, pts: 10 },
  boar:  { pal: PAL.boar,  hp: 2, pts: 20 },
  alien: { pal: PAL.alien, hp: 3, pts: 30 },
};
const SPR = {};
for (const [name, t] of Object.entries(PIG_TYPES)) {
  SPR[name] = [makeSprite(PIG_A, t.pal, SCALE), makeSprite(PIG_B, t.pal, SCALE)];
  SPR[name + '_flash'] = makeSprite(PIG_A, t.pal, SCALE, true);
}
SPR.ship = makeSprite(SHIP, PAL.ship, SCALE);
SPR.shipSmall = makeSprite(SHIP, PAL.ship, 2);
SPR.ufo = [makeSprite(UFO_A, PAL.ufo, SCALE), makeSprite(UFO_B, PAL.ufo, SCALE)];
SPR.mud = makeSprite(MUD, PAL.mud, SCALE);
SPR.bigPig = [makeSprite(PIG_A, PAL.pink, 8), makeSprite(PIG_B, PAL.pink, 8)];

const PIG_W = SPR.pink[0].width, PIG_H = SPR.pink[0].height;
const SHIP_W = SPR.ship.width, SHIP_H = SPR.ship.height;
const UFO_W = SPR.ufo[0].width, UFO_H = SPR.ufo[0].height;
const MUD_W = SPR.mud.width, MUD_H = SPR.mud.height;
const FORM_W = COLS * PIG_W + (COLS - 1) * COL_GAP;

// ---------- Canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;

// ---------- Zvuk (sintetizovan, bez fajlova) ----------
const Sound = {
  ctx: null, muted: false,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(type, f0, f1, dur, vol, delay = 0, lp = 0) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, lp = 1000, delay = 0) {
    const c = this.ctx; if (!c || this.muted) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination);
    s.start(c.currentTime + delay);
  },
  shoot()     { this.tone('square', 900, 250, 0.1, 0.08); },
  hit()       { this.tone('square', 160, 90, 0.08, 0.12); },
  explode()   { this.noise(0.25, 0.25, 1400); this.tone('triangle', 130, 40, 0.25, 0.2); },
  oink()      { this.tone('sawtooth', 230, 420, 0.06, 0.14, 0, 900); this.tone('sawtooth', 400, 150, 0.13, 0.14, 0.06, 900); },
  playerDie() { this.noise(0.6, 0.3, 700); this.tone('square', 420, 50, 0.6, 0.15); },
  ufoBeep(up) { if (up) this.tone('sine', 480, 760, 0.12, 0.05); else this.tone('sine', 760, 480, 0.12, 0.05); },
  ufoHit()    { this.noise(0.3, 0.2, 2500); [880, 1109, 1319, 1760].forEach((f, i) => this.tone('square', f, f, 0.08, 0.08, i * 0.06)); },
  waveClear() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('square', f, f, 0.15, 0.1, i * 0.1)); },
  extraLife() { [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.12, i * 0.07)); },
  gameOver()  { [392, 330, 262, 196, 131].forEach((f, i) => this.tone('sawtooth', f, f * 0.9, 0.3, 0.12, i * 0.25, 1200)); },
};

// ---------- Stanje igre ----------
let state = 'title';   // title | banner | playing | paused | dying | gameover
let score = 0, lives = 3, wave = 0, nextLife = 10000;
let hi = 0, hiAtStart = 0;
try { hi = Number(localStorage.getItem('pfs_hi')) || 0; } catch (e) {}
let player, bullets = [], mud = [], pigs = [], form, ufo = null, barriers = [];
let particles = [], texts = [], stars = [];
let shootTimer = 0, ufoTimer = 15, stateTimer = 0, animTimer = 0, animFrame = 0;
let shake = 0, time = 0, banner = null, bannerNext = null, gameOverReason = '';

for (let i = 0; i < 90; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() < 0.2 ? 2 : 1, v: 8 + Math.random() * 30, a: 0.3 + Math.random() * 0.7 });
}

// ---------- Pomoćne funkcije ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = n => String(n).padStart(6, '0');

function pigRect(p) {
  return { x: form.x + p.c * (PIG_W + COL_GAP), y: form.y + p.r * (PIG_H + ROW_GAP), w: PIG_W, h: PIG_H };
}
function formBounds() {
  let minC = Infinity, maxC = -Infinity, maxR = -Infinity;
  for (const p of pigs) if (p.alive) {
    if (p.c < minC) minC = p.c;
    if (p.c > maxC) maxC = p.c;
    if (p.r > maxR) maxR = p.r;
  }
  return {
    left: form.x + minC * (PIG_W + COL_GAP),
    right: form.x + maxC * (PIG_W + COL_GAP) + PIG_W,
    bottom: form.y + maxR * (PIG_H + ROW_GAP) + PIG_H,
  };
}
function lowestPigs() {
  const byCol = [];
  for (const p of pigs) if (p.alive && (!byCol[p.c] || p.r > byCol[p.c].r)) byCol[p.c] = p;
  return byCol.filter(Boolean);
}
function burst(x, y, colors, n = 14, speed = 140) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
    const life = 0.4 + Math.random() * 0.5;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, c: colors[Math.floor(Math.random() * colors.length)], s: 2 + Math.floor(Math.random() * 3) });
  }
}
function showBanner(text, sub, dur, next) {
  state = 'banner';
  banner = { text, sub, t: dur };
  bannerNext = next;
}
function saveHi() { try { localStorage.setItem('pfs_hi', String(hi)); } catch (e) {} }
function addScore(n) {
  score += n;
  if (score >= nextLife) {
    nextLife += 10000; lives++;
    Sound.extraLife();
    texts.push({ x: W / 2, y: PLAYER_Y - 40, text: 'ДОДАТНИ ЖИВОТ!', life: 1.6, color: '#8ef06a' });
  }
  if (score > hi) hi = score;
}

// ---------- Barijere (bale sena) ----------
function buildBarriers() {
  barriers = [];
  for (let i = 1; i <= 4; i++) {
    const cells = BAR_SHAPE.map(row => row.split('').map(ch => ch === 'H' ? 1 : 0));
    barriers.push({ x: Math.round(W * i / 5 - BAR_W / 2), y: BAR_Y, cells });
  }
}
function cellRange(b, rect) {
  return {
    x0: clamp(Math.floor((rect.x - b.x) / BAR_CELL), 0, BAR_COLS - 1),
    x1: clamp(Math.floor((rect.x + rect.w - 1 - b.x) / BAR_CELL), 0, BAR_COLS - 1),
    y0: clamp(Math.floor((rect.y - b.y) / BAR_CELL), 0, BAR_ROWS - 1),
    y1: clamp(Math.floor((rect.y + rect.h - 1 - b.y) / BAR_CELL), 0, BAR_ROWS - 1),
  };
}
// Projektil udara u barijeru: nadji prvu punu celiju u smeru kretanja i raznesi je
function hitBarrier(rect, fromBelow) {
  for (const b of barriers) {
    if (!overlap(rect, { x: b.x, y: b.y, w: BAR_W, h: BAR_H })) continue;
    const { x0, x1, y0, y1 } = cellRange(b, rect);
    const ys = [];
    for (let y = y0; y <= y1; y++) ys.push(y);
    if (fromBelow) ys.reverse();
    for (const y of ys) for (let x = x0; x <= x1; x++) {
      if (b.cells[y][x]) { blast(b, x, y); return true; }
    }
  }
  return false;
}
function blast(b, cx, cy) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= BAR_COLS || y >= BAR_ROWS) continue;
    if ((dx === 0 && dy === 0) || Math.random() < 0.55) b.cells[y][x] = 0;
  }
  burst(b.x + cx * BAR_CELL + 3, b.y + cy * BAR_CELL + 3, [PAL.hay.H, PAL.hay.S], 5, 70);
}
// Svinje jedu seno kroz koje prolaze
function eatBarrier(rect) {
  for (const b of barriers) {
    if (!overlap(rect, { x: b.x, y: b.y, w: BAR_W, h: BAR_H })) continue;
    const { x0, x1, y0, y1 } = cellRange(b, rect);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b.cells[y][x] = 0;
  }
}

// ---------- Tok igre ----------
function startGame() {
  score = 0; lives = 3; wave = 0; nextLife = 10000; hiAtStart = hi;
  player = { x: (W - SHIP_W) / 2, y: PLAYER_Y, w: SHIP_W, h: SHIP_H, cool: 0, invuln: 0 };
  particles = []; texts = []; ufo = null; ufoTimer = 15; shake = 0;
  nextWave();
}
function nextWave() {
  wave++;
  bullets = []; mud = []; ufo = null; pigs = [];
  const rows = Math.min(3 + Math.floor((wave - 1) / 2), 5);
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
    let type = 'pink';
    if (r === 0) type = wave >= 4 ? 'alien' : wave >= 2 ? 'boar' : 'pink';
    else if (r === 1) type = wave >= 3 ? 'boar' : 'pink';
    pigs.push({ r, c, type, hp: PIG_TYPES[type].hp, alive: true, flash: 0 });
  }
  form = { x: (W - FORM_W) / 2, y: HUD_H + 28 + Math.min(wave - 1, 6) * 8, dir: 1, base: 26 + wave * 7 };
  buildBarriers();
  shootTimer = 1.2; animTimer = 0; animFrame = 0;
  showBanner('ТАЛАС ' + wave, wave === 1 ? 'СВИЊЕ ДОЛАЗЕ!' : 'ЕВО ИХ ОПЕТ!', 1.8, null);
}
function waveCleared() {
  const bonus = wave * 100;
  addScore(bonus);
  saveHi();
  Sound.waveClear();
  showBanner('ТАЛАС ОЧИШЋЕН!', '+' + bonus + ' БОНУС', 2.2, nextWave);
}
function damagePig(p, r) {
  p.hp--;
  if (p.hp > 0) { p.flash = 0.12; Sound.hit(); return; }
  p.alive = false;
  const t = PIG_TYPES[p.type];
  addScore(t.pts);
  burst(r.x + r.w / 2, r.y + r.h / 2, [t.pal.P, t.pal.D, '#ffffff'], 16, 150);
  Sound.explode();
}
function killUfo() {
  const pts = [100, 150, 200, 300][Math.floor(Math.random() * 4)];
  addScore(pts);
  texts.push({ x: ufo.x + ufo.w / 2, y: ufo.y + 10, text: String(pts), life: 1.2, color: '#ffe25a' });
  burst(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, ['#ff9ec4', '#9aa7ff', '#5b6cff', '#ffe25a'], 26, 180);
  Sound.ufoHit();
  ufo = null; ufoTimer = 16 + Math.random() * 10;
}
function killPlayer() {
  burst(player.x + player.w / 2, player.y + player.h / 2, ['#62d6ff', '#ffe25a', '#ff7b2e', '#ffffff'], 30, 200);
  Sound.playerDie();
  shake = 1; mud = [];
  state = 'dying'; stateTimer = 1.3;
}
function afterDeath() {
  lives--;
  if (lives <= 0) { gameOver(false); return; }
  player.x = (W - SHIP_W) / 2; player.invuln = 2.5;
  state = 'playing';
}
function gameOver(invaded) {
  state = 'gameover'; stateTimer = 1.2;
  gameOverReason = invaded ? 'СВИЊЕ СУ СЛЕТЕЛЕ!' : 'ФАРМА ЈЕ ИЗГУБЉЕНА!';
  saveHi(); Sound.gameOver();
}

// ---------- Ažuriranje ----------
function updatePlaying(dt) {
  // igrač
  player.cool -= dt;
  player.invuln = Math.max(0, player.invuln - dt);
  const left = keys.ArrowLeft || keys.KeyA || touch.left;
  const right = keys.ArrowRight || keys.KeyD || touch.right;
  if (left) player.x -= 280 * dt;
  if (right) player.x += 280 * dt;
  player.x = clamp(player.x, 4, W - player.w - 4);
  const fire = keys.Space || keys.ArrowUp || keys.KeyW || touch.fire;
  if (fire && player.cool <= 0 && bullets.length < 2) {
    bullets.push({ x: player.x + player.w / 2 - 1.5, y: player.y - 8, w: 3, h: 12 });
    player.cool = 0.32;
    Sound.shoot();
  }

  // laseri
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= 560 * dt;
    if (b.y + b.h < HUD_H) { bullets.splice(i, 1); continue; }
    if (hitBarrier(b, true)) { bullets.splice(i, 1); continue; }
    let hitPig = false;
    for (const p of pigs) {
      if (!p.alive) continue;
      const r = pigRect(p);
      if (overlap(b, r)) { damagePig(p, r); hitPig = true; break; }
    }
    if (hitPig) { bullets.splice(i, 1); continue; }
    if (ufo && overlap(b, ufo)) { bullets.splice(i, 1); killUfo(); continue; }
  }

  // formacija svinja
  const total = pigs.length;
  let alive = 0;
  for (const p of pigs) if (p.alive) alive++;
  if (alive === 0) { waveCleared(); return; }
  const mult = 1 + 2.6 * (1 - alive / total);
  const speed = Math.min(form.base * mult, 330);
  form.x += form.dir * speed * dt;
  const fb = formBounds();
  if (form.dir > 0 && fb.right > W - 8) { form.x -= fb.right - (W - 8); form.dir = -1; form.y += 12; }
  else if (form.dir < 0 && fb.left < 8) { form.x += 8 - fb.left; form.dir = 1; form.y += 12; }
  animTimer += dt * mult;
  if (animTimer > 0.5) { animTimer = 0; animFrame ^= 1; }

  for (const p of pigs) {
    if (!p.alive) continue;
    p.flash = Math.max(0, p.flash - dt);
    const r = pigRect(p);
    if (r.y + r.h >= INVADE_Y) { gameOver(true); return; }
    eatBarrier(r);
    if (player.invuln <= 0 && overlap(r, player)) { killPlayer(); return; }
  }

  // svinje bacaju blato
  shootTimer -= dt;
  if (shootTimer <= 0) {
    shootTimer = Math.max(0.28, 1.3 - wave * 0.1) * (0.5 + Math.random());
    if (mud.length < Math.min(2 + wave, 8)) {
      const shooters = lowestPigs();
      const p = shooters[Math.floor(Math.random() * shooters.length)];
      const r = pigRect(p);
      mud.push({ x: r.x + r.w / 2 - MUD_W / 2, y: r.y + r.h - 6, w: MUD_W, h: MUD_H, vy: 170 + wave * 12, wob: Math.random() * 6.28 });
      Sound.oink();
    }
  }

  // blato
  for (let i = mud.length - 1; i >= 0; i--) {
    const m = mud[i];
    m.y += m.vy * dt; m.wob += dt * 12;
    if (m.y > GROUND_Y) { mud.splice(i, 1); continue; }
    if (hitBarrier(m, false)) { mud.splice(i, 1); continue; }
    if (player.invuln <= 0 && overlap(m, player)) { mud.splice(i, 1); killPlayer(); return; }
  }

  // NLO komandant
  if (ufo) {
    ufo.x += ufo.vx * dt;
    ufo.beep -= dt;
    if (ufo.beep <= 0) { ufo.beep = 0.24; ufo.up = !ufo.up; Sound.ufoBeep(ufo.up); }
    if (ufo.x > W + 10 || ufo.x + ufo.w < -10) { ufo = null; ufoTimer = 14 + Math.random() * 10; }
  } else {
    ufoTimer -= dt;
    if (ufoTimer <= 0 && alive > 3) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      ufo = { x: dir > 0 ? -UFO_W : W, y: HUD_H + 4, w: UFO_W, h: UFO_H, vx: dir * 95, beep: 0, up: false };
    }
  }
}

function update(dt) {
  time += dt;
  for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.y -= 28 * dt; t.life -= dt;
    if (t.life <= 0) texts.splice(i, 1);
  }
  shake = Math.max(0, shake - dt * 2.5);

  switch (state) {
    case 'title':
      animTimer += dt;
      if (animTimer > 0.5) { animTimer = 0; animFrame ^= 1; }
      break;
    case 'banner':
      banner.t -= dt;
      if (banner.t <= 0) { const n = bannerNext; bannerNext = null; state = 'playing'; if (n) n(); }
      break;
    case 'playing': updatePlaying(dt); break;
    case 'dying': stateTimer -= dt; if (stateTimer <= 0) afterDeath(); break;
    case 'gameover': stateTimer -= dt; break;
  }
}

// ---------- Crtanje ----------
function text(str, x, y, size, color, align = 'left') {
  ctx.font = size + 'px ' + FONT;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function dim(a) { ctx.fillStyle = 'rgba(5,6,15,' + a + ')'; ctx.fillRect(0, 0, W, H); }

function drawGame() {
  ctx.fillStyle = '#2f8f3a'; ctx.fillRect(0, GROUND_Y, W, 2);
  for (const b of barriers) {
    for (let y = 0; y < BAR_ROWS; y++) for (let x = 0; x < BAR_COLS; x++) {
      if (!b.cells[y][x]) continue;
      ctx.fillStyle = (x + y) % 2 ? PAL.hay.H : PAL.hay.S;
      ctx.fillRect(b.x + x * BAR_CELL, b.y + y * BAR_CELL, BAR_CELL, BAR_CELL);
    }
  }
  for (const p of pigs) {
    if (!p.alive) continue;
    const r = pigRect(p);
    const spr = p.flash > 0 ? SPR[p.type + '_flash'] : SPR[p.type][animFrame];
    ctx.drawImage(spr, Math.round(r.x), Math.round(r.y));
  }
  if (ufo) ctx.drawImage(SPR.ufo[Math.floor(time * 8) % 2], Math.round(ufo.x), ufo.y);
  for (const b of bullets) {
    ctx.fillStyle = '#ffe25a'; ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x) + 1, Math.round(b.y) + 2, 1, b.h - 4);
  }
  for (const m of mud) ctx.drawImage(SPR.mud, Math.round(m.x + Math.sin(m.wob) * 2), Math.round(m.y));
  if (state !== 'dying' && !(player.invuln > 0 && Math.floor(time * 16) % 2)) {
    const px = Math.round(player.x);
    ctx.drawImage(SPR.ship, px, player.y);
    const fh = 4 + Math.random() * 6;
    ctx.fillStyle = Math.random() < 0.5 ? '#ff7b2e' : '#ffd23f';
    ctx.fillRect(px + 15, player.y + player.h, 9, fh);
    ctx.fillStyle = '#ffe25a';
    ctx.fillRect(px + 18, player.y + player.h, 3, fh * 0.6);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
  }
  ctx.globalAlpha = 1;
  for (const t of texts) {
    ctx.globalAlpha = Math.min(1, t.life);
    text(t.text, t.x, t.y, 10, t.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#2a2f55'; ctx.fillRect(0, HUD_H - 2, W, 2);
  text('ПОЕНИ ' + pad(score), 12, 16, 10, '#ffffff', 'left');
  text('РЕКОРД ' + pad(hi), W / 2, 16, 10, '#ffe25a', 'center');
  text('ТАЛАС ' + wave, W - 12, 16, 10, '#8ef06a', 'right');
  for (let i = 0; i < Math.min(lives, 8); i++) ctx.drawImage(SPR.shipSmall, 12 + i * 32, GROUND_Y + 10);
  if (Sound.muted) text('БЕЗ ЗВУКА', W - 12, GROUND_Y + 19, 8, '#666', 'right');
}

function drawOverlay() {
  if (state === 'banner') {
    dim(0.35);
    text(banner.text, W / 2, H / 2 - 20, 22, '#ff9ec4', 'center');
    text(banner.sub, W / 2, H / 2 + 14, 10, '#ffffff', 'center');
  } else if (state === 'paused') {
    dim(0.6);
    text('ПАУЗА', W / 2, H / 2 - 10, 24, '#ffffff', 'center');
    text('ПРИТИСНИ P ЗА НАСТАВАК', W / 2, H / 2 + 24, 10, '#aaaaaa', 'center');
  } else if (state === 'gameover') {
    dim(0.65);
    text('КРАЈ ИГРЕ', W / 2, H / 2 - 60, 28, '#ff5a7a', 'center');
    text(gameOverReason, W / 2, H / 2 - 20, 10, '#ff9ec4', 'center');
    text('ПОЕНИ ' + pad(score), W / 2, H / 2 + 20, 12, '#ffffff', 'center');
    text(score > hiAtStart ? 'НОВИ РЕКОРД!' : 'РЕКОРД ' + pad(hi), W / 2, H / 2 + 46, 10, '#ffe25a', 'center');
    if (stateTimer <= 0 && Math.floor(time * 2) % 2) {
      text(isTouch ? 'ДОДИРНИ ЗА НОВУ ИГРУ' : 'ПРИТИСНИ РАЗМАК ЗА НОВУ ИГРУ', W / 2, H / 2 + 100, 10, '#ffffff', 'center');
    }
  }
}

function drawTitle() {
  const big = SPR.bigPig[animFrame];
  ctx.drawImage(big, (W - big.width) / 2, Math.round(110 + Math.sin(time * 2) * 8));
  text('СВИЊЕ', W / 2, 270, 48, '#ff9ec4', 'center');
  text('ИЗ СВЕМИРА', W / 2, 318, 22, '#62d6ff', 'center');
  const parade = ['pink', 'pink', 'boar', 'pink', 'alien', 'pink'];
  for (let i = 0; i < parade.length; i++) {
    const x = ((time * 40 + i * 80) % (W + 80)) - 40;
    ctx.drawImage(SPR[parade[i]][animFrame], Math.round(x), 360);
  }
  if (Math.floor(time * 2) % 2) text(isTouch ? 'ДОДИРНИ ЗА ПОЧЕТАК' : 'ПРИТИСНИ РАЗМАК ЗА ПОЧЕТАК', W / 2, 440, 12, '#ffffff', 'center');
  text('РЕКОРД ' + pad(hi), W / 2, 480, 10, '#ffe25a', 'center');
  text('СТРЕЛИЦЕ / A D   КРЕТАЊЕ', W / 2, 536, 8, '#7d84b0', 'center');
  text('РАЗМАК  ПУЦАЊЕ    P  ПАУЗА    M  ЗВУК', W / 2, 556, 8, '#7d84b0', 'center');
  text('ОДБРАНИ ФАРМУ ОД СВЕМИРСКИХ СВИЊА!', W / 2, 600, 8, '#8ef06a', 'center');
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 10);
  ctx.fillStyle = '#05060f'; ctx.fillRect(-20, -20, W + 40, H + 40);
  for (const s of stars) {
    ctx.globalAlpha = s.a; ctx.fillStyle = '#cdd6ff';
    ctx.fillRect(s.x | 0, s.y | 0, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  if (state === 'title') drawTitle(); else drawGame();
  drawParticles();
  ctx.restore();
  if (state !== 'title') { drawHUD(); drawOverlay(); }
}

// ---------- Ulaz ----------
const keys = Object.create(null);
const touch = { left: false, right: false, fire: false };
const GAME_KEYS = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

function onPress(code) {
  if (code === 'KeyM') { Sound.muted = !Sound.muted; return; }
  if (state === 'title') { if (code === 'Space' || code === 'Enter') startGame(); return; }
  if (state === 'gameover') { if ((code === 'Space' || code === 'Enter') && stateTimer <= 0) startGame(); return; }
  if (code === 'KeyP' || code === 'Escape') {
    if (state === 'playing') state = 'paused';
    else if (state === 'paused') state = 'playing';
  }
}

window.addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  Sound.init();
  onPress(e.code);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  touch.left = touch.right = touch.fire = false;
  if (state === 'playing') state = 'paused';
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') state = 'paused'; });

const isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
if (isTouch) document.body.classList.add('touch');
window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });

function bindBtn(id, key, pressCode) {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); Sound.init(); if (key) touch[key] = true; if (pressCode) onPress(pressCode); };
  const off = e => { e.preventDefault(); if (key) touch[key] = false; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindBtn('btn-left', 'left', null);
bindBtn('btn-right', 'right', null);
bindBtn('btn-fire', 'fire', 'Space');
bindBtn('btn-pause', null, 'KeyP');
canvas.addEventListener('pointerdown', () => {
  Sound.init();
  if (state === 'title' || state === 'gameover') onPress('Space');
  else if (state === 'paused') state = 'playing';
});

// ---------- Glavna petlja ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"', 'СВИЊЕ ИЗ СВЕМИРА ЋЂЉЊЈЏ ABC 0123').catch(() => {});
requestAnimationFrame(loop);
})();
