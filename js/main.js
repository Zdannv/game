import { CONFIG } from './config.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import { confetti } from './confetti.js';
import { esc, pick } from './util.js';
import { startMemory } from './games/memory.js';
import { startCatch } from './games/catch.js';
import { startPop } from './games/pop.js';
import { startQuiz } from './games/quiz.js';

// ---------- Dunia & level ----------
const WORLDS = [
  { name: 'Taman Bunga', icon: '🌸', theme: 'w-flower', player: '🧺',
    memory: ['🌸', '🌷', '🌻', '🌼', '🍓', '🌺', '🦋', '🐞', '🌈', '🍀', '🐰', '🍄'],
    catchGood: ['🌸', '🌷', '💖'], popGood: ['🐰', '🐹'] },
  { name: 'Kota Permen', icon: '🍭', theme: 'w-candy', player: '🧺',
    memory: ['🍭', '🍬', '🧁', '🍩', '🍰', '🍪', '🍫', '🍦', '🍡', '🍮', '🎂', '🍒'],
    catchGood: ['🍬', '🍭', '🧁'], popGood: ['🐱', '🐶'] },
  { name: 'Pantai Cinta', icon: '🏖️', theme: 'w-beach', player: '🪣',
    memory: ['🐚', '🦀', '🐠', '🐬', '🌴', '🍉', '🍍', '🥥', '🐳', '⛱️', '🦩', '🐙'],
    catchGood: ['🐚', '🍉', '🐠'], popGood: ['🐧', '🦀'] },
  { name: 'Langit Bintang', icon: '🌙', theme: 'w-night', player: '🧺',
    memory: ['🌙', '⭐', '🪐', '☁️', '🦄', '🌠', '🔭', '🚀', '🌈', '💫', '🛸', '🎈'],
    catchGood: ['⭐', '🌙', '💫'], popGood: ['🦄', '🐻'] },
];

const PATTERN = ['memory', 'catch', 'pop', 'memory', 'catch', 'quiz'];
const TYPE_NAME = { memory: 'Kartu Kembar', catch: 'Tangkap Cinta', pop: 'Tap si Imut', quiz: 'Kuis Sayang' };
const TYPE_ICON = { memory: '🃏', catch: '🧺', pop: '👆', quiz: '💌' };
const STARTERS = { memory: startMemory, catch: startCatch, pop: startPop, quiz: startQuiz };

const LEVELS = [];
WORLDS.forEach((w, wi) => {
  PATTERN.forEach((type, k) => {
    const d = wi + (k >= 3 ? 0.5 : 0); // tingkat kesulitan 0 … 3.5
    let params;
    if (type === 'memory') {
      const pairs = [[3, 4], [4, 6], [6, 8], [8, 10]][wi][k >= 3 ? 1 : 0];
      params = { pairs, emojis: w.memory, time: Math.round(pairs * (7 - wi * 0.6) + 12) };
    } else if (type === 'catch') {
      params = {
        time: 30, lives: 3, target: Math.round(14 + d * 4),
        speed: 160 + d * 45, spawn: Math.max(0.36, 0.8 - d * 0.12), badRate: 0.15 + d * 0.05,
        good: w.catchGood, bad: ['💔', '🌶️'], gold: '💎', player: w.player,
      };
    } else if (type === 'pop') {
      params = {
        time: 30, cols: wi < 3 ? 3 : 4, rows: wi < 2 ? 3 : 4, target: Math.round(14 + d * 4),
        interval: Math.max(420, 900 - d * 130), stay: Math.max(650, 1300 - d * 170),
        badRate: 0.15 + d * 0.04, multi: d * 0.12, good: w.popGood, bad: ['🐝'], gold: '💖',
      };
    } else {
      params = { questions: CONFIG.quiz[wi] || [] };
    }
    LEVELS.push({ idx: LEVELS.length, world: wi, type, params });
  });
});
const MAX_STARS = LEVELS.length * 3;

function hintFor(L) {
  const p = L.params;
  switch (L.type) {
    case 'memory': return `Cari ${p.pairs} pasang kartu kembar dalam ${p.time} detik!`;
    case 'catch': return `Geser ${p.player} buat nangkep ${p.good.join('')}, hindari ${p.bad.join('')}! Target ${p.target}.`;
    case 'pop': return `Tap ${p.good.join('')} secepatnya (${p.gold} = +3), jangan tap ${p.bad[0]}! Target ${p.target}.`;
    default: return 'Jawab pertanyaan dari hatiku 💌 (minimal benar 2)';
  }
}

// ---------- Progres (disimpan di browser) ----------
const SAVE_KEY = 'falicya-quest-v1';
let progress = loadProgress();

