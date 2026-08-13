create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  homepage_url text not null,
  collector_type text not null check (collector_type in ('AUTO_WEB', 'MANUAL', 'BROWSER_HELPER', 'CSV_IMPORT')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.morphs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ko text not null,
  name_en text,
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases) = 'array'),
  representative_image text,
  visible_on_home boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.traits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ko text not null,
  name_en text,
  trait_type text not null check (trait_type in ('PATTERN_DETAIL', 'EXPRESSION', 'COLOR', 'SPOT_DETAIL', 'OTHER')),
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases) = 'array'),
  is_filterable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id),
  external_id text,
  morph_id uuid references public.morphs(id),
  original_title text not null,
  original_description text,
  original_url text not null,
  image_url text,
  current_price bigint check (current_price is null or current_price >= 0),
  price_type text not null default 'UNKNOWN' check (price_type in ('FIXED', 'CONTACT', 'BUNDLE', 'AUCTION', 'UNKNOWN')),
  currency text not null default 'KRW' check (currency = 'KRW'),
  sex text not null default 'UNKNOWN' check (sex in ('MALE', 'FEMALE', 'UNKNOWN')),
  weight_g numeric(8, 2) check (weight_g is null or weight_g >= 0),
  bundle_count integer check (bundle_count is null or bundle_count > 0),
  status text not null default 'NEW' check (status in ('NEW', 'ACTIVE', 'SOLD', 'DELETED', 'STALE', 'UNKNOWN')),
  classification_source text not null default 'AUTO_KEYWORD' check (classification_source in ('AUTO_KEYWORD', 'MANUAL')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  sold_detected_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_id, original_url)
);

create unique index listings_platform_external_id_key
  on public.listings (platform_id, external_id)
  where external_id is not null;

create index listings_current_comparison_idx
  on public.listings (morph_id, platform_id, current_price)
  where status = 'ACTIVE' and price_type = 'FIXED' and current_price is not null;

create index listings_platform_id_idx on public.listings (platform_id);
create index listings_morph_id_idx on public.listings (morph_id);

create table public.listing_traits (
  listing_id uuid not null references public.listings(id) on delete cascade,
  trait_id uuid not null references public.traits(id),
  source_text text,
  created_at timestamptz not null default now(),
  primary key (listing_id, trait_id)
);

create index listing_traits_trait_id_idx on public.listing_traits (trait_id);

create table public.listing_price_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  price bigint not null check (price >= 0),
  observed_at timestamptz not null default now()
);

create index listing_price_history_listing_observed_idx
  on public.listing_price_history (listing_id, observed_at desc);

create table public.listing_status_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  old_status text not null check (old_status in ('NEW', 'ACTIVE', 'SOLD', 'DELETED', 'STALE', 'UNKNOWN')),
  new_status text not null check (new_status in ('NEW', 'ACTIVE', 'SOLD', 'DELETED', 'STALE', 'UNKNOWN')),
  observed_at timestamptz not null default now(),
  reason text
);

create index listing_status_history_listing_observed_idx
  on public.listing_status_history (listing_id, observed_at desc);

