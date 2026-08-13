create table public.source_candidates (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique check (hostname = lower(hostname)),
  example_url text not null check (example_url ~ '^https://'),
  discovery_title text not null default '',
  discovery_query text not null,
  provider text not null check (provider in ('NAVER_WEB_SEARCH')),
  robots_status text not null default 'UNKNOWN'
    check (robots_status in ('ALLOWED', 'BLOCKED', 'UNKNOWN')),
  platform_hint text not null default 'OTHER'
    check (platform_hint in ('CAFE24', 'IMWEB', 'OTHER')),
  status text not null default 'NEW'
    check (status in ('NEW', 'ELIGIBLE_REVIEW', 'REJECTED', 'ONBOARDED')),
  rejection_reason text,
  times_seen integer not null default 1 check (times_seen > 0),
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index source_candidates_status_seen_idx
  on public.source_candidates (status, last_seen_at desc);

create trigger source_candidates_set_updated_at before update
on public.source_candidates
for each row execute function public.set_updated_at();

create table public.source_discovery_runs (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('NAVER_WEB_SEARCH')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'RUNNING'
    check (status in ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED')),
  query_count integer not null default 0 check (query_count >= 0),
  results_seen integer not null default 0 check (results_seen >= 0),
  candidates_upserted integer not null default 0 check (candidates_upserted >= 0),
  eligible_count integer not null default 0 check (eligible_count >= 0),
  error_message text
);

create index source_discovery_runs_started_idx
  on public.source_discovery_runs (started_at desc);

alter table public.source_candidates enable row level security;
alter table public.source_discovery_runs enable row level security;

revoke all on public.source_candidates, public.source_discovery_runs
from public, anon, authenticated;
grant select, insert, update on public.source_candidates to service_role;
grant select, insert, update on public.source_discovery_runs to service_role;
grant usage, select on sequence public.source_discovery_runs_id_seq to service_role;

create or replace function public.invoke_source_discovery()
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
    raise exception 'Donawa source-discovery Vault secrets are not configured';
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/discover-public-sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-collector-secret', collector_secret
    ),
    body := jsonb_build_object('mode', 'discover'),
    timeout_milliseconds := 600000
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function public.invoke_source_discovery()
from public, anon, authenticated, service_role;
grant execute on function public.invoke_source_discovery() to postgres;

select cron.schedule(
  'donawa-source-discovery-daily-kst-0330',
  '30 18 * * *',
  $cron$select public.invoke_source_discovery();$cron$
);

comment on table public.source_candidates is
  'Private operational queue of newly discovered shop domains. Rows never become price-comparison platforms without a separate source review/onboarding decision.';

comment on table public.source_discovery_runs is
  'Auditable daily source-discovery executions, including explicit SKIPPED state when official search credentials are absent.';

comment on function public.invoke_source_discovery() is
  'Queues the protected source-discovery Edge Function daily at 03:30 Asia/Seoul through Vault-backed pg_net.';
