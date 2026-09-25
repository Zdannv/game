// 📮 Kotak Kita: surat & foto dua arah (Fall ⇄ Aidan), pintu masuk rahasia, dan pesan hari ini.
// Data disimpan di Supabase lewat fungsi kita_* yang butuh KUNCI RAHASIA (lihat supabase/kita.sql).
// Kunci dibawa sekali lewat link (?k=…), lalu disimpan di HP ini.
import { CONFIG } from './config.js';
import { getPlayer, setPlayer } from './streak.js';
import { sfx } from './audio.js';
import { esc } from './util.js';

const { url = '', anonKey = '' } = CONFIG.supabase || {};
const KEY_STORE = 'fq-kita-key';
const GATE_STORE = 'fq-gate-v2';
const NAME = { fall: 'Fall', aidan: 'Aidan' };
const other = (p) => (p === 'fall' ? 'aidan' : 'fall');

export const CATEGORIES = {
  kangen: 'Buka kalau lagi kangen',
  sedih: 'Buka kalau lagi sedih',
  marah: 'Buka kalau lagi kesel sama aku',
  tidur: 'Buka kalau nggak bisa tidur',
  senang: 'Buka kalau lagi seneng',
  semangat: 'Buka kalau butuh semangat',
};
const CAT_EMOJI = { kangen: '🥺', sedih: '🌧️', marah: '😤', tidur: '🌙', senang: '🌼', semangat: '💪' };

// ---------- Kunci rahasia ----------
(function takeKeyFromUrl() {
  const params = new URLSearchParams(location.search);
  const k = params.get('k');
  if (!k) return;
  try { localStorage.setItem(KEY_STORE, k); } catch {}
  params.delete('k');
  const q = params.toString();
  history.replaceState(null, '', location.pathname + (q ? `?${q}` : '') + location.hash);
})();
const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } };
export const kitaReady = () => Boolean(url && anonKey && getKey());

async function rpc(name, body) {
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: getKey(), ...body }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.includes('kunci salah') ? 'kunci' : `Supabase ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ---------- Pintu masuk rahasia ----------
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function setupGate() {
  const gate = CONFIG.gate;
  let ok = false;
  try { ok = localStorage.getItem(GATE_STORE) === '1' && Boolean(getPlayer()); } catch {}
  if (!gate?.people || ok) return Promise.resolve();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'gate';
    el.innerHTML = `
      <div class="gate-card">
        <div class="gate-lock">🔐</div>
        <h2>${esc(gate.title || 'Khusus buat kamu')}</h2>
        <p>${esc(gate.question)}</p>
        <form class="gate-form">
          <input type="date" required aria-label="Tanggal ulang tahun">
          <button class="btn" type="submit">Buka 💖</button>
        </form>
        <p class="gate-wrong" hidden>${esc(gate.wrong || 'Hmm, bukan itu 🤭 coba inget-inget lagi')}</p>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const who = gate.people[await sha256(el.querySelector('input').value)];
      if (who) {
        setPlayer(who); // dari ultahnya ketahuan siapa yang buka
        try { localStorage.setItem(GATE_STORE, '1'); } catch {}
        sfx('win');
        el.classList.add('open');
        setTimeout(() => { el.remove(); resolve(); }, 700);
      } else {
        sfx('bad');
        const w = el.querySelector('.gate-wrong');
        w.hidden = false;
        el.querySelector('.gate-card').classList.remove('shake');
        void el.offsetWidth;
        el.querySelector('.gate-card').classList.add('shake');
      }
    });
  });
}

// ---------- Pesan hari ini ----------
export function dailyMessage() {
  const list = CONFIG.daily || [];
  if (!list.length) return '';
  const day = Math.floor((Date.now() + 7 * 3600e3) / 864e5); // hari menurut WIB
  return list[day % list.length];
}