function loadProgress() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.stars)) return s;
  } catch {}
  return { stars: [] };
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch {}
}
const starsOf = (i) => progress.stars[i] || 0;
const cleared = (i) => starsOf(i) > 0;
const unlocked = (i) => i === 0 || cleared(i - 1);
const allCleared = () => LEVELS.every((L) => cleared(L.idx));

// ---------- Layar ----------
const $ = (s) => document.querySelector(s);
const screens = { home: $('#screen-home'), map: $('#screen-map'), game: $('#screen-game'), letter: $('#screen-letter') };
const stageEl = $('#stage');
const modal = $('#modal');

function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
  if (name === 'map') renderMap();
  if (name === 'letter') renderLetter();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { sfx('click'); closeModal(); stopGame(); show(go.dataset.go); }
});

// ---------- Home ----------
document.querySelectorAll('.nm').forEach((el) => (el.textContent = CONFIG.name));
document.title = `${CONFIG.name}'s Love Quest 💖`;
$('#btn-play').addEventListener('click', () => { sfx('click'); show('map'); });
$('#btn-reset').addEventListener('click', () => {
  if (confirm('Yakin mau reset semua progress? Semua bintang bakal hilang 🥺')) {
    progress = { stars: [] };
    saveProgress();
    sfx('click');
  }
});

const soundBtn = $('#btn-sound');
const syncSound = () => (soundBtn.textContent = isMuted() ? '🔇' : '🔊');
syncSound();
soundBtn.addEventListener('click', () => { toggleMute(); syncSound(); sfx('click'); });

// ---------- Peta ----------
const worldsEl = $('#worlds');

function renderMap() {
  const total = progress.stars.reduce((a, b) => a + (b || 0), 0);
  $('#star-count').textContent = `${total}/${MAX_STARS}`;
  const nextIdx = LEVELS.findIndex((L) => !cleared(L.idx));

  worldsEl.innerHTML = WORLDS.map((w, wi) => {
    const lv = LEVELS.filter((L) => L.world === wi);
    const open = unlocked(lv[0].idx);
    const got = lv.reduce((a, L) => a + starsOf(L.idx), 0);
    return `
      <section class="world ${w.theme} ${open ? '' : 'locked'}">
        <header class="world-head">
          <span class="world-icon">${w.icon}</span>
          <div><small>Dunia ${wi + 1}</small><h2>${w.name}</h2></div>
          <span class="world-stars">⭐ ${got}/18</span>
        </header>
        <div class="levels">
          ${lv.map((L) => {
            const s = starsOf(L.idx);
            const ok = unlocked(L.idx);
            const cls = !ok ? 'locked' : L.idx === nextIdx ? 'current' : cleared(L.idx) ? 'done' : '';
            return `<button class="lvl ${cls}" data-i="${L.idx}" ${ok ? '' : 'disabled'} aria-label="Level ${L.idx + 1}">
              <span class="lvl-type">${ok ? TYPE_ICON[L.type] : '🔒'}</span>
              <span class="lvl-num">${L.idx + 1}</span>
              <span class="lvl-stars">${'★'.repeat(s)}<i>${'★'.repeat(3 - s)}</i></span>
            </button>`;
          }).join('')}
        </div>
      </section>`;
  }).join('') + `
    <button class="letter-btn ${allCleared() ? '' : 'locked'}" id="btn-letter" ${allCleared() ? '' : 'disabled'}>
      <span>💌</span>
      <div><b>Surat untuk ${esc(CONFIG.name)}</b><small>${allCleared() ? 'Udah bisa dibuka! Klik aku 🥰' : 'Selesaikan semua level buat buka'}</small></div>
    </button>`;

  const cur = worldsEl.querySelector('.lvl.current');
  if (cur) requestAnimationFrame(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }));
}

worldsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.lvl');
  if (b && !b.disabled) { sfx('click'); startLevel(+b.dataset.i); return; }
  if (e.target.closest('#btn-letter:not([disabled])')) { sfx('click'); show('letter'); }
});

// ---------- Main game ----------
let current = null; // { i, token, game }

function startLevel(i) {
  stopGame();
  closeModal();
  const L = LEVELS[i];
  show('game');
  screens.game.dataset.theme = WORLDS[L.world].theme;
  stageEl.innerHTML = '';
  $('#hud-title').textContent = `Level ${i + 1} · ${TYPE_NAME[L.type]}`;
  $('#hud-hint').textContent = hintFor(L);
  $('#hud-stats').textContent = '';

  const token = {};
  current = { i, token, game: null };
  const api = {
    setStats: (s) => { if (current?.token === token) $('#hud-stats').textContent = s; },
    sfx,
    finish: (r) => onFinish(token, r),
  };
  const begin = () => {
    if (current?.token !== token) return;
    current.game = STARTERS[L.type](stageEl, L.params, api);
  };
  if (L.type === 'quiz') begin();
  else countdown(token, begin);
}

