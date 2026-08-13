-- Social/expo search is used only for candidate discovery. A shop enters the
-- price collector after its own public site independently proves robots access,
-- a fixed-price crested-gecko product surface, sale state, and an official
-- business location. Social snippets and event posts never become listing rows.
insert into public.platforms (name, homepage_url, collector_type, is_active)
values
  (
    '타란센터',
    'https://tarancenter.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/85/',
    'AUTO_WEB',
    false
  ),
  (
    '렙타일스토어',
    'https://www.reptilestore.co.kr/product/list.html?cate_no=98',
    'AUTO_WEB',
    false
  ),
  (
    '크레리즘 인천청라점',
    'https://sites.google.com/view/phachungkrerismincheon',
    'MANUAL',
    false
  ),
  (
    '낭게코',
    'https://sites.google.com/view/pachunglyusyab',
    'MANUAL',
    false
  )
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type;

with location_seed(
  platform_name, name, location_type, road_address, region_label,
  latitude, longitude, coordinate_accuracy, coordinate_source,
  visit_policy, evidence_url
) as (
  values
    (
      '타란센터', '타란센터', 'STORE',
      '서울특별시 강북구 한천로140길 59 1층', '서울 강북',
      37.641446::numeric, 127.028422::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM',
      'CONFIRM_REQUIRED', 'https://tarancenter.com/shopinfo/company.html'
    ),
    (
      '렙타일스토어', '렙타일스토어 광주점', 'STORE',
      '광주광역시 동구 독립로 292 지하 1층', '광주 동구',
      35.155922::numeric, 126.913060::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM',
      'CONFIRM_REQUIRED', 'https://www.reptilestore.co.kr/shopinfo/company.html'
    ),
    (
      '크레리즘 인천청라점', '크레리즘 인천청라점', 'STORE',
      '인천광역시 서구 청라에메랄드로 79 2층 A-68호', '인천 서구 청라',
      37.532377::numeric, 126.655990::numeric, 'ROOFTOP', 'OPENSTREETMAP_NOMINATIM',
      'CONFIRM_REQUIRED', 'https://sites.google.com/view/phachungkrerismincheon'
    ),
    (
      '낭게코', '낭게코', 'STORE',
      '대전광역시 서구 대덕대로233번길 17', '대전 서구',
      36.353584::numeric, 127.378011::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM',
      'CONFIRM_REQUIRED', 'https://sites.google.com/view/pachunglyusyab'
    )
)
insert into public.shop_locations (
  platform_id, name, location_type, road_address, region_label,
  latitude, longitude, coordinate_accuracy, coordinate_source,
  visit_policy, inventory_scope, evidence_url, verified_at
)
select
  p.id, s.name, s.location_type, s.road_address, s.region_label,
  s.latitude, s.longitude, s.coordinate_accuracy, s.coordinate_source,
  s.visit_policy, 'PLATFORM_ONLINE', s.evidence_url,
  '2026-08-10T23:30:00+09:00'::timestamptz
from location_seed s
join public.platforms p on p.name = s.platform_name
on conflict (platform_id, name) do update set
  location_type = excluded.location_type,
  road_address = excluded.road_address,
  region_label = excluded.region_label,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  coordinate_accuracy = excluded.coordinate_accuracy,
  coordinate_source = excluded.coordinate_source,
  visit_policy = excluded.visit_policy,
  inventory_scope = excluded.inventory_scope,
  evidence_url = excluded.evidence_url,
  verified_at = excluded.verified_at,
  is_active = true;

insert into public.source_candidates (
  hostname, example_url, discovery_title, discovery_query, provider,
  robots_status, platform_hint, status, rejection_reason, evidence,
  last_checked_at
)
values
  (
    'www.reptilestore.co.kr',
    'https://www.reptilestore.co.kr/product/list.html?cate_no=98',
    '렙타일스토어 광주점',
    'SNS·박람회·국내 파충류샵 교차검색',
    'CODEX_WEB_SEARCH',
    'ALLOWED',
    'CAFE24',
    'ONBOARDED',
    null,
    jsonb_build_object(
      'channels', jsonb_build_array('WEB_SEARCH', 'EXPO_RELATED_SEARCH'),
      'official_location_url', 'https://www.reptilestore.co.kr/shopinfo/company.html',
      'category_url', 'https://www.reptilestore.co.kr/product/list.html?cate_no=98',
      'verification', 'official address, allowed robots, public product JSON-LD, exact fixed price and sale state'
    ),
    now()
  )
on conflict (hostname) do update set
  example_url = excluded.example_url,
  discovery_title = excluded.discovery_title,
  discovery_query = excluded.discovery_query,
  robots_status = excluded.robots_status,
  platform_hint = excluded.platform_hint,
  status = excluded.status,
  rejection_reason = null,
  evidence = excluded.evidence,
  last_checked_at = excluded.last_checked_at,
  last_seen_at = now(),
  times_seen = public.source_candidates.times_seen + 1;

update public.source_candidates
set
  status = 'ONBOARDED',
  rejection_reason = null,
  evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
    'channels', jsonb_build_array('WEB_SEARCH', 'INSTAGRAM_PROFILE', 'OFFICIAL_SITE'),
    'instagram_url', 'https://www.instagram.com/taran_center/',
    'official_location_url', 'https://tarancenter.com/shopinfo/company.html',
    'category_url', 'https://tarancenter.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/85/',
    'verification', 'official address, allowed robots, public product JSON-LD, exact fixed price and sale state'
  ),
  last_checked_at = now(),
  updated_at = now()
where hostname = 'tarancenter.com';

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

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'donawa_project_url';

  select decrypted_secret into collector_secret
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
        'jurassic', 'newrunnatural', 'thesafari', 'thereptile', 'zooseyo'
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
      'sites', jsonb_build_array('thebreeders', 'bestfarm', 'newrunwild', 'frienzoo')
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
      'sites', jsonb_build_array(
        'insectharmony', 'jules', 'hellogecko', 'tarancenter', 'reptilestore'
      )
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
  'Queues Feedle plus six bounded public-shop batches at 09:00 and 18:00 Asia/Seoul; social/expo discovery never writes listings, while reviewed Taran Center and Reptile Store public catalogs join the final bounded batch.';
