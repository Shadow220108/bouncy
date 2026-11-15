const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const sp = (x, w = 22, h = 24) => ({ x, w, h });

const levels = [
  { wall: 820, spd: 1.2, bounce: 13.0, spikes: [sp(170)] },
  { wall: 850, spd: 1.4, bounce: 13.5, spikes: [sp(140), sp(230, 30, 32)] },
  { wall: 880, spd: 1.5, bounce: 14.0, pulse: 0.5, spikes: [sp(130, 18, 20), sp(180, 18, 20), sp(240, 44, 36)] },
  { wall: 900, spd: 1.8, bounce: 14.5, spikes: [sp(120, 40, 30), sp(190), sp(240, 18, 40), sp(285, 26, 26)] },
  { wall: 930, spd: 2.0, bounce: 15.0, pulse: 0.6, spikes: [sp(110, 30, 34), sp(165, 18, 20), sp(205, 50, 40), sp(275)] }
];

let lvl = 0;
let won = false;
let px = 340, py = 320, pvx = 0, pvy = 0;
let wx = 820, wspd = 1.2, wsquash = 0;
let grounded = true, bouncing = false, alive = true;
let jumpBuffer = 0, tick = 0;
let step = 0, noback = 0, shake = 0;
let parts = [];
const keys = {};

let actx = null;
function getAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}

function sfx(type, f1, f2, dur, vol = 0.2) {
  try {
    const a = getAudio();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, a.currentTime);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.linearRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  } catch (e) {}
}

function loadLevel(i) {
  lvl = i;
  const l = levels[lvl];
  px = 340;
  py = 320;
  pvx = 0;
  pvy = 0;
  grounded = true;
  bouncing = false;
  jumpBuffer = 0;
  alive = true;
  wx = l.wall;
  wspd = l.spd;
  wsquash = 0;
  noback = 0;
  parts = [];
}

function jump() {
  if (grounded || py >= 312) {
    pvy = -12.0;
    grounded = false;
    jumpBuffer = 0;
    sfx('triangle', 160, 440, 0.1);
  } else {
    jumpBuffer = 12;
  }
}

function handleJump() {
  if (won) {
    won = false;
    loadLevel(0);
  } else {
    jump();
  }
}

function die() {
  if (!alive) return;
  alive = false;
  shake = 9;
  sfx('sawtooth', 220, 40, 0.2, 0.3);
  parts = [
    { x: px, y: py - 22, vx: -3 + Math.random() * 6, vy: -5, head: true },
    { x: px, y: py - 14, vx: -4 + Math.random() * 8, vy: -4, len: 14 },
    { x: px, y: py - 8, vx: -4 + Math.random() * 8, vy: -3, len: 12 },
    { x: px, y: py - 8, vx: -4 + Math.random() * 8, vy: -3, len: 12 }
  ];
  setTimeout(() => { if (!won) loadLevel(lvl); }, 360);
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  keys[e.key] = true;

  const isJump = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' ||
                 e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' ||
                 e.keyCode === 32 || e.keyCode === 38 || e.keyCode === 87;

  if (isJump) {
    e.preventDefault();
    handleJump();
  }

  if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowLeft') {
    noback = 25;
    sfx('square', 80, 0, 0.08, 0.1);
  }

  if (e.code === 'KeyR' || e.key === 'r') loadLevel(lvl);
}, true);

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  keys[e.key] = false;
}, true);

canvas.addEventListener('pointerdown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 1000;
  if (x > 500) {
    keys.ArrowRight = true;
  } else {
    handleJump();
  }
});

window.addEventListener('pointerup', () => { keys.ArrowRight = false; });

