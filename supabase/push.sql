-- Jalankan sekali di Supabase → SQL Editor (setelah schema.sql).
-- Menyimpan HP mana saja yang mau dapat notifikasi streak.

create table if not exists public.push_subscriptions (
  endpoint   text        primary key,
  player     text        not null check (player in ('fall', 'aidan')),
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Game cuma boleh MENDAFTARKAN HP (nggak bisa baca/hapus punya orang lain)
create policy "push: daftar" on public.push_subscriptions
  for insert to anon
  with check (true);

grant insert on public.push_subscriptions to anon;

-- Catatan notifikasi yang sudah terkirim hari ini, biar nggak dobel.
-- Nggak ada policy untuk anon: cuma edge function (service role) yang bisa akses.
create table if not exists public.notify_log (
  day        date        not null,
  kind       text        not null,
  player     text        not null,
  created_at timestamptz not null default now(),
  primary key (day, kind, player)
);

alter table public.notify_log enable row level security;