function countdown(token, cb) {
  const el = document.createElement('div');
  el.className = 'countdown';
  stageEl.appendChild(el);
  let n = 3;
  const step = () => {
    if (current?.token !== token) { el.remove(); return; }
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
    if (n > 0) {
      el.textContent = n--;
      sfx('tick');
      setTimeout(step, 650);
    } else {
      el.textContent = 'Mulai! 💖';
      sfx('go');
      setTimeout(() => { el.remove(); cb(); }, 550);
    }
  };
  step();
}

function stopGame() {
  if (!current) return;
  current.game?.destroy();
  current = null;
}

$('#btn-quit').addEventListener('click', () => { sfx('click'); stopGame(); closeModal(); show('map'); });

const LOSE_LINES = [
  'Hampir! Coba sekali lagi ya sayang 🥺',
  'Nggak apa-apa, aidan tetep bangga sama Fall 💪',
  'Sedikit lagi! Aidan percaya Fall bisa 💕',
  'Kalah di game boleh, tapi di hati aidan Fall selalu juara 🏆',
];

function onFinish(token, r) {
  if (current?.token !== token) return;
  const i = current.i;
  if (r.win) {
    progress.stars[i] = Math.max(starsOf(i), r.stars);
    saveProgress();
    sfx('win');
    confetti();
  } else {
    sfx('lose');
  }
  setTimeout(() => {
    if (current?.token !== token) return;
    stopGame();
    showResult(i, r);
  }, 700);
}

function showResult(i, r) {
  const last = i === LEVELS.length - 1;
  const msg = CONFIG.messages[i] || pick(CONFIG.messages);
  const stars = [0, 1, 2].map((k) =>
    `<span class="star ${k < r.stars ? 'on' : ''}" style="animation-delay:${0.25 + k * 0.25}s">★</span>`).join('');

  modal.querySelector('.modal-card').innerHTML = r.win ? `
      <div class="modal-emoji bounce">${last ? '👑' : '🎉'}</div>
      <h2>Level ${i + 1} selesai!</h2>
      <div class="stars">${stars}</div>
      <p class="detail">${esc(r.detail)}</p>
      <div class="love-note"><span class="from">💌 dari ${esc(CONFIG.from)}</span>${esc(msg)}</div>
      <div class="modal-actions">
        <button class="btn ghost" data-go="map">🗺️ Peta</button>
        <button class="btn ghost" data-act="retry">🔁 Ulangi</button>
        ${last
          ?`<button class="btn" data-act="letter">Buka surat 💌</button>`
          : `<button class="btn" data-act="next">Lanjut ▶</button>`}
      </div>` : `
      <div class="modal-emoji wobble">🥺</div>
      <h2>Yahh, belum berhasil</h2>
      <p class="detail">${esc(r.detail)}</p>
      <div class="love-note">${esc(pick(LOSE_LINES))}</div>
      <div class="modal-actions">
        <button class="btn ghost" data-go="map">🗺️ Peta</button>
        <button class="btn" data-act="retry">Coba lagi 🔁</button>
      </div>`;

  modal.classList.remove('hidden');
  modal.dataset.level = i;
}

modal.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  sfx('click');
  const i = +modal.dataset.level;
  closeModal();
  if (act === 'retry') startLevel(i);
  else if (act === 'next') startLevel(i + 1);
  else if (act === 'letter') show('letter');
});

function closeModal() { modal.classList.add('hidden'); }

// ---------- Surat ----------
function renderLetter() {
  $('#letter-body').innerHTML = CONFIG.finalLetter
    .split(/\n\s*\n/)
    .map((para, k) => `<p style="animation-delay:${0.3 + k * 0.45}s">${esc(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
  $('#letter-from').textContent = CONFIG.from;
  setTimeout(() => { confetti(140); sfx('win'); }, 300);
}

// ---------- Hati melayang di background ----------
const bg = $('#bg-hearts');
const BG_EMOJI = ['💗', '💕', '🌸', '✨', '💖', '🤍'];
for (let i = 0; i < 16; i++) {
  const s = document.createElement('span');
  s.textContent = BG_EMOJI[i % BG_EMOJI.length];
  s.style.left = `${Math.random() * 100}%`;
  s.style.fontSize = `${14 + Math.random() * 18}px`;
  s.style.animationDuration = `${12 + Math.random() * 12}s`;
  s.style.animationDelay = `${-Math.random() * 20}s`;
  bg.appendChild(s);
}
