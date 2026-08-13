-- Location-directory coverage is intentionally independent from price-source
-- coverage. These rows are sourced from the brand's own public store page and
-- do not create listings, prices, or a collector for dear-rep.com.
insert into public.platforms (name, homepage_url, collector_type, is_active)
values (
  '디어렙',
  'https://dear-rep.com/store',
  'MANUAL',
  false
)
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type;

with location_seed(
  name, road_address, region_label, latitude, longitude, coordinate_accuracy
) as (
  values
    (
      '디어렙 본점',
      '대전광역시 유성구 은구비남로7번길 48-19 1층',
      '대전 유성',
      36.374739::numeric,
      127.316948::numeric,
      'ROOFTOP'
    ),
    (
      '디어렙 세종보람점',
      '세종특별자치시 남세종로 450 2층 207호',
      '세종 보람',
      36.477417::numeric,
      127.290102::numeric,
      'ROOFTOP'
    ),
    (
      '디어렙 공주점',
      '충청남도 공주시 무령로 599-25 3층 2호',
      '충남 공주',
      36.472832::numeric,
      127.154124::numeric,
      'STREET'
    ),
    (
      '디어렙 당진수청점',
      '충청남도 당진시 수청2로 42 1동 5층 504호',
      '충남 당진',
      36.888383::numeric,
      126.657812::numeric,
      'STREET'
    ),
    (
      '디어렙 청주용암점',
      '충청북도 청주시 상당구 중고개로125번길 7 남송휴프라자 2층',
      '충북 청주 상당',
      36.616526::numeric,
      127.518696::numeric,
      'STREET'
    ),
    (
      '디어렙 천안성성점',
      '충청남도 천안시 서북구 성성11길 27 101호',
      '충남 천안 서북',
      36.843436::numeric,
      127.137392::numeric,
      'STREET'
    )
)
insert into public.shop_locations (
  platform_id,
  name,
  location_type,
  road_address,
  region_label,
  latitude,
  longitude,
  coordinate_accuracy,
  coordinate_source,
  visit_policy,
  inventory_scope,
  evidence_url,
  verified_at
)
select
  p.id,
  s.name,
  'STORE',
  s.road_address,
  s.region_label,
  s.latitude,
  s.longitude,
  s.coordinate_accuracy,
  'OPENSTREETMAP_NOMINATIM',
  'CONFIRM_REQUIRED',
  'PLATFORM_ONLINE',
  'https://dear-rep.com/store',
  '2026-08-13T20:02:15+09:00'::timestamptz
from location_seed s
join public.platforms p on p.name = '디어렙'
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

update public.source_candidates
set
  status = 'ONBOARDED',
  rejection_reason = null,
  evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
    'official_location_url', 'https://dear-rep.com/store',
    'official_store_count', 6,
    'official_store_regions', jsonb_build_array('대전', '세종', '공주', '당진', '청주', '천안'),
    'onboarded_scope', 'LOCATION_DIRECTORY_ONLY',
    'direct_fixed_price_catalog_on_candidate_domain', false,
    'price_collector_created', false
  ),
  last_checked_at = now(),
  updated_at = now()
where hostname = 'dear-rep.com';
