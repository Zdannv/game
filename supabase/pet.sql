-- 🐥 Peliharaan Kita: satu peliharaan bareng buat Fall & Aidan (disimpen sebagai JSON).
-- Jalankan SEKALI di Supabase (project Fall) → SQL Editor, setelah kita.sql & kita2.sql.
-- Aksesnya pakai kunci yang sama kayak Kotak Kita (tanggal ultah), jadi cuma kalian berdua yang bisa baca & ubah.

create table if not exists public.kita_pet (
  id         int primary key default 1 check (id = 1),
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);
alter table public.kita_pet enable row level security;

create or replace function public.kita_pet_get(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  return (select state from public.kita_pet where id = 1);
end $$;

create or replace function public.kita_pet_save(p_key text, p_state jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.kita_ok(p_key) then raise exception 'kunci salah'; end if;
  if char_length(p_state::text) > 20000 then raise exception 'kebesaran'; end if;
  insert into public.kita_pet (id, state, updated_at) values (1, p_state, now())
  on conflict (id) do update set state = excluded.state, updated_at = now();
end $$;

revoke all on function public.kita_pet_get(text) from public;
revoke all on function public.kita_pet_save(text, jsonb) from public;
grant execute on function public.kita_pet_get(text) to anon;
grant execute on function public.kita_pet_save(text, jsonb) to anon;
