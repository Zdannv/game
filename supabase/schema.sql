-- Jalankan sekali di Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Satu baris = satu orang sudah main di satu hari (tanggal WIB).

create table if not exists public.plays (
  player     text        not null check (player in ('fall', 'aidan')),
  day        date        not null,
  created_at timestamptz not null default now(),
  primary key (player, day)
);

alter table public.plays enable row level security;

-- Game boleh membaca semua catatan main (buat hitung streak)
create policy "streak: baca" on public.plays
  for select to anon
  using (true);

-- Game cuma boleh mencatat hari ini (± 1 hari buat jaga-jaga beda jam HP)
create policy "streak: catat main" on public.plays
  for insert to anon
  with check (
    day between (now() at time zone 'Asia/Jakarta')::date - 1
            and (now() at time zone 'Asia/Jakarta')::date + 1
  );

grant select, insert on public.plays to anon;
