// Puzzle Foto: tap dua kepingan untuk menukar posisinya sampai fotonya utuh lagi.
import { shuffle } from '../util.js';

export function startPuzzle(stage, p, api) {
  const n = p.size;
  const total = n * n;

  // order[pos] = nomor kepingan yang sedang ada di posisi itu
  let order;
  do { order = shuffle([...Array(total).keys()]); } while (order.every((v, i) => v === i));

  const wrap = document.createElement('div');
  wrap.className = 'puzzle-wrap';
  wrap.style.setProperty('--ar', p.aspect);
  wrap.innerHTML = `
    <div class="puzzle-board" style="--n:${n}"><span class="puzzle-caption">${p.caption || ''}</span></div>
    <img class="puzzle-peek" src="${p.image}" alt="">
    <button class="btn ghost puzzle-peek-btn">👀 Intip foto</button>`;
  stage.appendChild(wrap);
  const board = wrap.querySelector('.puzzle-board');
  const peekImg = wrap.querySelector('.puzzle-peek');
  const peekBtn = wrap.querySelector('.puzzle-peek-btn');

  const tiles = [];
  for (let k = 0; k < total; k++) {
    const t = document.createElement('button');
    t.className = 'tile';
    const r = Math.floor(k / n), c = k % n;
    t.style.backgroundImage = `url("${p.image}")`;
    t.style.backgroundSize = `${n * 100}% ${n * 100}%`;
    t.style.backgroundPosition = `${(c / (n - 1)) * 100}% ${(r / (n - 1)) * 100}%`;
    t.dataset.piece = k;
    tiles.push(t);
  }

  let selected = -1, moves = 0, done = false, placedBefore = 0;

  const caption = board.querySelector('.puzzle-caption');
  function render() {
    board.replaceChildren(caption, ...order.map((piece, pos) => {
      const t = tiles[piece];
      t.dataset.pos = pos;
      t.classList.toggle('ok', piece === pos);
      t.classList.toggle('sel', pos === selected);
      return t;
    }));
  }

  board.addEventListener('click', (e) => {
    const t = e.target.closest('.tile');
    if (!t || done) return;
    const pos = +t.dataset.pos;
    if (selected === -1) {
      selected = pos;
      api.sfx('flip');
    } else if (selected === pos) {
      selected = -1;
    } else {
      [order[selected], order[pos]] = [order[pos], order[selected]];
      selected = -1;
      moves++;
      const placed = order.filter((v, i) => v === i).length;
      if (placed > placedBefore) {
        api.sfx('good');
        api.streak(true);
      } else {
        api.sfx('pop');
        api.streak(false);
      }
      placedBefore = placed;
      if (placed === total) win();
    }
    render();
    stats();
  });

  const togglePeek = (on) => { peekImg.classList.toggle('show', on); };
  peekBtn.addEventListener('pointerdown', () => togglePeek(true));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => peekBtn.addEventListener(ev, () => togglePeek(false)));

  const t0 = performance.now();
  let timeLeft = p.time;
  function stats() {
    const placed = order.filter((v, i) => v === i).length;
    api.setStats(`⏱ ${Math.ceil(timeLeft)}s · 🧩 ${placed}/${total} · 👆 ${moves}`);
  }
  const iv = setInterval(() => {
    timeLeft = Math.max(0, p.time - (performance.now() - t0) / 1000);
    stats();
    if (timeLeft <= 0) end(false);
  }, 200);

  function win() {
    done = true;
    clearInterval(iv);
    board.classList.add('solved');
    setTimeout(() => end(true), 1300);
  }

  function end(ok) {
    if (ok === false && done) return;
    done = true;
    clearInterval(iv);
    const stars = !ok ? 0 : moves <= total + 2 ? 3 : moves <= Math.ceil(total * 1.6) ? 2 : 1;
    api.finish({ win: ok, stars, detail: ok ? `Selesai dalam ${moves} tukaran` : 'Waktunya habis ⏰' });
  }

  render();
  stats();
  return { destroy() { done = true; clearInterval(iv); } };
}
