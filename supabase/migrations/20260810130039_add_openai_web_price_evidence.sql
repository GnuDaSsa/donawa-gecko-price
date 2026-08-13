alter table public.source_candidates
  drop constraint source_candidates_provider_check;

alter table public.source_candidates
  add constraint source_candidates_provider_check
  check (provider in ('NAVER_WEB_SEARCH', 'CODEX_WEB_SEARCH', 'OPENAI_WEB_SEARCH'));

alter table public.source_discovery_runs
  drop constraint source_discovery_runs_provider_check;

alter table public.source_discovery_runs
  add constraint source_discovery_runs_provider_check
  check (provider in ('NAVER_WEB_SEARCH', 'CODEX_WEB_SEARCH', 'OPENAI_WEB_SEARCH'));

alter table public.source_discovery_runs
  add column model text,
  add column search_calls integer not null default 0 check (search_calls >= 0),
  add column source_urls_seen integer not null default 0 check (source_urls_seen >= 0),
  add column usage jsonb not null default '{}'::jsonb check (jsonb_typeof(usage) = 'object');

create table public.price_evidence_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique check (source_url ~ '^https://'),
  hostname text not null check (hostname = lower(hostname)),
  platform_id uuid references public.platforms(id) on delete set null,
  provider text not null default 'OPENAI_WEB_SEARCH'
    check (provider in ('OPENAI_WEB_SEARCH')),
  model text not null check (char_length(model) between 1 and 80),
  response_id text check (response_id is null or char_length(response_id) between 1 and 160),
  search_query text not null check (char_length(search_query) between 1 and 500),
  title text not null check (char_length(title) between 1 and 240),
  claimed_price_krw integer not null check (claimed_price_krw between 1000 and 1000000000),
  claimed_status text not null check (claimed_status in ('ACTIVE', 'SOLD', 'UNKNOWN')),
  claimed_morph text,
  claimed_sex text check (claimed_sex is null or claimed_sex in ('MALE', 'FEMALE', 'UNKNOWN')),
  claimed_weight_g numeric(7, 2) check (claimed_weight_g is null or claimed_weight_g between 0 and 10000),
  model_confidence text not null check (model_confidence in ('HIGH', 'MEDIUM', 'LOW')),
  verification_status text not null default 'NEW'
    check (verification_status in ('NEW', 'VALIDATED', 'REJECTED', 'IMPORTED')),
  rejection_reason text,
  robots_status text not null default 'UNKNOWN'
    check (robots_status in ('ALLOWED', 'BLOCKED', 'UNKNOWN')),
  page_http_status integer check (page_http_status is null or page_http_status between 100 and 599),
  cited_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(cited_urls) = 'array'),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  times_seen integer not null default 1 check (times_seen > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index price_evidence_candidates_status_seen_idx
  on public.price_evidence_candidates (verification_status, last_seen_at desc);

create index price_evidence_candidates_host_idx
  on public.price_evidence_candidates (hostname, last_seen_at desc);

create trigger price_evidence_candidates_set_updated_at before update
on public.price_evidence_candidates
for each row execute function public.set_updated_at();

alter table public.price_evidence_candidates enable row level security;

revoke all on public.price_evidence_candidates
from public, anon, authenticated;

grant select, insert, update, delete
on public.price_evidence_candidates to service_role;

create or replace function public.invoke_openai_price_discovery()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  project_url text;
  collector_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'donawa_project_url';

  select decrypted_secret
  into collector_secret
  from vault.decrypted_secrets
  where name = 'donawa_collector_secret';

  if project_url is null or collector_secret is null then
    raise exception 'Donawa OpenAI price-discovery Vault secrets are not configured';
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/discover-public-sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object('mode', 'discover-openai'),
    timeout_milliseconds := 600000
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function public.invoke_openai_price_discovery()
from public, anon, authenticated, service_role;
grant execute on function public.invoke_openai_price_discovery() to postgres;

select cron.schedule(
  'donawa-openai-price-discovery-daily-kst-0410',
  '10 19 * * *',
  $cron$select public.invoke_openai_price_discovery();$cron$
);

comment on table public.price_evidence_candidates is
  'Private OpenAI web-research evidence queue. Model claims are never user-visible listings until deterministic source verification and separate collector onboarding/import.';

comment on column public.price_evidence_candidates.evidence is
  'Stores bounded verification booleans and source metadata only; never raw page bodies, search snippets, seller contacts, or model chain-of-thought.';

comment on function public.invoke_openai_price_discovery() is
  'Queues the credential-gated OpenAI Responses API web research daily at 04:10 Asia/Seoul. Missing OPENAI_API_KEY must yield an auditable SKIPPED run before any paid API call.';

comment on column public.source_candidates.provider is
  'Discovery channel: official Naver Web Search API, scheduled Codex web audit, or OpenAI Responses API web research.';
