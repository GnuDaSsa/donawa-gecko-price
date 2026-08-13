-- Location coverage is reviewed independently from price-source coverage.
-- Every address below comes from the business's own public company/store page.
-- These platforms remain inactive and this migration creates no listings,
-- prices, fulfillment claims, or collector configuration.
insert into public.platforms (name, homepage_url, collector_type, is_active)
values
  ('크레팍스', 'https://katc2022.cafe24.com/', 'MANUAL', false),
  ('뉴런네이처', 'https://nature01321.cafe24.com/', 'MANUAL', false),
  ('크레팩토리', 'https://crefactory.cafe24.com/', 'MANUAL', false),
  ('크레산도 수성점', 'https://cresando.co.kr/', 'MANUAL', false),
  ('게코몽', 'https://geckomong.com/', 'MANUAL', false),
  ('나슨', 'https://www.nasnhada.com/', 'MANUAL', false),
  ('게코스토리', 'https://geckostory.com/', 'MANUAL', false),
  ('마린렙타일', 'https://www.marinereptile.com/', 'MANUAL', false),
  ('게코홀릭', 'https://geckoholic.co.kr/', 'MANUAL', false),
  ('발토앤제이', 'https://www.baltonj.com/', 'MANUAL', false)
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type;

with location_seed(
  platform_name, name, location_type, road_address, region_label,
  visit_policy, evidence_url
) as (
  values
    (
      '크레팍스',
      '크레팍스',
      'BUSINESS_ADDRESS',
      '경기도 고양시 일산서구 송포로391번길 77 다동',
      '경기 고양 일산서구',
      'CONFIRM_REQUIRED',
      'https://katc2022.cafe24.com/'
    ),
    (
      '뉴런네이처',
      '뉴런네이처',
      'STORE',
      '경기도 화성시 반송동 128-4 1층',
      '경기 화성 동탄',
      'CONFIRM_REQUIRED',
      'https://nature01321.cafe24.com/shopinfo/company.html'
    ),
    (
      '크레팩토리',
      '크레팩토리',
      'BUSINESS_ADDRESS',
      '대전광역시 동구 동중앙로 112-14 2층 2호',
      '대전 동구',
      'CONFIRM_REQUIRED',
      'https://crefactory.cafe24.com/shopinfo/company.html'
    ),
    (
      '크레산도 수성점',
      '크레산도 수성점',
      'STORE',
      '대구광역시 수성구 알파시티2로3길 48-11 1층 101호',
      '대구 수성',
      'CONFIRM_REQUIRED',
      'https://cresando.co.kr/shopinfo/company.html'
    ),
    (
      '게코몽',
      '게코몽',
      'BUSINESS_ADDRESS',
      '인천광역시 서구 검단로326번길 47-11',
      '인천 서구',
      'CONFIRM_REQUIRED',
      'https://geckomong.com/about.html'
    ),
    (
      '나슨',
      '나슨 판교',
      'BUSINESS_ADDRESS',
      '경기도 성남시 분당구 판교역로 136 힐스테이트판교역 상가동 B2110호',
      '경기 성남 분당',
      'CONFIRM_REQUIRED',
      'https://www.nasnhada.com/'
    ),
    (
      '게코스토리',
      '게코스토리',
      'BUSINESS_ADDRESS',
      '경기도 고양시 덕양구 향동로 201 GL매트로시티 607호',
      '경기 고양 덕양',
      'CONFIRM_REQUIRED',
      'https://geckostory.com/'
    ),
    (
      '마린렙타일',
      '마린렙타일',
      'STORE',
      '경상남도 김해시 전하로304번길 27 형제빌딩 4층',
      '경남 김해',
      'CONFIRM_REQUIRED',
      'https://www.marinereptile.com/'
    ),
    (
      '게코홀릭',
      '게코홀릭',
      'STORE',
      '경기도 양평군 강하면 운포1길 68-13 1층',
      '경기 양평',
      'CONFIRM_REQUIRED',
      'https://geckoholic.co.kr/'
    ),
    (
      '발토앤제이',
      '발토앤제이',
      'BUSINESS_ADDRESS',
      '경기도 고양시 일산서구 가좌동 55-10 3층',
      '경기 고양 일산서구',
      'CONFIRM_REQUIRED',
      'https://www.baltonj.com/'
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
  s.location_type,
  s.road_address,
  s.region_label,
  null,
  null,
  'UNVERIFIED',
  null,
  s.visit_policy,
  'LOCATION_CONFIRMED',
  s.evidence_url,
  '2026-08-13T20:37:05+09:00'::timestamptz
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

-- Preserve each domain's price-source review status. Location onboarding does
-- not make a domain eligible for price collection.
update public.source_candidates
set
  evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
    'official_location_verified', true,
    'onboarded_scope', 'LOCATION_DIRECTORY_ONLY',
    'price_collector_created', false
  ),
  last_checked_at = now(),
  updated_at = now()
where hostname in (
  'katc2022.cafe24.com',
  'nature01321.cafe24.com',
  'crefactory.cafe24.com',
  'cresando.co.kr',
  'geckomong.com',
  'nasnhada.com',
  'geckostory.com',
  'marinereptile.com',
  'geckoholic.co.kr',
  'baltonj.com'
);
