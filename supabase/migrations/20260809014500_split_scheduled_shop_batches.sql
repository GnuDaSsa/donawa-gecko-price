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
  shop_limit integer;
  feedle_request_id bigint;
  core_shops_request_id bigint;
  domestic_shops_a_request_id bigint;
  domestic_shops_b_request_id bigint;
begin
  safe_limit := greatest(1, least(coalesce(p_limit, 100), 100));
  shop_limit := least(safe_limit, 48);

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
    body := jsonb_build_object(
      'limit', shop_limit,
      'sites', jsonb_build_array('kiwo', 'watertail', 'mybreeders', 'newrun')
    ),
    timeout_milliseconds := 600000
  ) into core_shops_request_id;

  select net.http_post(
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object(
      'limit', shop_limit,
      'sites', jsonb_build_array(
        'jurassic',
        'newrunnatural',
        'thesafari',
        'thereptile',
        'zooseyo'
      )
    ),
    timeout_milliseconds := 600000
  ) into domestic_shops_a_request_id;

  select net.http_post(
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object(
      'limit', shop_limit,
      'sites', jsonb_build_array(
        'thebreeders',
        'bestfarm',
        'newrunwild',
        'frienzoo'
      )
    ),
    timeout_milliseconds := 600000
  ) into domestic_shops_b_request_id;

  return array[
    feedle_request_id,
    core_shops_request_id,
    domestic_shops_a_request_id,
    domestic_shops_b_request_id
  ];
end;
$function$;

revoke all on function public.invoke_scheduled_collectors(integer)
from public, anon, authenticated, service_role;
grant execute on function public.invoke_scheduled_collectors(integer)
to postgres;

comment on function public.invoke_scheduled_collectors(integer) is
  'Queues Feedle plus three bounded public-shop batches at 09:00 and 18:00 Asia/Seoul so the free-tier Edge runtime does not serialize every domestic source in one request.';
