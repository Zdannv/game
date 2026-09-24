// Edge function "streak-push": kirim notifikasi streak.
//   { type: "reminder" }            → dipanggil cron jam 19.00 WIB, ingetin yang belum main
//   { type: "played", player: "…" } → dipanggil game setelah main, kabarin pasangannya
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Player = 'fall' | 'aidan';
const PLAYERS: Player[] = ['fall', 'aidan'];
const NAME: Record<Player, string> = { fall: 'Fall', aidan: 'Aidan' };
const ICON: Record<Player, string> = { fall: '🦉', aidan: '🐱' };
const other = (p: Player): Player => (p === 'fall' ? 'aidan' : 'fall');

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
const shiftDay = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Hitung streak dengan aturan yang sama seperti di game
async function streakInfo() {
  const today = fmt.format(new Date());
  const { data, error } = await db.from('plays').select('player, day').gte('day', shiftDay(today, -120));
  if (error) throw error;
  const byDay = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    if (!byDay.has(r.day)) byDay.set(r.day, new Set());
    byDay.get(r.day)!.add(r.player);
  }
  const both = (d: string) => PLAYERS.every((p) => byDay.get(d)?.has(p));
  let count = 0;
  let d = both(today) ? today : shiftDay(today, -1);
  while (both(d)) { count++; d = shiftDay(d, -1); }
  const played = (p: Player) => !!byDay.get(today)?.has(p);
  return { today, count, lit: both(today), played };
}

// Catat notif supaya tiap jenis cuma terkirim sekali per hari
async function once(day: string, kind: string, player: string) {
  const { error } = await db.from('notify_log').insert({ day, kind, player });
  return !error;
}

async function sendTo(player: Player, payload: Record<string, unknown>) {
  const { data } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('player', player);
  await Promise.all((data ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const body = await req.json().catch(() => ({}));
  const info = await streakInfo();

  if (body.type === 'reminder') {
    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    const sent: string[] = [];
    for (const p of PLAYERS) {
      if (info.played(p) || !(await once(info.today, 'reminder', p))) continue;
      const o = other(p);
      const text = info.played(o)
        ? `${NAME[o]} udah main, tinggal kamu! ${info.count ? `Streak ${info.count} hari jangan sampe putus 🥺` : 'Yuk nyalain streaknya 🔥'}`
        : info.count
          ? `Kalian berdua belum main hari ini, streak ${info.count} hari bisa putus 🥺`
          : `Yuk main bentar, nyalain streak bareng ${NAME[o]} 🔥`;
      await sendTo(p, { title: '🔥 Jangan lupa main hari ini!', body: text, tag: 'reminder' });
      sent.push(p);
    }
    return json({ ok: true, sent });
  }

  if (body.type === 'played' && PLAYERS.includes(body.player)) {
    const p = body.player as Player;
    const o = other(p);
    if (!info.played(p)) return json({ error: 'belum main hari ini' }, 400);
    if (info.lit) {
      if (await once(info.today, 'lit', 'both')) {
        await sendTo(o, {
          title: `🔥 Streak nyala! ${info.count} hari`,
          body: `${NAME[p]} barusan main, streak kalian nyala lagi hari ini 💖`,
          tag: 'lit', badge: info.count,
        });
      }
    } else if (await once(info.today, 'played', p)) {
      await sendTo(o, {
        title: `${ICON[p]} ${NAME[p]} baru aja main!`,
        body: `Sekarang giliran kamu biar streak${info.count ? ` ${info.count} hari` : ''} nyala 🔥`,
        tag: 'played',
      });
    }
    return json({ ok: true });
  }

  return json({ error: 'bad request' }, 400);
});