create table public.collector_runs (
  id bigint generated always as identity primary key,
  platform_id uuid not null references public.platforms(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'RUNNING' check (status in ('RUNNING', 'SUCCESS', 'FAILED')),
  listings_seen integer not null default 0,
  error_message text
);

create index collector_runs_platform_started_idx
  on public.collector_runs (platform_id, started_at desc);

create trigger platforms_set_updated_at before update on public.platforms
for each row execute function public.set_updated_at();
create trigger morphs_set_updated_at before update on public.morphs
for each row execute function public.set_updated_at();
create trigger traits_set_updated_at before update on public.traits
for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings
for each row execute function public.set_updated_at();

-- Collector/service-role helper. A collector failure must not call this function
-- to mass-change listing statuses; failure is recorded in collector_runs instead.
create or replace function public.apply_listing_observation(
  p_platform_id uuid,
  p_external_id text,
  p_morph_id uuid,
  p_original_title text,
  p_original_description text,
  p_original_url text,
  p_image_url text,
  p_current_price bigint,
  p_price_type text,
  p_sex text,
  p_weight_g numeric,
  p_bundle_count integer,
  p_status text,
  p_classification_source text,
  p_raw_data jsonb,
  p_observed_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_old_price bigint;
  v_old_status text;
begin
  select id, current_price, status
    into v_listing_id, v_old_price, v_old_status
  from public.listings
  where platform_id = p_platform_id
    and (
      (p_external_id is not null and external_id = p_external_id)
      or (p_external_id is null and original_url = p_original_url)
    )
  limit 1
  for update;

  if v_listing_id is null then
    insert into public.listings (
      platform_id, external_id, morph_id, original_title, original_description,
      original_url, image_url, current_price, price_type, sex, weight_g,
      bundle_count, status, classification_source, first_seen_at, last_seen_at,
      last_checked_at, sold_detected_at, raw_data
    ) values (
      p_platform_id, p_external_id, p_morph_id, p_original_title,
      p_original_description, p_original_url, p_image_url, p_current_price,
      p_price_type, p_sex, p_weight_g, p_bundle_count, p_status,
      p_classification_source, p_observed_at, p_observed_at, p_observed_at,
      case when p_status = 'SOLD' then p_observed_at else null end,
      coalesce(p_raw_data, '{}'::jsonb)
    ) returning id into v_listing_id;

    if p_current_price is not null then
      insert into public.listing_price_history (listing_id, price, observed_at)
      values (v_listing_id, p_current_price, p_observed_at);
    end if;

    if p_status <> 'NEW' then
      insert into public.listing_status_history (
        listing_id, old_status, new_status, observed_at, reason
      ) values (
        v_listing_id, 'NEW', p_status, p_observed_at, 'first confirmed observation'
      );
    end if;

    return v_listing_id;
  end if;

  if p_current_price is distinct from v_old_price and p_current_price is not null then
    insert into public.listing_price_history (listing_id, price, observed_at)
    values (v_listing_id, p_current_price, p_observed_at);
  end if;

  if p_status is distinct from v_old_status then
    insert into public.listing_status_history (
      listing_id, old_status, new_status, observed_at, reason
    ) values (
      v_listing_id, v_old_status, p_status, p_observed_at, 'collector observation'
    );
  end if;

  update public.listings
  set morph_id = p_morph_id,
      original_title = p_original_title,
      original_description = p_original_description,
      original_url = p_original_url,
      image_url = p_image_url,
      current_price = p_current_price,
      price_type = p_price_type,
      sex = p_sex,
      weight_g = p_weight_g,
      bundle_count = p_bundle_count,
      status = p_status,
      classification_source = p_classification_source,
      last_seen_at = p_observed_at,
      last_checked_at = p_observed_at,
      sold_detected_at = case
        when p_status = 'SOLD' and v_old_status <> 'SOLD' then p_observed_at
        else sold_detected_at
      end,
      raw_data = coalesce(p_raw_data, '{}'::jsonb)
  where id = v_listing_id;

  return v_listing_id;
end;
$$;

revoke all on function public.apply_listing_observation(
  uuid, text, uuid, text, text, text, text, bigint, text, text, numeric,
  integer, text, text, jsonb, timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_listing_observation(
  uuid, text, uuid, text, text, text, text, bigint, text, text, numeric,
  integer, text, text, jsonb, timestamptz
) to service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.platforms enable row level security;
alter table public.morphs enable row level security;
alter table public.traits enable row level security;
alter table public.listings enable row level security;
alter table public.listing_traits enable row level security;
alter table public.listing_price_history enable row level security;
alter table public.listing_status_history enable row level security;
alter table public.collector_runs enable row level security;

create policy "public read platforms" on public.platforms for select to anon, authenticated using (true);
create policy "public read morphs" on public.morphs for select to anon, authenticated using (true);
create policy "public read traits" on public.traits for select to anon, authenticated using (true);
create policy "public read listings" on public.listings for select to anon, authenticated using (true);
create policy "public read listing traits" on public.listing_traits for select to anon, authenticated using (true);
create policy "public read price history" on public.listing_price_history for select to anon, authenticated using (true);
create policy "public read status history" on public.listing_status_history for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on public.platforms, public.morphs, public.traits, public.listings,
  public.listing_traits, public.listing_price_history, public.listing_status_history
to anon, authenticated;
