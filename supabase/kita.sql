-- "Kotak Kita": surat & foto dua arah (Fall ⇄ Aidan) + jawaban halaman rahasia.
-- Jalankan SEKALI di Supabase (project Fall) → SQL Editor.
-- Semua data cuma bisa dibaca/ditulis lewat fungsi di bawah yang butuh KUNCI RAHASIA.
-- Tabelnya sendiri tertutup total (RLS tanpa policy), jadi anon key saja nggak cukup.

create extension if not exists pgcrypto with schema extensions;

-- Kunci rahasia (disimpan sebagai hash bcrypt, bukan teks asli)
create table if not exists public.kita_secret (
  id   int primary key default 1 check (id = 1),
  hash text not null
);
alter table public.kita_secret enable row level security;

create table if not exists public.kiriman (
  id         bigserial   primary key,
  sender     text        not null check (sender in ('fall', 'aidan')),
  kind       text        not null check (kind in ('surat', 'foto')),
  category   text        check (category in ('kangen', 'sedih', 'marah', 'tidur', 'senang', 'semangat')),
  title      text        check (char_length(title) <= 120),
  body       text        check (char_length(body) <= 5000),
  photo      text        check (char_length(photo) <= 900000), -- foto JPEG (data URL), sudah dikecilkan di HP
  created_at timestamptz not null default now(),
  opened_at  timestamptz
);
alter table public.kiriman enable row level security;

-- Jawaban dari halaman rahasia ("do you want to be my girlfriend?")
create table if not exists public.jawaban (
  id         int primary key default 1 check (id = 1),
  answer     text        not null,
  answered_at timestamptz not null default now()
);
alter table public.jawaban enable row level security;

create or replace function public.kita_ok(p_key text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.kita_secret s where s.hash = extensions.crypt(p_key, s.hash));
$$;

-- Daftar kiriman (tanpa isi foto, biar ringan)
create or replace function public.kita_list(p_key text)
returns table (id bigint, sender text, kind text, category text, title text, body text, has_photo boolean, created_at timestamptz, opened_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  return query select k.id, k.sender, k.kind, k.category, k.title, k.body, k.photo is not null, k.created_at, k.opened_at
    from public.kiriman k order by k.created_at desc limit 500;
end $$;

create or replace function public.kita_photo(p_key text, p_id bigint) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  return (select photo from public.kiriman where id = p_id);
end $$;

create or replace function public.kita_send(p_key text, p_sender text, p_kind text, p_category text, p_title text, p_body text, p_photo text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  insert into public.kiriman (sender, kind, category, title, body, photo)
  values (p_sender, p_kind, nullif(p_category, ''), nullif(p_title, ''), nullif(p_body, ''), nullif(p_photo, ''))
  returning id into new_id;
  return new_id;
end $$;

-- Tandai sudah dibuka (cuma penerima yang ngebuka)
create or replace function public.kita_open(p_key text, p_id bigint, p_reader text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  update public.kiriman set opened_at = coalesce(opened_at, now()) where id = p_id and sender <> p_reader;
end $$;

-- Hapus kiriman sendiri
create or replace function public.kita_delete(p_key text, p_id bigint, p_sender text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  delete from public.kiriman where id = p_id and sender = p_sender;
end $$;

-- Jawaban halaman rahasia (disimpan sekali; dipakai buat "hari ke-XXX" nanti)
create or replace function public.kita_jawab(p_key text, p_answer text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  insert into public.jawaban (id, answer) values (1, p_answer)
  on conflict (id) do update set answer = excluded.answer
  returning answered_at into t;
  return t;
end $$;

create or replace function public.kita_jadian(p_key text) returns timestamptz
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  return (select answered_at from public.jawaban where id = 1 and answer = 'mau');
end $$;

revoke all on function public.kita_ok(text) from public, anon, authenticated;
grant execute on function public.kita_list(text) to anon;
grant execute on function public.kita_photo(text, bigint) to anon;
grant execute on function public.kita_send(text, text, text, text, text, text, text) to anon;
grant execute on function public.kita_open(text, bigint, text) to anon;
grant execute on function public.kita_delete(text, bigint, text) to anon;
grant execute on function public.kita_jawab(text, text) to anon;
grant execute on function public.kita_jadian(text) to anon;

-- ================================================================
-- TERAKHIR: pasang kunci rahasia. Ganti ISI_KUNCI dengan kunci yang dikasih Claude.
-- ================================================================
insert into public.kita_secret (id, hash) values (1, extensions.crypt('ISI_KUNCI', extensions.gen_salt('bf')))
on conflict (id) do update set hash = excluded.hash;