// ---------- Kecilin foto sebelum dikirim ----------
function shrink(file, max = 1100, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- Tampilan Kotak Kita ----------
let items = [];
const photoCache = new Map();
let panel = null;
let tab = 'surat';

const fmtTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export async function unreadCount() {
  const me = getPlayer();
  if (!kitaReady() || !me) return 0;
  try {
    items = await rpc('kita_list', {});
    return items.filter((i) => i.sender !== me && !i.opened_at).length;
  } catch { return 0; }
}

function toast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

export async function openKita() {
  sfx('click');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'kita';
    document.body.appendChild(panel);
    panel.addEventListener('click', onClick);
    panel.addEventListener('submit', onSubmit);
    panel.addEventListener('change', onChange);
  }
  panel.hidden = false;
  document.body.classList.add('kita-open');
  if (!getPlayer()) { renderWho(); return; }
  if (!kitaReady()) { renderNoKey(); return; }
  renderShell('<p class="kita-empty">Lagi ngambil kiriman… 💌</p>');
  try {
    items = await rpc('kita_list', {});
    render();
  } catch (err) {
    renderShell(`<p class="kita-empty">${err.message === 'kunci' ? 'Kuncinya nggak cocok 🥺 buka lagi link yang dikirim Aidan ya.' : 'Nggak bisa nyambung, cek internet terus coba lagi yaa 📶'}</p>`);
  }
}
function closeKita() {
  panel.hidden = true;
  document.body.classList.remove('kita-open');
  document.dispatchEvent(new CustomEvent('kita-closed'));
}

function renderShell(inner) {
  const me = getPlayer();
  panel.innerHTML = `
    <header class="kita-top">
      <button class="icon-btn" data-k="close" aria-label="Tutup">✖</button>
      <div><b>📮 Kotak Kita</b><small>${me ? `kamu masuk sebagai ${NAME[me]}` : ''}</small></div>
      <span></span>
    </header>
    <nav class="kita-tabs">
      ${[['surat', '💌 Surat'], ['foto', '📷 Foto'], ['kirim', '✍️ Kirim']].map(([id, label]) =>
        `<button class="${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
    </nav>
    <div class="kita-body">${inner}</div>`;
}

function renderWho() {
  panel.innerHTML = `
    <header class="kita-top"><button class="icon-btn" data-k="close">✖</button><div><b>📮 Kotak Kita</b></div><span></span></header>
    <div class="kita-body"><p class="kita-empty">Kamu siapa nih? 😆</p>
      <div class="kita-who"><button class="btn" data-who="fall">🦉 Aku Fall</button><button class="btn" data-who="aidan">🐱 Aku Aidan</button></div></div>`;
}
function renderNoKey(wrong = false) {
  panel.innerHTML = `
    <header class="kita-top"><button class="icon-btn" data-k="close">✖</button><div><b>📮 Kotak Kita</b></div><span></span></header>
    <div class="kita-body"><p class="kita-empty">Kotak ini dikunci 🔐<br>Buka link khusus dari Aidan sekali aja, atau tempel kuncinya di sini.</p>
      <form class="kirim" data-form="key">
        <label>Kunci<input name="key" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="tempel kuncinya di sini"></label>
        ${wrong ? '<p class="gate-wrong">Kuncinya nggak cocok 🥺 coba cek lagi yaa</p>' : ''}
        <button class="btn" type="submit">Buka kotak 💌</button>
      </form></div>`;
}
function render() {
  const me = getPlayer();
  const them = other(me);
  if (tab === 'surat') {
    const inbox = items.filter((i) => i.kind === 'surat' && i.sender === them);
    const sent = items.filter((i) => i.kind === 'surat' && i.sender === me);
    const bukaKalau = inbox.filter((i) => i.category);
    const biasa = inbox.filter((i) => !i.category);
    renderShell(`
      ${bukaKalau.length ? `<h3>Buka kalau… ✉️</h3><div class="envs">${bukaKalau.map(envelope).join('')}</div>` : ''}
      <h3>Dari ${NAME[them]} 💌</h3>
      ${biasa.length ? `<div class="envs">${biasa.map(envelope).join('')}</div>` : `<p class="kita-empty">Belum ada surat dari ${NAME[them]}. Kirimin duluan yuk 😝</p>`}
      ${sent.length ? `<h3>Surat kamu</h3><ul class="sent">${sent.map((i) => `
        <li><span>${i.category ? `${CAT_EMOJI[i.category]} ` : '💌 '}${esc(i.title || CATEGORIES[i.category] || (i.body || '').slice(0, 40))}</span>
        <small>${i.opened_at ? 'udah dibuka ✓' : 'belum dibuka'} · <button class="link-btn" data-del="${i.id}">hapus</button></small></li>`).join('')}</ul>` : ''}`);
  } else if (tab === 'foto') {
    const photos = items.filter((i) => i.kind === 'foto');
    renderShell(photos.length
      ? `<div class="photo-grid">${photos.map((i) => `
          <button class="ph ${i.sender === me ? 'mine' : ''}" data-photo="${i.id}">
            <span class="ph-img" data-img="${i.id}">📷</span>
            <small>${i.sender === me ? 'dari kamu' : `dari ${NAME[i.sender]}`}${!i.opened_at && i.sender !== me ? ' · baru ✨' : ''}</small>
          </button>`).join('')}</div>`
      : `<p class="kita-empty">Belum ada foto. Kirim foto makanan, foto kecil, atau apa aja yang lagi pengen kamu share 📸</p>`);
    loadThumbs(photos);
  } else {
    renderShell(`
      <form class="kirim" data-form="kirim">
        <div class="seg">
          <label><input type="radio" name="kind" value="surat" checked> 💌 Surat</label>
          <label><input type="radio" name="kind" value="foto"> 📷 Foto</label>
        </div>
        <div class="only-surat">
          <label>Jenis surat
            <select name="category">
              <option value="">Surat biasa</option>
              ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${CAT_EMOJI[k]} ${v}</option>`).join('')}
            </select>
          </label>
          <label>Judul (opsional)<input name="title" maxlength="120" placeholder="misal: buat kamu yang lagi capek"></label>
          <label>Isi surat<textarea name="body" rows="7" maxlength="5000" placeholder="Tulis apa aja buat ${NAME[them]}…"></textarea></label>
        </div>
        <div class="only-foto" hidden>
          <label class="pick-photo">📷 Pilih foto<input type="file" accept="image/*" name="photo"></label>
          <img class="photo-preview" alt="" hidden>
          <label>Keterangan (opsional)<input name="caption" maxlength="200" placeholder="misal: makan siang aku hari ini 🍜"></label>
        </div>
        <button class="btn" type="submit">Kirim ke ${NAME[them]} 💖</button>
      </form>`);
  }
}

