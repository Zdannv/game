// Penghubung fitur Love Quest (Deep Talk, Main Berdua) ke web Fall.
// Di sini "pasangan" = Fall, "pengirim" = Aidan. Siapa yang pegang HP ketahuan dari pintu tanggal lahir.
import { CONFIG } from './config.js';
import { getPlayer } from './streak.js';
import { setupGate } from './kita.js';

const ROLE = { fall: 'pasangan', aidan: 'pengirim' };
export const getNames = () => ({ pasangan: 'Fall', pengirim: 'Aidan' });
export const getFace = (role) => ({ pasangan: 'img/fall-head.jpg', pengirim: 'img/aidan-head.jpg' })[role] || null;
export const getChars = () => ({ pasangan: { emoji: '🦉' }, pengirim: { emoji: '🐱' } });
export const fill = (s = '') => String(s).replaceAll('{pasangan}', 'Fall').replaceAll('{pengirim}', 'Aidan');

// Profil = hasil pintu tanggal lahir
export const whoAmI = () => ROLE[getPlayer()] || null;
export async function askProfile() { await setupGate(); return whoAmI(); }
export function forget() {}

// Room berdua & koneksi Realtime
export const CLOUD = { url: CONFIG.supabase.url, anonKey: CONFIG.supabase.anonKey };
export const ROOM = 'fall-aidan-kita';

// Nama dunia buat peta Main Berdua
export const LEVEL_MAP = [
  { name: 'Taman Bunga', icon: '🌸' },
  { name: 'Kota Permen', icon: '🍭' },
  { name: 'Pantai Cinta', icon: '🏖️' },
  { name: 'Langit Bintang', icon: '🌙' },
  { name: 'Rumah Kita', icon: '🏡' },
];
