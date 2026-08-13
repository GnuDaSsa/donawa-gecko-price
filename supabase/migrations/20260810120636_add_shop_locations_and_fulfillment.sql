create table public.shop_locations (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  location_type text not null
    check (location_type in ('STORE', 'SHOWROOM', 'PICKUP_POINT', 'BUSINESS_ADDRESS')),
  road_address text not null check (char_length(road_address) between 5 and 240),
  region_label text not null check (char_length(region_label) between 2 and 80),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  coordinate_accuracy text not null default 'UNVERIFIED'
    check (coordinate_accuracy in ('ROOFTOP', 'STREET', 'DISTRICT', 'UNVERIFIED')),
  coordinate_source text
    check (coordinate_source is null or coordinate_source in ('OPENSTREETMAP_NOMINATIM', 'OFFICIAL_MAP')),
  visit_policy text not null default 'CONFIRM_REQUIRED'
    check (visit_policy in ('WALK_IN', 'APPOINTMENT', 'CONFIRM_REQUIRED')),
  inventory_scope text not null default 'PLATFORM_ONLINE'
    check (inventory_scope in ('PLATFORM_ONLINE', 'LOCATION_CONFIRMED')),
  evidence_url text not null check (evidence_url ~ '^https://'),
  verified_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_id, name),
  check (
    (latitude is null and longitude is null and coordinate_accuracy = 'UNVERIFIED' and coordinate_source is null)
    or
    (
      latitude between -90 and 90
      and longitude between -180 and 180
      and coordinate_accuracy <> 'UNVERIFIED'
      and coordinate_source is not null
    )
  )
);

create index shop_locations_platform_active_idx
  on public.shop_locations (platform_id)
  where is_active;

create trigger shop_locations_set_updated_at before update
on public.shop_locations
for each row execute function public.set_updated_at();

create table public.platform_fulfillment_options (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete cascade,
  mode text not null
    check (mode in (
      'STORE_PICKUP',
      'PARCEL',
      'REGISTERED_MAIL',
      'EXPRESS_BUS',
      'QUICK',
      'SPECIALIZED_COURIER'
    )),
  availability text not null
    check (availability in ('AVAILABLE', 'NOT_AVAILABLE', 'CONFIRM_REQUIRED')),
  applies_to text not null
    check (applies_to in ('LIVE_ANIMAL', 'ALL_PRODUCTS', 'SUPPLIES_ONLY')),
  summary text not null check (char_length(summary) between 1 and 300),
  evidence_url text not null check (evidence_url ~ '^https://'),
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_id, mode, applies_to)
);

create index platform_fulfillment_options_platform_idx
  on public.platform_fulfillment_options (platform_id);

create trigger platform_fulfillment_options_set_updated_at before update
on public.platform_fulfillment_options
for each row execute function public.set_updated_at();

alter table public.shop_locations enable row level security;
alter table public.platform_fulfillment_options enable row level security;

create policy "public read active shop locations"
on public.shop_locations for select
to anon, authenticated
using (is_active);

create policy "public read fulfillment options"
on public.platform_fulfillment_options for select
to anon, authenticated
using (true);

revoke all on public.shop_locations, public.platform_fulfillment_options
from public, anon, authenticated;
grant select on public.shop_locations, public.platform_fulfillment_options
to anon, authenticated;
grant select, insert, update, delete
on public.shop_locations, public.platform_fulfillment_options
to service_role;

