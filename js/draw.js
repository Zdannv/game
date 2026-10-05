// Gambar Udara: gambar pakai jari di depan kamera (deteksi tangan MediaPipe), coretannya live di HP pasangan.
// 1 jari (telunjuk) = gambar, buka telapak (5 jari) = hapus, kepal = berhenti. Bisa juga gambar pakai sentuhan layar.
// Yang dikirim ke pasangan: titik-titik coretan lewat room Main Berdua, plus muka Fall live ke HP Aidan (satu arah).
import { on as onNet, send as sendNet, peer as peerNet, me as meNet, inviteGame } from './online.js';
import { seeded } from './online-games.js';

const $ = (s) => document.querySelector(s);
const MP_VER = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const COLORS = ['#ff4f8b', '#8a5cff', '#22b8a7', '#ffb020', '#2b1b33', '#ffffff'];
const WORDS = ['kucing', 'rumah', 'matahari', 'bunga', 'hati', 'ikan', 'pohon', 'mobil', 'bintang', 'bulan', 'kue', 'payung',
  'pelangi', 'balon', 'es krim', 'kupu-kupu', 'gunung', 'apel', 'topi', 'kacamata', 'burung', 'kado', 'cincin', 'kopi',
  'pizza', 'awan', 'perahu', 'sepeda', 'kelinci', 'stetoskop', 'jam', 'gitar', 'bola', 'donat', 'semangka', 'pesawat',
  'rumah sakit', 'jarum suntik', 'boneka', 'kamera', 'lilin', 'pantai', 'kereta', 'sepatu', 'surat', 'mahkota', 'robot',
  'anjing', 'gajah', 'jerapah', 'singa', 'ular', 'pisang', 'wortel', 'roti', 'mie', 'piano', 'buku', 'pensil', 'televisi',
  'kasur', 'bantal', 'gelas', 'sendok', 'tenda', 'api unggun', 'roket', 'hantu', 'monyet', 'pinguin', 'panda', 'stroberi'];
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
  let eraserMode = false, touchDown = false, eraseOut = [], eraseT = 0;
  let game = null; // mode Tebak Gambar: { words, r, ok, drawer, left, timer }
  const iDraw = () => !game || game.drawer === meNet().role; // pas Tebak Gambar, yang nebak nggak boleh nyoret
  const canDraw = () => iDraw() && (!game || game.phase === 'draw'); // nggak bisa nyoret pas lagi milih kata
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

  // ---------- Penghapus sebagian: hapus coretan di sekitar jari/jari telunjuk, bukan semua ----------
  function eraseAt(x, y, broadcast = true) {
    const r = canvas.getBoundingClientRect();
    const rad = r.width * 0.09; // seukuran ujung jari
    let changed = false, n = 0;
    const next = [];
    for (const s of strokes) {
      let run = [];
      const push = () => { if (run.length > 1) next.push({ key: `${s.key}~${n++}`, c: s.c, w: s.w, pts: run }); };
      for (const p of s.pts) {
        const dx = (p[0] - x) * r.width, dy = (p[1] - y) * r.height;
        if (Math.hypot(dx, dy) <= rad) { changed = true; push(); run = []; }
        else run.push(p);
      }
      if (run.length === s.pts.length) next.push(s); // nggak kesentuh
      else push();
    }
    if (changed) { strokes.length = 0; strokes.push(...next); redraw(); }
    if (broadcast && sync) { eraseOut.push([+x.toFixed(4), +y.toFixed(4)]); if (!eraseT) eraseT = setTimeout(flushErase, 60); }
  }
  function flushErase() { clearTimeout(eraseT); eraseT = 0; if (eraseOut.length && sync) sendNet('draw-erase', { pts: eraseOut }); eraseOut = []; }
  onNet('draw-erase', (d) => { if (sync) for (const q of d.pts || []) eraseAt(q[0], q[1], false); });

  // ---------- Pena (dipakai tangan & sentuhan) ----------
  const myKey = () => `${meNet().id}-${pen.id}`;
  function penDown(x, y) {
    if (!iDraw()) return;
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
  canvas.addEventListener('pointerdown', (e) => { if (handActive) return; e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch {} touchDown = true; if (eraserMode) { if (canDraw()) eraseAt(...rel(e)); } else penDown(...rel(e)); });
  canvas.addEventListener('pointermove', (e) => { if (handActive || !touchDown) return; if (eraserMode) { if (canDraw()) eraseAt(...rel(e)); } else if (pen.down) penMove(...rel(e)); });
  canvas.addEventListener('pointerup', () => { if (handActive) return; touchDown = false; if (!eraserMode) penUp(); flushErase(); });
  canvas.addEventListener('pointercancel', () => { if (handActive) return; touchDown = false; if (!eraserMode) penUp(); });

  // ---------- Kamera + deteksi tangan ----------
  let handActive = false;
  async function loadLandmarker() {
    if (landmarker) return landmarker;
    const { FilesetResolver, HandLandmarker } = await import(`${MP_URL}/vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.3, minTrackingConfidence: 0.3 }); // tracking lebih lengket biar tangan nggak gampang 'hilang'
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
      offerCam();
    } catch {
      setStatus('Kamera nggak bisa dibuka. Gambar pakai jari di layar aja yaa ✍️');
      return;
    }
    try {
      setStatus('Nyiapin deteksi tangan…');
      await loadLandmarker();
      setStatus('☝️ 1 jari = gambar · 🖐️ buka telapak = hapus · ✊ kepal = berhenti');
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

  // Baca bentuk jari dari koordinat 3D tangan (worldLandmarks), jadi tetap kebaca walau tangan miring / nunjuk ke kamera.
  // Jari dianggap lurus kalau ujungnya jauh lebih jauh dari pergelangan dibanding ruas tengahnya.
  // 1 jari (telunjuk) = gambar · telapak terbuka (4–5 jari) = hapus · lainnya (kepal dll) = berhenti
  function gestureMode(w) {
    const d = (a, b) => Math.hypot(w[a].x - w[b].x, w[a].y - w[b].y, w[a].z - w[b].z);
    const ratio = (tip, pip) => d(tip, 0) / d(pip, 0);
    const iR = ratio(8, 6), mR = ratio(12, 10), rR = ratio(16, 14), pR = ratio(20, 18);
    const open = (r) => r > 1.12, shut = (r) => r < 1.06;
    if (open(iR) && open(mR) && open(rR) && open(pR)) return 'erase';
    if (open(iR) && !open(mR) && !open(rR) && !open(pR)) return 'draw';
    if (open(iR) && shut(rR) && shut(pR) && mR < 1.1) return 'draw'; // jari tengah agak kebuka dikit, tetap gambar
    return 'none';
  }
  // Ganti mode baru kejadian kalau bentuk tangannya konsisten beberapa frame (biar nggak kedip-kedip),
  // dan pas lagi gambar, salah baca sesaat nggak langsung motong garis.
  const NEED = { draw: 2, erase: 3, none: 4 };
  let mode = 'none', cand = 'none', candN = 0, lostAt = 0;
  let filt = null; // penghalus posisi: { x, y, t }
  function smooth(x, y, now) {
    if (!filt) { filt = { x, y, t: now }; return [x, y]; }
    const dt = Math.max(1, now - filt.t) / 1000;
    const speed = Math.hypot(x - filt.x, y - filt.y) / dt; // layar per detik
    const a = Math.min(0.9, 0.28 + speed * 0.9); // pelan = halus & presisi, cepat = langsung ngikut
    filt.x += (x - filt.x) * a; filt.y += (y - filt.y) * a; filt.t = now;
    return [filt.x, filt.y];
  }
  function setMode(m) {
    if (m === mode) return;
    if (pen.down) penUp();
    if ((m === 'erase') !== (mode === 'erase')) filt = null; // titik acuan pindah (telunjuk ⇄ tengah telapak), jangan diseret
    mode = m;
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running || !landmarker || video.readyState < 2) return;
    const now = performance.now();
    if (now - lastDetect < 33) return; // ±30 kali per detik
    lastDetect = now;
    let res;
    try { res = landmarker.detectForVideo(video, now); } catch { return; }
    const lm = res?.landmarks?.[0], wl = res?.worldLandmarks?.[0];
    if (!lm || !wl) {
      // tangan hilang sebentar (keluar frame / blur): tunggu 200 ms dulu baru angkat pena
      if (!lostAt) lostAt = now;
      if (now - lostAt > 200) { handActive = false; cursor.hidden = true; setMode('none'); cand = 'none'; candN = 0; filt = null; }
      return;
    }
    lostAt = 0;
    handActive = true;
    const seen = canDraw() ? gestureMode(wl) : 'none';
    if (seen === cand) candN++; else { cand = seen; candN = 1; }
    if (cand !== mode && candN >= NEED[cand]) setMode(cand);
    // Gambar: ujung telunjuk · hapus: tengah telapak. Kamera depan ditampilin kayak cermin → x dibalik
    const px = mode === 'erase' ? (lm[0].x + lm[5].x + lm[9].x + lm[17].x) / 4 : lm[8].x;
    const py = mode === 'erase' ? (lm[0].y + lm[5].y + lm[9].y + lm[17].y) / 4 : lm[8].y;
    const [x, y] = smooth(1 - px, py, now);
    const r = canvas.getBoundingClientRect();
    cursor.hidden = false;
    cursor.style.transform = `translate(${x * r.width}px, ${y * r.height}px)`;
    cursor.classList.toggle('on', mode === 'draw');
    cursor.classList.toggle('erase', mode === 'erase');
    cursor.style.setProperty('--c', color);
    if (mode === 'draw') { if (!pen.down) penDown(x, y); else penMove(x, y); }
    else if (mode === 'erase') eraseAt(x, y);
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
  $('#draw-mode').addEventListener('click', () => {
    sfx('click');
    eraserMode = !eraserMode;
    $('#draw-mode').textContent = eraserMode ? '✏️ Pena' : '🩹 Hapus';
    $('#draw-mode').classList.toggle('on', eraserMode);
  });
  $('#draw-clear').addEventListener('click', () => { sfx('pop'); clearAll(); });
  $('#draw-cam').addEventListener('click', () => {
    sfx('click');
    camOn = !camOn;
    screen.classList.toggle('cam-off', !camOn);
    $('#draw-cam').textContent = camOn ? '📷 Tutup kamera' : '📸 Buka kamera';
    if (sync) sendNet('cam-hide', { off: !camOn });
    rtcTx?.replaceTrack(camOn ? stream?.getVideoTracks()[0] || null : null).catch(() => {});
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
    // Di HP Aidan yang kefoto muka Fall (video live, atau foto kecil kalau lagi mode cadangan)
    const src = screen.classList.contains('remote-img') ? remoteImg : video;
    const vw = src.videoWidth || src.naturalWidth, vh = src.videoHeight || src.naturalHeight;
    if (camOn && vw && !screen.classList.contains('peer-cam-off')) {
      // sama kayak tampilan: dipotong pas kotak (cover) & dicerminin
      const vr = vw / vh, cr = out.width / out.height;
      const sw = vr > cr ? vh * cr : vw, sh = vr > cr ? vh : vw / cr;
      o.save(); o.translate(out.width, 0); o.scale(-1, 1);
      o.drawImage(src, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, out.width, out.height);
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

  // ---------- Muka Fall live di HP Aidan (satu arah, muka Aidan nggak dikirim) ----------
  // Utama WebRTC (video langsung HP ke HP). Kalau 8 detik nggak nyambung (sering di data seluler),
  // ganti kirim foto kecil ±4x per detik lewat room.
  const remoteImg = $('#draw-remote');
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  let pc = null, rtcTx = null, rtcT = 0, snapT = 0, iceWait = [];
  const amSender = () => meNet().role !== 'pengirim';
  const showRemote = (mode) => {
    screen.classList.toggle('remote-video', mode === 'video');
    screen.classList.toggle('remote-img', mode === 'img');
  };
  function closePc() {
    clearTimeout(rtcT); rtcT = 0;
    clearInterval(snapT); snapT = 0;
    pc?.close(); pc = null; rtcTx = null; iceWait = [];
  }
  function newPc() {
    closePc();
    pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = (e) => { if (e.candidate) sendNet('cam-ice', { c: e.candidate.toJSON() }); };
    return pc;
  }
  async function addIce(c) {
    if (!pc) return;
    if (!pc.remoteDescription) { iceWait.push(c); return; }
    try { await pc.addIceCandidate(c); } catch {}
  }
  async function flushIce() { const w = iceWait; iceWait = []; for (const c of w) await addIce(c); }
  // HP Fall
  async function offerCam() {
    if (!sync || !stream || !amSender()) return;
    try {
      const p = newPc();
      const track = stream.getVideoTracks()[0];
      rtcTx = p.addTrack(track, stream);
      if (!camOn) rtcTx.replaceTrack(null).catch(() => {});
      await p.setLocalDescription(await p.createOffer());
      try { // hemat kuota: ±350 kbps cukup buat muka
        const prm = rtcTx.getParameters();
        if (!prm.encodings?.length) prm.encodings = [{}];
        prm.encodings[0].maxBitrate = 350000;
        await rtcTx.setParameters(prm);
      } catch {}
      sendNet('cam-offer', { sdp: p.localDescription.toJSON() });
      sendNet('cam-hide', { off: !camOn });
    } catch { closePc(); }
  }
  const snap = document.createElement('canvas');
  snap.width = 180; snap.height = 240; // 3:4, sama kayak kanvas
  function startSnaps() {
    if (snapT || !amSender()) return;
    snapT = setInterval(() => {
      if (!sync || !stream || !camOn || video.readyState < 2) return;
      const vw = video.videoWidth, vh = video.videoHeight, cr = 3 / 4;
      const sw = vw / vh > cr ? vh * cr : vw, sh = vw / vh > cr ? vh : vw / cr;
      snap.getContext('2d').drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, snap.width, snap.height);
      sendNet('cam-snap', { j: snap.toDataURL('image/jpeg', 0.55) });
    }, 250);
  }
  onNet('cam-want', () => { if (sync && amSender() && stream) offerCam(); });
  onNet('cam-answer', async (d) => {
    if (!pc || !amSender()) return;
    try { await pc.setRemoteDescription(d.sdp); await flushIce(); } catch {}
  });
  onNet('cam-snap-start', () => { if (sync && amSender()) startSnaps(); });
  onNet('cam-snap-stop', () => { clearInterval(snapT); snapT = 0; });
  // HP Aidan
  const fallback = () => { if (sync && !amSender() && !screen.classList.contains('remote-video')) sendNet('cam-snap-start'); };
  const waitRtc = () => { clearTimeout(rtcT); rtcT = setTimeout(() => { if (pc?.connectionState !== 'connected') fallback(); }, 8000); };
  onNet('cam-offer', async (d) => {
    if (!sync || amSender()) return;
    try {
      const p = newPc();
      p.ontrack = (e) => { video.srcObject = e.streams[0] || new MediaStream([e.track]); video.play().catch(() => {}); };
      p.onconnectionstatechange = () => {
        if (p !== pc) return;
        if (p.connectionState === 'connected') { clearTimeout(rtcT); showRemote('video'); sendNet('cam-snap-stop'); }
        else if (p.connectionState === 'failed') { showRemote(null); fallback(); }
      };
      await p.setRemoteDescription(d.sdp);
      await flushIce();
      await p.setLocalDescription(await p.createAnswer());
      sendNet('cam-answer', { sdp: p.localDescription.toJSON() });
      waitRtc();
    } catch { fallback(); }
  });
  onNet('cam-ice', (d) => { if (sync) addIce(d.c); });
  onNet('cam-snap', (d) => {
    if (!sync || amSender() || screen.classList.contains('remote-video')) return;
    remoteImg.src = d.j;
    showRemote('img');
  });
  onNet('cam-hide', (d) => { if (!amSender()) screen.classList.toggle('peer-cam-off', !!d.off); });
  const remoteStop = () => {
    closePc();
    if (!amSender()) { video.srcObject = null; showRemote(null); screen.classList.remove('peer-cam-off'); }
  };
  onNet('cam-stop', () => { if (sync) remoteStop(); });
  onNet('peer-left', remoteStop);

  // ---------- Mode Tebak Gambar: gantian gambar, pasangan nebak ----------
  // Urutan kata sama di dua HP (seed dari ajakan). HP yang lagi gambar jadi patokan waktu & yang nentuin bener/salah.
  const ROUNDS = 6, ROUND_TIME = 60;
  const guessBox = $('#draw-guess');
  const banner = $('#draw-secret');
  const roleOf = (r) => (r % 2 === 0 ? 'pasangan' : 'pengirim');
  const blanks = (w) => w.split('').map((ch) => (ch === ' ' ? '&nbsp;&nbsp;' : ch === '-' ? '-' : '_')).join(' ');
  const PICK = 3; // berapa pilihan kata tiap ronde
  const optsFor = (r) => game.pool.slice(r * PICK, r * PICK + PICK);
  function startGame(seed) {
    const rng = seeded(seed);
    const pool = [...WORDS];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    game = { pool, r: 0, ok: 0 };
    startRound();
  }
  function startRound() {
    clearInterval(game.timer); game.timer = 0;
    strokes.length = 0; redraw(); penUp();
    game.drawer = roleOf(game.r);
    game.phase = 'pick'; // milih kata dulu, baru gambar
    game.answer = null; game.mask = null; game.left = ROUND_TIME;
    guessBox.hidden = true;
    banner.hidden = false;
    renderBanner();
    $('#draw-who').textContent = `\u{1F3A8} Ronde ${game.r + 1}/${ROUNDS} · ✅ ${game.ok}`;
    sfx('go');
    if (!iDraw()) toast(`${peerNet()?.name || 'Pasangan'} lagi milih kata \u{1F914}`);
  }
  function startTimer() {
    clearInterval(game.timer);
    game.timer = setInterval(() => {
      if (!game || game.phase !== 'draw') return;
      game.left = Math.max(0, game.left - 1);
      renderBanner();
      if (game.left === 0 && iDraw()) finishRound(false);
    }, 1000);
  }
  function pickWord(i) {
    if (!game || game.phase !== 'pick' || !iDraw()) return;
    const w = optsFor(game.r)[i];
    if (!w) return;
    sfx('click');
    game.answer = w;
    game.mask = w.replace(/[^\s-]/g, '*'); // cuma kerangka kata, hurufnya nggak ikut dikirim
    game.phase = 'draw';
    sendNet('pg-pick', { r: game.r, mask: game.mask });
    renderBanner(); startTimer();
  }
  function renderBanner() {
    const mine = iDraw();
    if (game.phase === 'pick') {
      banner.innerHTML = mine
        ? `Pilih yang mau kamu gambar \u{1F3A8}<div class="pg-opts">${optsFor(game.r).map((w, i) => `<button class="btn small-btn" type="button" data-pg-pick="${i}">${w}</button>`).join('')}</div>`
        : `Tebak gambar ${peerNet()?.name || 'pasangan'}! <small>⏳ lagi milih kata buat digambar…</small>`;
      return;
    }
    const letters = (mine ? game.answer : game.mask || '').replace(/[^a-z*]/gi, '').length;
    banner.innerHTML = mine
      ? `Giliran kamu gambar \u{1F92B} <b>${game.answer}</b><small>⏱ ${game.left} detik · ☝️ gambar · 🖐️ hapus · ✊ berhenti</small><button class="link-btn" type="button" data-pg-skip>lewati kata ini</button>`
      : `Tebak gambar ${peerNet()?.name || 'pasangan'}! <b>${blanks(game.mask || '')}</b><small>${letters} huruf · ⏱ ${game.left} detik</small>`;
  }
  function finishRound(ok) { // cuma dipanggil di HP yang lagi gambar
    if (!game) return;
    const r = game.r;
    sendNet('pg-next', { r, ok, w: game.answer });
    applyNext(r, ok, game.answer);
  }
  function applyNext(r, ok, w) {
    if (!game || r !== game.r) return;
    clearInterval(game.timer); game.timer = 0;
    game.phase = 'done';
    w = w || game.answer || '';
    if (ok) { game.ok++; sfx('win'); toast(`Bener! Jawabannya "${w}" \u{1F389}`); }
    else { sfx('lose'); toast(`Jawabannya "${w}" \u{1F606}`); }
    game.r++;
    $('#draw-who').textContent = `\u{1F3A8} Ronde ${Math.min(game.r + 1, ROUNDS)}/${ROUNDS} · ✅ ${game.ok}`;
    if (game.r >= ROUNDS) { setTimeout(endGame, 1200); return; }
    setTimeout(() => { if (game) startRound(); }, 1800);
  }
  function endGame() {
    if (!game) return;
    const ok = game.ok;
    clearInterval(game.timer);
    game = null;
    guessBox.hidden = true;
    const label = ok >= 5 ? 'Sehati parah! \u{1F48D}' : ok >= 3 ? 'Kompak! \u{1F49E}' : 'Seru juga ya \u{1F606}';
    if (ok >= 3) sfx('win');
    banner.hidden = false;
    banner.innerHTML = `Selesai! Kalian bener <b>${ok}/${ROUNDS}</b><small>${label}</small><button class="btn small-btn" type="button" data-pg-again>Main lagi \u{1F501}</button>`;
    $('#draw-who').textContent = `\u{1F49E} Bareng ${peerNet()?.name || ''}`;
  }
  banner.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pg-pick]');
    if (pick) { pickWord(+pick.dataset.pgPick); return; }
    if (e.target.closest('[data-pg-skip]') && game && iDraw() && game.phase === 'draw') { sfx('click'); finishRound(false); }
    if (e.target.closest('[data-pg-again]')) { sfx('click'); inviteGame('pictio'); }
  });
  guessBox.addEventListener('submit', (e) => {
    e.preventDefault();
    const g = guessBox.querySelector('input').value.trim();
    if (!g || !game) return;
    sendNet('draw-guess', { g, r: game.r });
    guessBox.querySelector('input').value = '';
  });
  onNet('draw-guess', (d) => {
    if (!sync || !game || !iDraw() || game.phase !== 'draw' || d.r !== game.r) return;
    if (norm(d.g) === norm(game.answer)) finishRound(true);
    else { sendNet('pg-wrong', { g: d.g }); toast(`${peerNet()?.name || 'Pasangan'} nebak "${d.g}"… salah \u{1F606}`); }
  });
  onNet('pg-wrong', (d) => { if (sync) { sfx('bad'); toast(`"${d.g}" salah, coba lagi \u{1F92D}`); } });
  onNet('pg-pick', (d) => {
    if (!sync || !game || iDraw() || d.r !== game.r) return;
    game.mask = d.mask; game.phase = 'draw'; game.left = ROUND_TIME;
    guessBox.hidden = false;
    renderBanner(); startTimer();
  });
  onNet('pg-next', (d) => { if (sync) applyNext(d.r, d.ok, d.w); });

  // ---------- Buka / tutup ----------
  window.addEventListener('resize', () => { if (running) fit(); });
  return {
    async open(withPartner, seed = null) {
      sync = !!withPartner && !!peerNet();
      running = true;
      if (game) clearInterval(game.timer);
      game = null;
      banner.hidden = true;
      guessBox.hidden = true;
      $('#draw-who').textContent = sync ? `💞 Bareng ${peerNet().name}` : '✍️ Gambar Udara';
      requestAnimationFrame(fit);
      if (seed != null && sync) requestAnimationFrame(() => startGame(seed));
      // Kamera cuma nyala di HP Fall. Di HP Aidan gambarnya pakai jari di layar (lebih hemat baterai).
      const useCam = meNet().role !== 'pengirim';
      screen.classList.toggle('no-cam', !useCam);
      if (!useCam) {
        stopCamera();
        setStatus(sync ? `Gambar pakai jari di layar ✍️ · muka ${peerNet().name} live di sini` : 'Gambar pakai jari di layar ✍️');
        if (sync) { sendNet('cam-want'); waitRtc(); }
        return;
      }
      if (!stream) await startCamera();
      else { loop(); offerCam(); }
    },
    close() {
      if (sync) sendNet('cam-stop');
      remoteStop();
      running = false;
      sync = false;
      if (game) clearInterval(game.timer);
      game = null;
      penUp();
      stopCamera();
      onClose?.();
    },
  };
}
