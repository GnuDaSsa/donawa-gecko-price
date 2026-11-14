-- 오래된 ACTIVE 매물 재확인(reaper).
--
-- 배경: 수집기는 매 실행마다 "가장 새 상품 N건"만 훑기 때문에, 판매 완료되거나
-- 삭제된 매물이 ACTIVE로 남는다. 실제로 kiwo.kr/product/15532는 HTTP 410,
-- xn--9m1b023b.com의 한 상품은 HTTP 404를 돌려주는데도 DB에는 ACTIVE로 남아
-- 있었다. 이 마이그레이션은 (1) 재확인용 인덱스, (2) 상태만 안전하게 바꾸는
-- RPC, (3) 매일 도는 cron 트리거를 추가한다.

-- 1) last_checked_at 오름차순으로 ACTIVE만 훑는 부분 인덱스.
create index if not exists listings_stale_active_recheck_idx
  on public.listings (last_checked_at)
  where status = 'ACTIVE';

-- 2) 재확인 전용 상태 전이 RPC.
--
-- apply_listing_observation은 제목·가격·이미지까지 전부 덮어쓰므로, "상품이
-- 사라졌다" 또는 "이번 확인은 판정 불가"처럼 상태만 다루는 결과에는 과하다.
-- 이 함수는 상태와 last_checked_at만 다루고, 실제로 상태가 바뀔 때만
-- listing_status_history에 기록을 남긴다.
create or replace function public.mark_listing_status(
  p_listing_id uuid,
  p_status text,
  p_reason text default null,
  p_observed_at timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_status text;
begin
  if p_status is null or p_status not in ('ACTIVE', 'SOLD', 'DELETED', 'STALE', 'UNKNOWN') then
    raise exception 'Unsupported recheck status: %', coalesce(p_status, 'null');
  end if;

  select status
    into v_old_status
  from public.listings
  where id = p_listing_id
  for update;

  if v_old_status is null then
    raise exception 'Listing % not found', p_listing_id;
  end if;

  -- DELETED는 종착 상태다. 상품 페이지가 되살아난 경우는 수집기의
  -- apply_listing_observation 경로로만 ACTIVE가 될 수 있다.
  if v_old_status = 'DELETED' and p_status <> 'DELETED' then
    return v_old_status;
  end if;

  if p_status is distinct from v_old_status then
    insert into public.listing_status_history (
      listing_id, old_status, new_status, observed_at, reason
    ) values (
      p_listing_id, v_old_status, p_status, p_observed_at,
      left(coalesce(p_reason, 'stale recheck'), 200)
    );
  end if;

  update public.listings
  set status = p_status,
      last_checked_at = p_observed_at,
      sold_detected_at = case
        when p_status = 'SOLD' and v_old_status <> 'SOLD' then p_observed_at
        else sold_detected_at
      end
  where id = p_listing_id;

  return p_status;
end;
$$;

revoke all on function public.mark_listing_status(uuid, text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.mark_listing_status(uuid, text, text, timestamptz)
to service_role;

-- 3) 매일 한 번, Vault 비밀로 보호된 재확인 호출. 기존 09:00/18:00 KST 수집
--    배치보다 앞선 05:40 KST에 돌려 그날의 "현재 매물"을 정리해 둔다.
create or replace function public.invoke_stale_listing_reaper(
  p_limit integer default 40
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
  shops_request_id bigint;
  feedle_request_id bigint;
begin
  safe_limit := greatest(1, least(coalesce(p_limit, 40), 40));

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
    url := project_url || '/functions/v1/collect-public-shops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object('mode', 'recheck_stale', 'limit', safe_limit),
    timeout_milliseconds := 600000
  ) into shops_request_id;

  select net.http_post(
    url := project_url || '/functions/v1/collect-feedle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object('mode', 'recheck_stale', 'limit', safe_limit),
    timeout_milliseconds := 600000
  ) into feedle_request_id;

  return array[shops_request_id, feedle_request_id];
end;
$function$;

revoke all on function public.invoke_stale_listing_reaper(integer)
from public, anon, authenticated, service_role;
grant execute on function public.invoke_stale_listing_reaper(integer)
to postgres;

select cron.schedule(
  'donawa-stale-listing-reaper-daily-kst-0540',
  '40 20 * * *',
  $cron$select public.invoke_stale_listing_reaper(40);$cron$
);

comment on function public.mark_listing_status(uuid, text, text, timestamptz) is
  '재확인(reaper) 전용 상태 전이. 상태와 last_checked_at만 갱신하고, 실제 변경에만 이력을 남긴다. DELETED는 되돌리지 않는다.';

comment on function public.invoke_stale_listing_reaper(integer) is
  '오래된 ACTIVE 매물 재확인을 매일 05:40 Asia/Seoul에 큐잉한다. 회당 최대 40건, 삭제(404/410)·명시적 판매완료만 상태를 바꾸고 일시 장애는 상태를 유지한다.';

comment on index public.listings_stale_active_recheck_idx is
  '재확인 대기열: ACTIVE 매물을 last_checked_at 오름차순으로 훑기 위한 부분 인덱스.';
