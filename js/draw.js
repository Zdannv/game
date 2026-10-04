// Gambar Udara: gambar pakai jari di depan kamera (deteksi tangan MediaPipe), coretannya live di HP pasangan.
// Telunjuk diangkat = gambar, jari dikepal / dua jari / dicubit = berhenti. Bisa juga gambar pakai sentuhan layar.
// Yang dikirim ke pasangan cuma titik-titik coretan (bukan video), lewat room Main Berdua.
import { on as onNet, send as sendNet, peer as peerNet, me as meNet } from './online.js';

const $ = (s) => document.querySelector(s);
const MP_VER = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const COLORS = ['#ff4f8b', '#8a5cff', '#22b8a7', '#ffb020', '#2b1b33', '#ffffff'];
const WORDS = ['kucing', 'rumah', 'matahari', 'bunga', 'hati', 'ikan', 'pohon', 'mobil', 'bintang', 'bulan', 'kue', 'payung',
  'pelangi', 'balon', 'es krim', 'kupu-kupu', 'gunung', 'apel', 'topi', 'kacamata', 'burung', 'kado', 'cincin', 'kopi',
  'pizza', 'awan', 'perahu', 'sepeda', 'kelinci', 'stetoskop', 'jam', 'gitar', 'bola', 'donat', 'semangka', 'pesawat'];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

