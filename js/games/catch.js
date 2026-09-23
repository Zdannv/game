// Tangkap Cinta: geser keranjang untuk menangkap barang lucu, hindari 💔.
import { rand, pick, starsFor } from '../util.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function startCatch(stage, p, api) {
  const canvas = document.createElement('canvas');
  canvas.className = 'catch-canvas';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, k = 1;
  const player = { x: 0, tx: 0, size: 60, squash: 0 };

  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = Math.min(1.25, Math.max(0.8, H / 650));
    player.size = 64 * k;
  }
  resize();
  player.x = player.tx = W / 2;

  let items = [], floats = [];
  let score = 0, lives = p.lives, t = 0, spawnIn = 0.4, done = false, raf = 0;
  let last = performance.now(), shakeT = 0, hurtT = 0, lastStats = '';
  const keys = {};

  const onPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    player.tx = e.clientX - r.left;
  };
  const onKey = (e) => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
      keys[e.key] = e.type === 'keydown';
      e.preventDefault();
    }
  };
  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', onPointer);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('resize', resize);

  function spawn() {
    const r = Math.random();
    let kind = 'good', em = pick(p.good), pts = 1;
    if (r < p.badRate) { kind = 'bad'; em = pick(p.bad); }
    else if (r < p.badRate + 0.05) { kind = 'gold'; em = p.gold; pts = 5; }
    const size = rand(36, 46) * k;
    items.push({
      x: rand(size / 2 + 8, W - size / 2 - 8),
      y: -size,
      vy: (p.speed * rand(0.85, 1.2) + t * 2.5) * k * (kind === 'gold' ? 1.25 : 1),
      em, kind, pts, size,
      rot: rand(-0.4, 0.4), vr: rand(-2, 2), sway: rand(0, 6.28),
    });
  }

  function addFloat(x, y, text, color) {
    floats.push({ x, y, text, color, life: 1 });
  }

  function catchIt(it) {
    if (it.kind === 'bad') {
      lives--;
      shakeT = 0.35;
      hurtT = 0.6;
      api.sfx('bad');
      addFloat(it.x, it.y - 20, 'Aduh!', '#ff4d6d');
      if (lives <= 0) end(false, 'lives');
    } else {
      score += it.pts;
      player.squash = 1;
      api.sfx(it.kind === 'gold' ? 'gold' : 'good');
      addFloat(it.x, it.y - 20, `+${it.pts}`, it.kind === 'gold' ? '#e0a800' : '#ff5c93');
    }
  }

  function update(dt) {
    t += dt;
    const left = p.time - t;
    const dir = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    if (dir) player.tx = Math.max(0, Math.min(W, player.tx + dir * 560 * dt));
    player.x += (player.tx - player.x) * Math.min(1, dt * 14);
    player.x = Math.max(player.size / 2, Math.min(W - player.size / 2, player.x));

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = p.spawn * rand(0.7, 1.3) * (1 - 0.25 * (t / p.time));
    }

    const py = H - player.size * 0.9;
    for (const it of items) {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      it.sway += dt * 3;
      it.x += Math.sin(it.sway) * 12 * dt;
      if (!done && !it.gone && it.y > py - player.size * 0.5 && it.y < py + player.size * 0.25
          && Math.abs(it.x - player.x) < player.size * 0.62) {
        it.gone = true;
        catchIt(it);
      }
    }
    items = items.filter((it) => !it.gone && it.y < H + 60);
    for (const f of floats) { f.y -= 45 * dt; f.life -= dt * 1.2; }
    floats = floats.filter((f) => f.life > 0);
    player.squash = Math.max(0, player.squash - dt * 5);
    shakeT = Math.max(0, shakeT - dt);
    hurtT = Math.max(0, hurtT - dt);

    const s = `⏱ ${Math.max(0, Math.ceil(left))}s · 💖 ${score}/${p.target} · ${'❤️'.repeat(Math.max(0, lives))}${'🤍'.repeat(p.lives - Math.max(0, lives))}`;
    if (s !== lastStats) { api.setStats(s); lastStats = s; }
    if (left <= 0) end(score >= p.target, 'time');
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shakeT > 0) ctx.translate(rand(-8, 8) * shakeT * 2, rand(-5, 5) * shakeT * 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      if (it.kind === 'gold') { ctx.shadowColor = '#fff27a'; ctx.shadowBlur = 20; }
      ctx.font = `${it.size}px ${EMOJI_FONT}`;
      ctx.fillText(it.em, 0, 0);
      ctx.restore();
    }

    const py = H - player.size * 0.9;
    ctx.save();
    ctx.translate(player.x, py);
    ctx.fillStyle = 'rgba(120, 40, 90, .15)';
    ctx.beginPath();
    ctx.ellipse(0, player.size * 0.52, player.size * 0.45, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const sq = player.squash;
    ctx.scale(1 + sq * 0.15, 1 - sq * 0.12);
    if (hurtT > 0 && Math.floor(hurtT * 14) % 2) ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(255, 255, 255, .85)';
    ctx.strokeStyle = '#ff9cc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.size * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${player.size}px ${EMOJI_FONT}`;
    ctx.fillText(p.player, 0, 0);
    ctx.restore();

    ctx.font = `700 ${Math.round(24 * k)}px Fredoka, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fff';
    for (const f of floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!done) update(dt);
    draw();
  }
  raf = requestAnimationFrame(loop);

  function end(win, why) {
    if (done) return;
    done = true;
    const detail = win ? `Skor ${score} 💖`
      : why === 'lives' ? 'Kena 💔 terlalu banyak' : `Skor ${score}, butuh ${p.target}`;
    api.finish({ win, stars: win ? Math.max(1, starsFor(score, p.target)) : 0, detail });
  }

  return {
    destroy() {
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', resize);
    },
  };
}
