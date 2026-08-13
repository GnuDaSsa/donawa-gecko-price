insert into public.platforms (name, homepage_url, collector_type, is_active)
values
  (
    '도심속도마뱀',
    'https://myage.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/130/',
    'AUTO_WEB',
    false
  ),
  (
    '빙하기',
    'https://iceagereptile.com/category/%EA%B2%8C%EC%BD%94-%E2%94%82-Gecko/97/',
    'AUTO_WEB',
    false
  ),
  (
    '더몬스터',
    'https://themonster.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/109/',
    'AUTO_WEB',
    false
  ),
  (
    '더쥬',
    'https://xn--9m1b023b.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/90/',
    'AUTO_WEB',
    false
  ),
  (
    '더드래곤',
    'https://thedragon1.cafe24.com/category/%EA%B2%8C%EC%BD%94%EB%A5%98/67/',
    'AUTO_WEB',
    false
  ),
  (
    '줄스',
    'https://ehddud3.cafe24.com/product/list.html?cate_no=31',
    'AUTO_WEB',
    false
  ),
  (
    '더쥬 송파점',
    'https://gjwnddnjs123.cafe24.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/59/',
    'AUTO_WEB',
    false
  ),
  (
    '곤충하모니',
    'https://xn--699at5i1sh8pu9yi.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/162/',
    'AUTO_WEB',
    false
  ),
  (
    '헬로게코',
    'https://hellogcekogood.com/24',
    'AUTO_WEB',
    false
  )
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type;

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
  general_shops_a_request_id bigint;
  general_shops_b_request_id bigint;
  general_shops_c_request_id bigint;
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

  select net.http_post(
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object(
      'limit', shop_limit,
      'sites', jsonb_build_array('myage', 'iceage', 'themonster', 'thedragon')
    ),
    timeout_milliseconds := 600000
  ) into general_shops_a_request_id;

  select net.http_post(
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object(
      'limit', shop_limit,
      'sites', jsonb_build_array('thezoo', 'thezoosongpa')
    ),
    timeout_milliseconds := 600000
  ) into general_shops_b_request_id;

  select net.http_post(
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object(
      'limit', shop_limit,
      'sites', jsonb_build_array('insectharmony', 'jules', 'hellogecko')
    ),
    timeout_milliseconds := 600000
  ) into general_shops_c_request_id;

  return array[
    feedle_request_id,
    core_shops_request_id,
    domestic_shops_a_request_id,
    domestic_shops_b_request_id,
    general_shops_a_request_id,
    general_shops_b_request_id,
    general_shops_c_request_id
  ];
end;
$function$;

revoke all on function public.invoke_scheduled_collectors(integer)
from public, anon, authenticated, service_role;
grant execute on function public.invoke_scheduled_collectors(integer)
to postgres;

comment on function public.invoke_scheduled_collectors(integer) is
  'Queues Feedle plus six bounded public-shop batches at 09:00 and 18:00 Asia/Seoul so large domestic catalogs stay isolated on the free-tier Edge runtime.';
