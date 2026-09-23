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
