-- Kotak Kita tahap 2: cukup pakai TANGGAL ULTAH (yang dimasukin di pintu depan) sebagai kunci.
-- Database sendiri yang nentuin siapa yang buka (Fall / Aidan), jadi pengirim nggak bisa dipalsuin.
-- Jalankan SEKALI di Supabase (project Fall) → SQL Editor, setelah kita.sql.
-- Ganti ULTAH_FALL & ULTAH_AIDAN di bagian paling bawah dengan tanggalnya (format YYYY-MM-DD).

create table if not exists public.kita_people (
  who  text primary key check (who in ('fall', 'aidan')),
  hash text not null
);
alter table public.kita_people enable row level security;

-- Siapa yang punya kunci ini? (ultah Fall → 'fall', ultah Aidan → 'aidan'; kunci lama tetap diterima)
create or replace function public.kita_who(p_key text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select p.who from public.kita_people p where p.hash = extensions.crypt(p_key, p.hash) limit 1),
    (select 'lama' from public.kita_secret s where s.hash = extensions.crypt(p_key, s.hash) limit 1)
  );
$$;
revoke all on function public.kita_who(text) from public, anon, authenticated;

create or replace function public.kita_ok(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.kita_who(p_key) is not null;
$$;

-- Foto boleh lebih besar (HP sudah ngecilin dulu sebelum kirim)
alter table public.kiriman drop constraint if exists kiriman_photo_check;
alter table public.kiriman add constraint kiriman_photo_check check (char_length(photo) <= 3000000);

-- Kirim: pengirimnya ditentukan dari kunci (ultah), bukan dari HP
create or replace function public.kita_send(p_key text, p_sender text, p_kind text, p_category text, p_title text, p_body text, p_photo text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare who text := public.kita_who(p_key); new_id bigint;
begin
  if who is null then raise exception 'kunci salah'; end if;
  if who = 'lama' then who := p_sender; end if;
  insert into public.kiriman (sender, kind, category, title, body, photo)
  values (who, p_kind, nullif(p_category, ''), nullif(p_title, ''), nullif(p_body, ''), nullif(p_photo, ''))
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.kita_open(p_key text, p_id bigint, p_reader text) returns void
language plpgsql security definer set search_path = public as $$
declare who text := public.kita_who(p_key);
begin
  if who is null then raise exception 'kunci salah'; end if;
  if who = 'lama' then who := p_reader; end if;
  update public.kiriman set opened_at = coalesce(opened_at, now()) where id = p_id and sender <> who;
end $$;

create or replace function public.kita_delete(p_key text, p_id bigint, p_sender text) returns void
language plpgsql security definer set search_path = public as $$
declare who text := public.kita_who(p_key);
begin
  if who is null then raise exception 'kunci salah'; end if;
  if who = 'lama' then who := p_sender; end if;
  delete from public.kiriman where id = p_id and sender = who;
end $$;

grant execute on function public.kita_send(text, text, text, text, text, text, text) to anon;
grant execute on function public.kita_open(text, bigint, text) to anon;
grant execute on function public.kita_delete(text, bigint, text) to anon;

-- ================================================================
-- TERAKHIR: daftarkan ultah masing-masing (ganti tanggalnya, format YYYY-MM-DD)
-- ================================================================
insert into public.kita_people (who, hash) values
  ('fall',  extensions.crypt('ULTAH_FALL',  extensions.gen_salt('bf'))),
  ('aidan', extensions.crypt('ULTAH_AIDAN', extensions.gen_salt('bf')))
on conflict (who) do update set hash = excluded.hash;
