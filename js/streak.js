// Streak couple: dicatat di Supabase (tabel `plays`), tanpa login.
// Tiap HP cukup pilih sekali "Aku Fall" atau "Aku Aidan".
import { CONFIG } from './config.js';

const PLAYERS = ['fall', 'aidan'];
const WHO_KEY = 'fq-player';
const { url = '', anonKey = '', vapidPublicKey = '', pushFunction = 'streak-push' } = CONFIG.supabase || {};

export const streakEnabled = Boolean(url && anonKey);

export function getPlayer() {
  try {
    const p = localStorage.getItem(WHO_KEY);
    return PLAYERS.includes(p) ? p : null;
  } catch { return null; }
}
export function setPlayer(p) {
  try { localStorage.setItem(WHO_KEY, p); } catch {}
}

// Tanggal hari ini menurut jam WIB, format YYYY-MM-DD
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayOf = (date) => fmt.format(date);
function shiftDay(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function api(path, init = {}) {
  return fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: anonKey, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

// Catat bahwa pemain ini sudah main hari ini (sekali sehari cukup).
export async function recordPlay() {
  const player = getPlayer();
  if (!streakEnabled || !player) return false;
  const day = dayOf(new Date());
  const key = `fq-played-${player}-${day}`;
  try { if (localStorage.getItem(key)) return false; } catch {}
  const res = await api('plays?on_conflict=player,day', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ player, day }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  try { localStorage.setItem(key, '1'); } catch {}
  return true;
}

// Ambil data 120 hari terakhir lalu hitung streak.
export async function loadStreak() {
  const today = dayOf(new Date());
  const res = await api(`plays?select=player,day&day=gte.${shiftDay(today, -120)}&order=day.desc`);
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = await res.json();

  const byDay = new Map();
  for (const { player, day } of rows) {
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day).add(player);
  }
  const both = (day) => PLAYERS.every((p) => byDay.get(day)?.has(p));

  // Kalau hari ini belum lengkap, streak masih hidup dari kemarin (belum putus sampai hari ini lewat)
  let count = 0;
  let day = both(today) ? today : shiftDay(today, -1);
  while (both(day)) { count++; day = shiftDay(day, -1); }

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDay(today, -i);
    week.push({ day: d, fall: !!byDay.get(d)?.has('fall'), aidan: !!byDay.get(d)?.has('aidan') });
  }
  return {
    count,
    litToday: both(today),
    today: { fall: !!byDay.get(today)?.has('fall'), aidan: !!byDay.get(today)?.has('aidan') },
    week,
  };
}

// Kabari pasangan lewat notifikasi (edge function pengirim notif). Gagal pun nggak apa-apa.
export function notifyPlayed() {
  const player = getPlayer();
  if (!streakEnabled || !player) return Promise.resolve();
  return fetch(`${url.replace(/\/$/, '')}/functions/v1/${pushFunction}`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'played', player }),
  }).catch(() => {});
}

// ---------- Notifikasi (web push) ----------
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'ok' | 'on' | 'denied' | 'ios-install' | 'unsupported'
export async function pushState() {
  if (!streakEnabled || !vapidPublicKey || !('serviceWorker' in navigator)) return 'unsupported';
  if (isIOS && !isStandalone()) return 'ios-install';
  if (!('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'ok';
}

function keyBytes(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function enablePush() {
  const player = getPlayer();
  if (!player) return 'ok';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'ok';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }));
  const { endpoint, keys } = sub.toJSON();
  const res = await api('push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ endpoint, player, p256dh: keys.p256dh, auth: keys.auth }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return 'on';
}

// Angka streak di ikon aplikasi (kalau HP-nya dukung)
export function setBadge(count) {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (count > 0) navigator.setAppBadge(count).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  } catch {}
}
