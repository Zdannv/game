-- Jalankan di Supabase → SQL Editor SETELAH edge function pengirim notif di-deploy.
-- Sesuaikan nama function di url (di project ini namanya "bright-action").
-- Ganti ISI_CRON_SECRET dengan nilai CRON_SECRET yang sama dengan di Edge Function Secrets.
-- 12:00 UTC = 19:00 WIB.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'streak-reminder-19-wib',
  '0 12 * * *',
  $$
  select net.http_post(
    url     := 'https://xmbshvmyztvaalcifqib.supabase.co/functions/v1/bright-action',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'ISI_CRON_SECRET'),
    body    := '{"type":"reminder"}'::jsonb
  );
  $$
);