function update() {
  if (shake > 0) shake *= 0.8;
  if (noback > 0) noback--;

  tick++;
  if (!won) wx -= wspd * (1 + (levels[lvl].pulse || 0) * Math.sin(tick * 0.06));
  wsquash *= 0.8;

  if (!alive || won) {
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      if (p.y > 320) { p.y = 320; p.vy *= -0.4; p.vx *= 0.6; }
    }
    return;
  }

  if (jumpBuffer > 0) jumpBuffer--;

  const wantsRun = keys.KeyD || keys.ArrowRight || keys.d || keys.D;
  if (wantsRun && !bouncing) {
    if (grounded) {
      step += 0.3;
      pvx = 4.4;
    } else {
      pvx = Math.min(pvx + 0.2, 3.5);
    }
  } else if (!bouncing) {
    pvx *= 0.75;
    if (Math.abs(pvx) < 0.1) pvx = 0;
  }

  pvy += 0.48;
  if (pvy > 14) pvy = 14;

  if (px + 10 >= wx && px <= wx + 55) {
    wsquash = 26;
    bouncing = true;
    pvx = -levels[lvl].bounce;
    pvy = -4;
    px = wx - 12;
    shake = 7;
    sfx('sine', 120, 620, 0.35, 0.35);
  }

  if (bouncing) {
    pvx = -levels[lvl].bounce;
  }

  px += pvx;
  py += pvy;

  if (py >= 320) {
    py = 320;
    pvy = 0;
    grounded = true;
    bouncing = false;
    if (jumpBuffer > 0) {
      jump();
    }
  }

  if (px <= 80) {
    sfx('sine', 300, 750, 0.2);
    if (lvl < levels.length - 1) {
      loadLevel(lvl + 1);
    } else {
      won = true;
    }
    return;
  }

  if (wx <= px - 6 || wx <= 110) {
    die();
    return;
  }

  for (const { x: sx, w, h } of levels[lvl].spikes) {
    if (px + 6 >= sx && px - 6 <= sx + w && py >= 320 - h) {
      const hw = w / 2;
      const mid = sx + hw;
      const sh = px <= mid ? ((px - sx) / hw) * h : ((sx + w - px) / hw) * h;
      if (py >= 320 - sh + 2) {
        die();
        break;
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, 1000, 400);

  ctx.save();
  if (shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(1000, 320);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(80, 320);
  ctx.lineTo(80, 255);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(80, 255);
  ctx.lineTo(58, 267);
  ctx.lineTo(80, 279);
  ctx.closePath();
  ctx.fill();

  for (const { x: sx, w, h } of levels[lvl].spikes) {
    ctx.beginPath();
    ctx.moveTo(sx, 320);
    ctx.lineTo(sx + w / 2, 320 - h);
    ctx.lineTo(sx + w, 320);
    ctx.closePath();
    ctx.fill();
  }

  const ww = 55 - wsquash;
  ctx.fillRect(wx + wsquash, 80, ww, 240);
  ctx.fillStyle = '#fff';
  ctx.fillRect(wx + wsquash + 8, 160, 7, 7);
  ctx.fillRect(wx + wsquash + 8, 190, 7, 7);
  ctx.fillStyle = '#000';

  if (alive && !won) {
    ctx.save();
    ctx.translate(0, py - 320);

    let hx = px;
    if (bouncing) hx -= 5;
    else if ((keys.KeyD || keys.ArrowRight || keys.d || keys.D) && grounded) hx += 3;

    if (noback > 0) {
      ctx.font = 'bold 15px monospace';
      ctx.fillText('?', hx - 4, 275);
    }

    ctx.beginPath();
    ctx.arc(hx, 285, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hx, 292);
    ctx.lineTo(px, 305);
    ctx.stroke();

    if (bouncing) {
      const f = performance.now() * 0.03;
      ctx.beginPath();
      ctx.moveTo(px, 305);
      ctx.lineTo(px + 7 + Math.sin(f) * 8, 316);
      ctx.moveTo(px, 305);
      ctx.lineTo(px - 8 + Math.cos(f) * 8, 314);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx + 10, 285 + Math.sin(f) * 5);
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx - 10, 287 + Math.cos(f) * 5);
      ctx.stroke();
    } else if (!grounded) {
      ctx.beginPath();
      ctx.moveTo(px, 305);
      ctx.lineTo(px - 5, 315);
      ctx.moveTo(px, 305);
      ctx.lineTo(px + 6, 316);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx - 8, 285);
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx + 8, 285);
      ctx.stroke();
    } else if (keys.KeyD || keys.ArrowRight || keys.d || keys.D) {
      const o1 = Math.sin(step) * 12;
      const o2 = Math.sin(step + Math.PI) * 12;
      ctx.beginPath();
      ctx.moveTo(px, 305);
      ctx.lineTo(px + o1, 320);
      ctx.moveTo(px, 305);
      ctx.lineTo(px + o2, 320);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx - o1 * 0.8, 302);
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx + o1 * 0.8, 302);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(px, 305);
      ctx.lineTo(px - 4, 320);
      ctx.moveTo(px, 305);
      ctx.lineTo(px + 4, 320);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx - 5, 305);
      ctx.moveTo(hx, 295);
      ctx.lineTo(hx + 5, 305);
      ctx.stroke();
    }

    ctx.restore();
  }

  for (const p of parts) {
    if (p.head) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x - p.len / 2, p.y);
      ctx.lineTo(p.x + p.len / 2, p.y);
      ctx.stroke();
    }
  }

  if (won) {
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN', 500, 160);
    ctx.font = '14px monospace';
    ctx.fillText('[ space to restart ]', 500, 195);
  } else {
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText((lvl + 1) + '/5', 20, 30);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loadLevel(0);
requestAnimationFrame(loop);