export function initDraw({ sfx, toast, onClose }) {
  const screen = $('#screen-draw');
  const video = $('#draw-video');
  const canvas = $('#draw-canvas');
  const ctx = canvas.getContext('2d');
  const cursor = $('#draw-cursor');
  let color = COLORS[0], size = 6, sync = false, camOn = true, running = false;
  let stream = null, landmarker = null, raf = 0, lastDetect = 0;
  let pen = { down: false, id: 0, x: 0, y: 0, sx: null, sy: null };
  let outbox = [], flushT = 0;
  let secret = null; // kata rahasia (yang gambar doang yang tau)
  const strokes = []; // semua coretan (punya kita & pasangan), buat digambar ulang pas ukuran berubah

  // ---------- Kanvas ----------
  function fit() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function seg(s, a, b) {
    const r = canvas.getBoundingClientRect();
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a[0] * r.width, a[1] * r.height); ctx.lineTo(b[0] * r.width, b[1] * r.height); ctx.stroke();
  }
  function redraw() {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    for (const s of strokes) for (let i = 1; i < s.pts.length; i++) seg(s, s.pts[i - 1], s.pts[i]);
  }
  const findStroke = (key) => strokes.find((s) => s.key === key);
  function addPoint(key, c, w, p) {
    let s = findStroke(key);
    if (!s) { s = { key, c, w, pts: [] }; strokes.push(s); }
    s.pts.push(p);
    if (s.pts.length > 1) seg(s, s.pts[s.pts.length - 2], p);
  }
  function clearAll(local = true) {
    strokes.length = 0;
    redraw();
    if (local && sync) sendNet('draw-clear', {});
  }

  // ---------- Pena (dipakai tangan & sentuhan) ----------
  const myKey = () => `${meNet().id}-${pen.id}`;
  function penDown(x, y) {
    pen.down = true; pen.id++;
    addPoint(myKey(), color, size, [x, y]);
    queue([x, y], true);
  }
  function penMove(x, y) {
    if (!pen.down) return;
    const s = findStroke(myKey());
    const last = s?.pts[s.pts.length - 1];
    if (last && Math.hypot(last[0] - x, last[1] - y) < 0.004) return; // abaikan getaran kecil
    addPoint(myKey(), color, size, [x, y]);
    queue([x, y]);
  }
  function penUp() { pen.down = false; flush(); }
  function queue(p, start = false) {
    if (!sync) return;
    outbox.push({ k: pen.id, c: color, w: size, p: [+p[0].toFixed(4), +p[1].toFixed(4)], s: start ? 1 : 0 });
    if (!flushT) flushT = setTimeout(flush, 60); // kirim per ~60 ms biar hemat
  }
  function flush() {
    clearTimeout(flushT); flushT = 0;
    if (!outbox.length || !sync) { outbox = []; return; }
    sendNet('draw-pts', { pts: outbox });
    outbox = [];
  }
  onNet('draw-pts', (d) => {
    if (!sync) return;
    for (const q of d.pts || []) addPoint(`${d.from}-${q.k}`, q.c, q.w, q.p);
  });
  onNet('draw-clear', () => { if (sync) { strokes.length = 0; redraw(); toast(`${peerNet()?.name || 'Pasangan'} ngehapus kanvas 🧽`); } });

  // ---------- Sentuhan layar (cadangan kalau kamera nggak ada) ----------
  const rel = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); penDown(...rel(e)); });
  canvas.addEventListener('pointermove', (e) => { if (pen.down && !handActive) penMove(...rel(e)); });
  canvas.addEventListener('pointerup', () => { if (!handActive) penUp(); });
  canvas.addEventListener('pointercancel', () => { if (!handActive) penUp(); });

  // ---------- Kamera + deteksi tangan ----------
  let handActive = false;
  async function loadLandmarker() {
    if (landmarker) return landmarker;
    const { FilesetResolver, HandLandmarker } = await import(`${MP_URL}/vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1 });
    try { landmarker = await HandLandmarker.createFromOptions(files, opts('GPU')); }
    catch { landmarker = await HandLandmarker.createFromOptions(files, opts('CPU')); }
    return landmarker;
  }
  async function startCamera() {
    setStatus('Nyalain kamera…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      video.srcObject = stream;
      await video.play();
    } catch {
      setStatus('Kamera nggak bisa dibuka. Gambar pakai jari di layar aja yaa ✍️');
      return;
    }
    try {
      setStatus('Nyiapin deteksi tangan…');
      await loadLandmarker();
      setStatus('Angkat telunjuk buat gambar ☝️ · kepal / dua jari buat berhenti');
      loop();
    } catch {
      setStatus('Deteksi tangan gagal dimuat. Gambar pakai jari di layar aja yaa ✍️');
    }
  }
  function stopCamera() {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }
  function setStatus(t) { $('#draw-status').textContent = t; }

  // Telunjuk lurus & jari tengah ditekuk = gambar
  function gesture(lm) {
    const up = (tip, pip) => lm[tip].y < lm[pip].y - 0.02;
    const index = up(8, 6), middle = up(12, 10), ring = up(16, 14);
    const pinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.05;
    return index && !middle && !ring && !pinch;
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running || !landmarker || video.readyState < 2) return;
    const now = performance.now();
    if (now - lastDetect < 45) return; // ±20 kali per detik, biar HP nggak panas
    lastDetect = now;
    let res;
    try { res = landmarker.detectForVideo(video, now); } catch { return; }
    const lm = res?.landmarks?.[0];
    if (!lm) {
      handActive = false;
      cursor.hidden = true;
      if (pen.down) penUp();
      pen.sx = null;
      return;
    }
    handActive = true;
    // Kamera depan ditampilin kayak cermin → x dibalik
    let x = 1 - lm[8].x, y = lm[8].y;
    // Haluskan gerakan biar garisnya nggak goyang
    if (pen.sx == null) { pen.sx = x; pen.sy = y; }
    pen.sx += (x - pen.sx) * 0.55; pen.sy += (y - pen.sy) * 0.55;
    x = pen.sx; y = pen.sy;
    const drawing = gesture(lm);
    const r = canvas.getBoundingClientRect();
    cursor.hidden = false;
    cursor.style.transform = `translate(${x * r.width}px, ${y * r.height}px)`;
    cursor.classList.toggle('on', drawing);
    cursor.style.setProperty('--c', color);
    if (drawing && !pen.down) penDown(x, y);
    else if (drawing) penMove(x, y);
    else if (pen.down) penUp();
  }

  // ---------- Toolbar ----------
  $('#draw-colors').innerHTML = COLORS.map((c, i) => `<button type="button" class="draw-color ${i === 0 ? 'on' : ''}" data-color="${c}" style="--c:${c}" aria-label="Warna"></button>`).join('');
  $('#draw-colors').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    sfx('click');
    color = b.dataset.color;
    document.querySelectorAll('.draw-color').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#draw-size').addEventListener('input', (e) => { size = +e.target.value; });
  $('#draw-clear').addEventListener('click', () => { sfx('pop'); clearAll(); });
  $('#draw-cam').addEventListener('click', () => {
    sfx('click');
    camOn = !camOn;
    screen.classList.toggle('cam-off', !camOn);
    $('#draw-cam').textContent = camOn ? '🙈 Sembunyiin muka' : '📷 Tampilin muka';
  });
  $('#draw-save').addEventListener('click', savePhoto);

  // Simpan foto: muka (kalau kamera nyala) + coretan, jadi satu gambar
  async function savePhoto() {
    sfx('click');
    const r = canvas.getBoundingClientRect();
    const out = document.createElement('canvas');
    out.width = Math.round(r.width * 2); out.height = Math.round(r.height * 2);
    const o = out.getContext('2d');
    o.fillStyle = '#fff4f8'; o.fillRect(0, 0, out.width, out.height);
    if (camOn && video.videoWidth) {
      // sama kayak tampilan: video dipotong pas kotak (cover) & dicerminin
      const vr = video.videoWidth / video.videoHeight, cr = out.width / out.height;
      const sw = vr > cr ? video.videoHeight * cr : video.videoWidth, sh = vr > cr ? video.videoHeight : video.videoWidth / cr;
      o.save(); o.translate(out.width, 0); o.scale(-1, 1);
      o.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, out.width, out.height);
      o.restore();
    }
    o.drawImage(canvas, 0, 0, out.width, out.height);
    o.font = `600 ${Math.round(out.width * 0.035)}px Fredoka, sans-serif`;
    o.fillStyle = 'rgba(255,255,255,.85)';
    o.fillText('Gambar Udara 💞', out.width * 0.04, out.height - out.width * 0.04);
    const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
    const file = new File([blob], `gambar-udara-${Date.now()}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Gambar Udara' }); return; } catch {}
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Fotonya kesimpen 📸');
  }

  // ---------- Tebak gambar ----------
  const guessBox = $('#draw-guess');
  $('#draw-word').addEventListener('click', () => {
    if (!sync) { toast('Tebak gambar butuh pasangan yang lagi online 💞'); return; }
    sfx('pop');
    secret = WORDS[Math.floor(Math.random() * WORDS.length)];
    clearAll();
    $('#draw-secret').hidden = false;
    $('#draw-secret').innerHTML = `Gambar ini, jangan bilang-bilang 🤫 <b>${secret}</b>`;
    sendNet('draw-quiz', {});
  });
  onNet('draw-quiz', () => {
    if (!sync) return;
    secret = null;
    $('#draw-secret').hidden = true;
    guessBox.hidden = false;
    guessBox.querySelector('input').value = '';
    toast(`${peerNet()?.name || 'Pasangan'} lagi gambar sesuatu, tebak! 🤔`);
  });
  guessBox.addEventListener('submit', (e) => {
    e.preventDefault();
    const g = guessBox.querySelector('input').value.trim();
    if (!g) return;
    sendNet('draw-guess', { g });
    guessBox.querySelector('input').value = '';
  });
  onNet('draw-guess', (d) => {
    if (!sync || !secret) return;
    const ok = norm(d.g) === norm(secret);
    sendNet('draw-result', { ok, g: d.g, word: ok ? secret : '' });
    showResult(ok, d.g, secret, true);
    if (ok) secret = null;
  });
  onNet('draw-result', (d) => { if (sync) showResult(d.ok, d.g, d.word, false); });
  function showResult(ok, g, word, iDrew) {
    const who = peerNet()?.name || 'Pasangan';
    if (ok) {
      sfx('win');
      toast(iDrew ? `${who} bener! Jawabannya "${word}" 🎉` : `Bener! Jawabannya "${word}" 🎉`);
      $('#draw-secret').hidden = true;
      guessBox.hidden = true;
    } else {
      sfx('bad');
      toast(iDrew ? `${who} nebak "${g}"… salah 😆` : `"${g}" salah, coba lagi 🤭`);
    }
  }

  // ---------- Buka / tutup ----------
  window.addEventListener('resize', () => { if (running) fit(); });
  return {
    async open(withPartner) {
      sync = !!withPartner && !!peerNet();
      running = true;
      secret = null;
      $('#draw-secret').hidden = true;
      guessBox.hidden = true;
      $('#draw-who').textContent = sync ? `💞 Bareng ${peerNet().name}` : '✍️ Gambar Udara';
      $('#draw-word').hidden = !sync;
      requestAnimationFrame(fit);
      if (!stream) await startCamera();
      else loop();
    },
    close() {
      running = false;
      sync = false;
      penUp();
      stopCamera();
      onClose?.();
    },
  };
}
