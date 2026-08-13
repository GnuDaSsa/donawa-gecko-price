alter table public.source_candidates
  drop constraint source_candidates_provider_check;

alter table public.source_candidates
  add constraint source_candidates_provider_check
  check (provider in ('NAVER_WEB_SEARCH', 'CODEX_WEB_SEARCH'));

alter table public.source_discovery_runs
  drop constraint source_discovery_runs_provider_check;

alter table public.source_discovery_runs
  add constraint source_discovery_runs_provider_check
  check (provider in ('NAVER_WEB_SEARCH', 'CODEX_WEB_SEARCH'));

comment on column public.source_candidates.provider is
  'Discovery channel: official Naver Web Search API or the scheduled Codex web-search audit.';