with location_seed(
  platform_name, name, location_type, road_address, region_label,
  latitude, longitude, coordinate_accuracy, coordinate_source,
  visit_policy, evidence_url
) as (
  values
    ('곤충하모니', '곤충하모니', 'STORE', '경기도 성남시 분당구 성남대로926번길 12 금탑프라자 201호', '경기 성남 분당', 37.412820::numeric, 127.129799::numeric, 'ROOFTOP', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://xn--699at5i1sh8pu9yi.com/about.html'),
    ('뉴런내추럴', '뉴런내추럴', 'BUSINESS_ADDRESS', '경기도 성남시 수정구 태평동 7168-12 1층', '경기 성남 수정', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://newrunnatural.co.kr/shopinfo/company.html'),
    ('뉴런렙박스', '뉴런렙박스', 'BUSINESS_ADDRESS', '광주광역시 서구 화운로100번길 6-1 스타팰리스빌딩 1층', '광주 서구', 35.149402::numeric, 126.880883::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://thereptile.co.kr/shopinfo/company.html'),
    ('뉴런렙타일', '뉴런렙타일 일산점', 'STORE', '경기도 고양시 일산동구 강촌로26번길 7-4 1층', '경기 고양 일산동구', 37.646382::numeric, 126.779669::numeric, 'ROOFTOP', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://newrunreptile.co.kr/shopinfo/company.html'),
    ('뉴런렙타일', '뉴런렙타일 부천점', 'STORE', '경기도 부천시 상동 575-1 1층', '경기 부천', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://newrunreptile.co.kr/shopinfo/company.html'),
    ('뉴런와일드', '뉴런와일드', 'BUSINESS_ADDRESS', '경기도 고양시 일산동구 성석동 996-3', '경기 고양 일산동구', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://newrunwild.co.kr/shopinfo/company.html'),
    ('뉴런쥬라기', '뉴런쥬라기', 'BUSINESS_ADDRESS', '대구광역시 중구 태평로2가 24-1 1층', '대구 중구', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://thejurassic.co.kr/shopinfo/company.html'),
    ('더드래곤', '더드래곤', 'BUSINESS_ADDRESS', '서울특별시 강서구 양천로47나길 48-7 지하 1층', '서울 강서', 37.572049::numeric, 126.839487::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://thedragon1.cafe24.com/shopinfo/company.html'),
    ('더몬스터', '더몬스터', 'BUSINESS_ADDRESS', '경기도 화성시 동탄대로21가길 14-11 1층', '경기 화성 동탄', 37.206258::numeric, 127.097344::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://themonster.co.kr/shopinfo/company.html'),
    ('더베스트팜', '더베스트팜', 'BUSINESS_ADDRESS', '서울특별시 관악구 봉천로41길 34 B1', '서울 관악', 37.484175::numeric, 126.948414::numeric, 'ROOFTOP', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://www.thebestfarm.kr/shopinfo/company.html'),
    ('더브리더스', '더브리더스', 'STORE', '인천광역시 부평구 길주남로 157 태성프라자 4층', '인천 부평', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://thebreeders.cafe24.com/shopinfo/company.html'),
    ('더사파리', '더사파리', 'BUSINESS_ADDRESS', '부산광역시 연제구 중앙대로1054번길 13 동원룸빌라 지하 1층', '부산 연제', 35.182142::numeric, 129.079796::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://thesafari.kr/shopinfo/company.html'),
    ('더쥬', '더쥬 군포본점', 'STORE', '경기도 군포시 공단로 296 4층', '경기 군포', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://xn--9m1b023b.com/shopinfo/company.html'),
    ('더쥬 송파점', '더쥬 송파점', 'STORE', '서울특별시 송파구 중대로16길 12 지하 1층', '서울 송파', 37.495634::numeric, 127.125980::numeric, 'STREET', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://gjwnddnjs123.cafe24.com/shopinfo/company.html'),
    ('도심속도마뱀', '도심속도마뱀', 'STORE', '서울특별시 구로구 구로동로 214 2층', '서울 구로', 37.497762::numeric, 126.883524::numeric, 'ROOFTOP', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://myage.co.kr/shopinfo/company.html'),
    ('빙하기', '빙하기', 'BUSINESS_ADDRESS', '경기도 수원시 영통구 신원로294번길 40-20 지하 1층', '경기 수원 영통', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://iceagereptile.com/shopinfo/company.html'),
    ('프랜쥬', '프랜쥬', 'BUSINESS_ADDRESS', '경상북도 포항시 북구 중앙로 288 2층·3층', '경북 포항 북구', null, null, 'UNVERIFIED', null, 'CONFIRM_REQUIRED', 'https://frienzoo.com/shopinfo/company.html'),
    ('헬로게코', '헬로게코', 'STORE', '경기도 남양주시 다산중앙로123번길 22-56 다산중원듀플렉스 3층 301호', '경기 남양주 다산', 37.624964::numeric, 127.151234::numeric, 'ROOFTOP', 'OPENSTREETMAP_NOMINATIM', 'CONFIRM_REQUIRED', 'https://hellogcekogood.com/?mode=privacy')
)
insert into public.shop_locations (
  platform_id, name, location_type, road_address, region_label,
  latitude, longitude, coordinate_accuracy, coordinate_source,
  visit_policy, inventory_scope, evidence_url, verified_at
)
select
  p.id, s.name, s.location_type, s.road_address, s.region_label,
  s.latitude, s.longitude, s.coordinate_accuracy, s.coordinate_source,
  s.visit_policy, 'PLATFORM_ONLINE', s.evidence_url, '2026-08-10T19:45:00+09:00'::timestamptz
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

with fulfillment_seed(
  platform_name, mode, availability, applies_to, summary, evidence_url
) as (
  values
    ('곤충하모니', 'PARCEL', 'NOT_AVAILABLE', 'LIVE_ANIMAL', '파충류·양서류 생물은 일반 택배로 발송하지 않는다고 명시합니다.', 'https://xn--699at5i1sh8pu9yi.com/shopinfo/guide.html'),
    ('곤충하모니', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '성남종합버스터미널 발송을 기본으로 하며 추가 비용과 터미널 조율이 필요합니다.', 'https://xn--699at5i1sh8pu9yi.com/shopinfo/guide.html'),
    ('곤충하모니', 'QUICK', 'AVAILABLE', 'LIVE_ANIMAL', '오토바이·다마스·지하철 퀵을 착불로 안내합니다.', 'https://xn--699at5i1sh8pu9yi.com/shopinfo/guide.html'),
    ('뉴런렙박스', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '공식 배송·포장 카테고리에 고속버스 택배 결제 항목이 있습니다.', 'https://thereptile.co.kr/product/list.html?cate_no=130'),
    ('뉴런렙타일', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '공식 사이트에 고속버스택배 이용 결제창이 별도로 제공됩니다.', 'https://newrunreptile.co.kr/shopinfo/company.html'),
    ('뉴런와일드', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '공식 사이트에 고속버스택배 결제·추가물품 항목이 제공됩니다.', 'https://newrunwild.co.kr/shopinfo/company.html'),
    ('더브리더스', 'PARCEL', 'CONFIRM_REQUIRED', 'ALL_PRODUCTS', '공식 이용안내에는 우체국 일반 택배가 있으나 생물 적용 여부는 주문 전에 확인해야 합니다.', 'https://thebreeders.cafe24.com/shopinfo/guide.html'),
    ('더브리더스', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '고속버스터미널 택배를 선불 방식으로 안내하며 주문 전 연락을 요구합니다.', 'https://thebreeders.cafe24.com/shopinfo/guide.html'),
    ('더브리더스', 'QUICK', 'AVAILABLE', 'LIVE_ANIMAL', '수도권 지하철 택배와 퀵서비스를 착불·사전조율 방식으로 안내합니다.', 'https://thebreeders.cafe24.com/shopinfo/guide.html'),
    ('더브리더스', 'STORE_PICKUP', 'CONFIRM_REQUIRED', 'LIVE_ANIMAL', '매장 방문 결제 문구는 확인되지만 개체 재고와 픽업 가능 여부는 방문 전 확인이 필요합니다.', 'https://thebreeders.cafe24.com/shopinfo/guide.html'),
    ('더쥬', 'PARCEL', 'NOT_AVAILABLE', 'LIVE_ANIMAL', '파충류는 일반 택배가 불가하다고 명시합니다.', 'https://xn--9m1b023b.com/shopinfo/guide.html'),
    ('더쥬', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '생물 입양은 고속버스 택배 또는 퀵서비스를 원칙으로 안내합니다.', 'https://xn--9m1b023b.com/shopinfo/guide.html'),
    ('더쥬', 'QUICK', 'AVAILABLE', 'LIVE_ANIMAL', '생물 입양 퀵서비스를 착불·일정 조율 방식으로 안내합니다.', 'https://xn--9m1b023b.com/shopinfo/guide.html'),
    ('더쥬', 'STORE_PICKUP', 'AVAILABLE', 'LIVE_ANIMAL', '공식 수령방법 카테고리와 이용안내에 방문수령이 명시돼 있습니다.', 'https://xn--9m1b023b.com/shopinfo/guide.html'),
    ('더쥬 송파점', 'EXPRESS_BUS', 'AVAILABLE', 'LIVE_ANIMAL', '고속버스 택배는 유선 사전문의 방식으로 안내합니다.', 'https://gjwnddnjs123.cafe24.com/shopinfo/guide.html'),
    ('더쥬 송파점', 'QUICK', 'AVAILABLE', 'LIVE_ANIMAL', '오토바이·다마스 퀵을 사전문의 방식으로 안내합니다.', 'https://gjwnddnjs123.cafe24.com/shopinfo/guide.html'),
    ('더쥬 송파점', 'SPECIALIZED_COURIER', 'AVAILABLE', 'LIVE_ANIMAL', '렙타일 익스프레스 전문 배송을 별도 수령 방식으로 안내합니다.', 'https://gjwnddnjs123.cafe24.com/shopinfo/guide.html'),
    ('더쥬 송파점', 'STORE_PICKUP', 'AVAILABLE', 'LIVE_ANIMAL', '방문수령을 공식 수령 방식으로 안내합니다.', 'https://gjwnddnjs123.cafe24.com/shopinfo/guide.html'),
    ('도심속도마뱀', 'SPECIALIZED_COURIER', 'AVAILABLE', 'LIVE_ANIMAL', '공식 사이트가 파충류·양서류 전문 배송 업체 이용을 안내합니다.', 'https://myage.co.kr/'),
    ('키워', 'SPECIALIZED_COURIER', 'AVAILABLE', 'LIVE_ANIMAL', '공식 사이트가 특수동물 전문 배송 업체를 통한 사계절 입양을 안내합니다.', 'https://kiwo.kr/'),
    ('프랜쥬', 'EXPRESS_BUS', 'CONFIRM_REQUIRED', 'LIVE_ANIMAL', '공식 사이트에 호텔링·고속버스택배 메뉴가 있으나 일정과 대상은 사전 확인이 필요합니다.', 'https://frienzoo.com/shopinfo/company.html')
)
insert into public.platform_fulfillment_options (
  platform_id, mode, availability, applies_to, summary, evidence_url, verified_at
)
select
  p.id, s.mode, s.availability, s.applies_to, s.summary, s.evidence_url,
  '2026-08-10T19:45:00+09:00'::timestamptz
from fulfillment_seed s
join public.platforms p on p.name = s.platform_name
on conflict (platform_id, mode, applies_to) do update set
  availability = excluded.availability,
  summary = excluded.summary,
  evidence_url = excluded.evidence_url,
  verified_at = excluded.verified_at;

comment on table public.shop_locations is
  'Evidence-backed public business/store locations only. User GPS is never stored here or sent to the database.';
comment on column public.shop_locations.inventory_scope is
  'PLATFORM_ONLINE means joined listings are seller-wide online inventory, not verified branch stock.';
comment on column public.shop_locations.coordinate_accuracy is
  'ROOFTOP/STREET are cached one-time geocodes; UNVERIFIED locations are excluded from GPS distance ranking.';
comment on table public.platform_fulfillment_options is
  'Evidence-backed fulfillment modes. Generic parcel guidance is not treated as live-animal delivery unless applies_to says LIVE_ANIMAL.';
