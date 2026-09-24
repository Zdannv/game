export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 1 bintang = capai target, 2 = 125%, 3 = 150%
export function starsFor(score, target) {
  if (score >= Math.ceil(target * 1.5)) return 3;
  if (score >= Math.ceil(target * 1.25)) return 2;
  return score >= target ? 1 : 0;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function floatText(parent, text, cls = '') {
  const el = document.createElement('span');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  parent.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

export function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const imageCache = new Map();
export function loadImage(src) {
  if (!src) return null;
  if (!imageCache.has(src)) {
    const img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return imageCache.get(src);
}

// Gambar muka bulat (foto) dengan bingkai putih. Kalau fotonya belum siap, pakai emoji cadangan.
export function drawFace(ctx, img, x, y, r, fallbackEmoji = '💖', ring = '#fff') {
  ctx.save();
  if (img && img.complete && img.naturalWidth) {
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.font = `${r * 2}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackEmoji, x, y);
  }
  ctx.restore();
}

// Siapkan canvas seukuran stage (tajam di layar HP)
export function setupCanvas(stage) {
  const canvas = document.createElement('canvas');
  canvas.className = 'catch-canvas';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const size = { W: 0, H: 0, k: 1 };
  const resize = () => {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size.W = r.width;
    size.H = r.height;
    canvas.width = Math.round(size.W * dpr);
    canvas.height = Math.round(size.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.k = Math.min(1.25, Math.max(0.8, size.H / 650));
  };
  resize();
  window.addEventListener('resize', resize);
  return { canvas, ctx, size, dispose: () => window.removeEventListener('resize', resize) };
}