function envelope(i) {
  const cat = i.category;
  return `<button class="env ${i.opened_at ? 'opened' : ''}" data-open="${i.id}">
    <span class="env-icon">${i.opened_at ? '💌' : '✉️'}</span>
    <span class="env-text"><b>${esc(cat ? CATEGORIES[cat] : (i.title || 'Surat buat kamu'))}</b>
      <small>${cat ? CAT_EMOJI[cat] + ' ' : ''}${fmtTime(i.created_at)}${i.opened_at ? '' : ' · belum dibuka'}</small></span>
  </button>`;
}

async function getPhoto(id) {
  if (!photoCache.has(id)) photoCache.set(id, rpc('kita_photo', { p_id: id }).catch(() => null));
  return photoCache.get(id);
}
async function loadThumbs(photos) {
  for (const p of photos) {
    const src = await getPhoto(p.id);
    const el = panel.querySelector(`[data-img="${p.id}"]`);
    if (el && src) { el.textContent = ''; el.style.backgroundImage = `url("${src}")`; }
  }
}

function showViewer(html) {
  const v = document.createElement('div');
  v.className = 'kita-viewer';
  v.innerHTML = `<div class="kita-viewer-card">${html}<button class="btn" data-k="close-viewer">Tutup</button></div>`;
  v.addEventListener('click', (e) => {
    if (e.target.closest('[data-del]')) { onClick(e); return; }
    if (e.target === v || e.target.closest('[data-k="close-viewer"]')) v.remove();
  });
  document.body.appendChild(v);
}

async function markOpened(item) {
  const me = getPlayer();
  if (item.sender === me || item.opened_at) return;
  item.opened_at = new Date().toISOString();
  rpc('kita_open', { p_id: item.id, p_reader: me }).catch(() => {});
}

