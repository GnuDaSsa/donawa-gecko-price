create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.configure_collector_scheduler(
  p_project_url text,
  p_collector_secret text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  expected_hash text;
  normalized_project_url text;
  project_url_secret_id uuid;
  collector_secret_id uuid;
begin
  normalized_project_url := rtrim(coalesce(p_project_url, ''), '/');
  if normalized_project_url !~ '^https://[a-z0-9-]{10,64}\.supabase\.co$' then
    raise exception 'Invalid Supabase project URL';
  end if;

  select value
  into expected_hash
  from public.collector_settings
  where key = 'auth_sha256';

  if expected_hash is null
    or p_collector_secret is null
    or p_collector_secret = ''
    or encode(extensions.digest(p_collector_secret, 'sha256'), 'hex') <> expected_hash
  then
    raise exception 'Collector authentication failed';
  end if;

  select id into project_url_secret_id
  from vault.secrets
  where name = 'donawa_project_url';

  if project_url_secret_id is null then
    perform vault.create_secret(
      normalized_project_url,
      'donawa_project_url',
      'Supabase project URL used by the Donawa listing refresh cron job'
    );
  else
    perform vault.update_secret(
      project_url_secret_id,
      normalized_project_url,
      'donawa_project_url',
      'Supabase project URL used by the Donawa listing refresh cron job'
    );
  end if;

  select id into collector_secret_id
  from vault.secrets
  where name = 'donawa_collector_secret';

  if collector_secret_id is null then
    perform vault.create_secret(
      p_collector_secret,
      'donawa_collector_secret',
      'Encrypted authentication secret for scheduled Donawa collectors'
    );
  else
    perform vault.update_secret(
      collector_secret_id,
      p_collector_secret,
      'donawa_collector_secret',
      'Encrypted authentication secret for scheduled Donawa collectors'
    );
  end if;

  return true;
end;
$function$;

revoke all on function public.configure_collector_scheduler(text, text)
from public, anon, authenticated;
grant execute on function public.configure_collector_scheduler(text, text)
to service_role;

create or replace function public.invoke_scheduled_collectors(
  p_limit integer default 100
)
returns bigint[]
language plpgsql
security definer
set search_path = ''
as $function$
declare
  project_url text;
  collector_secret text;
  safe_limit integer;
  feedle_request_id bigint;
  shops_request_id bigint;
begin
  safe_limit := greatest(1, least(coalesce(p_limit, 100), 100));

  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'donawa_project_url';

  select decrypted_secret
  into collector_secret
  from vault.decrypted_secrets
  where name = 'donawa_collector_secret';

  if project_url is null or collector_secret is null then
    raise exception 'Donawa scheduler Vault secrets are not configured';
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/collect-feedle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object('limit', least(safe_limit, 60)),
    timeout_milliseconds := 600000
  ) into feedle_request_id;

  select net.http_post(
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object('limit', safe_limit),
    timeout_milliseconds := 600000
  ) into shops_request_id;

  return array[feedle_request_id, shops_request_id];
end;
$function$;

revoke all on function public.invoke_scheduled_collectors(integer)
from public, anon, authenticated, service_role;
grant execute on function public.invoke_scheduled_collectors(integer)
to postgres;

select cron.schedule(
  'donawa-listing-refresh-kst-09-18',
  '0 0,9 * * *',
  $cron$select public.invoke_scheduled_collectors(100);$cron$
);

comment on function public.invoke_scheduled_collectors(integer) is
  'Queues Feedle and public-shop refreshes. Cron runs at 00:00 and 09:00 UTC, corresponding to 09:00 and 18:00 Asia/Seoul.';