async function onClick(e) {
  const t = e.target;
  if (t.closest('[data-k="close"]')) { closeKita(); return; }
  const who = t.closest('[data-who]');
  if (who) { setPlayer(who.dataset.who); openKita(); return; }
  const tb = t.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; sfx('click'); render(); return; }
  const op = t.closest('[data-open]');
  if (op) {
    const item = items.find((i) => i.id === Number(op.dataset.open));
    sfx('flip');
    showViewer(`<div class="kita-letter">
      ${item.category ? `<p class="kita-cat">${CAT_EMOJI[item.category]} ${esc(CATEGORIES[item.category])}</p>` : ''}
      ${item.title ? `<h3>${esc(item.title)}</h3>` : ''}
      <div class="kita-letter-body">${esc(item.body || '').replace(/\n/g, '<br>')}</div>
      <p class="kita-sign">— ${NAME[item.sender]} 💖<br><small>${fmtTime(item.created_at)}</small></p></div>`);
    markOpened(item);
    setTimeout(render, 300);
    return;
  }
  const ph = t.closest('[data-photo]');
  if (ph) {
    const item = items.find((i) => i.id === Number(ph.dataset.photo));
    const src = await getPhoto(item.id);
    showViewer(`<img class="kita-full" src="${src || ''}" alt="">
      ${item.body ? `<p class="kita-caption">${esc(item.body)}</p>` : ''}
      <p class="kita-sign"><small>dari ${NAME[item.sender]} · ${fmtTime(item.created_at)}</small></p>
      ${item.sender === getPlayer() ? `<button class="link-btn" data-del="${item.id}">hapus foto ini</button>` : ''}`);
    markOpened(item);
    return;
  }
  const del = t.closest('[data-del]');
  if (del && confirm('Hapus kiriman ini?')) {
    try {
      await rpc('kita_delete', { p_id: Number(del.dataset.del), p_sender: getPlayer() });
      document.querySelector('.kita-viewer')?.remove();
      items = items.filter((i) => i.id !== Number(del.dataset.del));
      render();
      toast('Dihapus');
    } catch { toast('Gagal hapus, coba lagi yaa'); }
  }
}

let pendingPhoto = '';
async function onChange(e) {
  const form = e.target.closest('form');
  if (!form) return;
  if (e.target.name === 'kind') {
    const foto = form.kind.value === 'foto';
    form.querySelector('.only-surat').hidden = foto;
    form.querySelector('.only-foto').hidden = !foto;
  }
  if (e.target.name === 'photo' && e.target.files?.[0]) {
    try {
      pendingPhoto = await shrink(e.target.files[0]);
      const img = form.querySelector('.photo-preview');
      img.src = pendingPhoto;
      img.hidden = false;
    } catch { toast('Fotonya nggak bisa dibaca, coba foto lain yaa'); }
  }
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === 'key') {
    const k = form.key.value.trim();
    if (!k) return;
    try { localStorage.setItem(KEY_STORE, k); } catch {}
    try {
      await rpc('kita_list', {}); // cek kuncinya bener
      openKita();
    } catch {
      try { localStorage.removeItem(KEY_STORE); } catch {}
      renderNoKey(true);
    }
    return;
  }
  const me = getPlayer();
  const kind = form.kind.value;
  const body = kind === 'surat' ? form.body.value.trim() : form.caption.value.trim();
  if (kind === 'surat' && !body) { toast('Isi suratnya dulu yaa ✍️'); return; }
  if (kind === 'foto' && !pendingPhoto) { toast('Pilih fotonya dulu yaa 📷'); return; }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Mengirim…';
  try {
    await rpc('kita_send', {
      p_sender: me, p_kind: kind,
      p_category: kind === 'surat' ? form.category.value : '',
      p_title: kind === 'surat' ? form.title.value.trim() : '',
      p_body: body, p_photo: kind === 'foto' ? pendingPhoto : '',
    });
    pendingPhoto = '';
    sfx('win');
    toast(`Terkirim ke ${NAME[other(me)]} 💖`);
    items = await rpc('kita_list', {});
    tab = kind === 'foto' ? 'foto' : 'surat';
    render();
  } catch {
    toast('Gagal ngirim, cek internet terus coba lagi 🥺');
    btn.disabled = false;
    btn.textContent = 'Kirim 💖';
  }
}
