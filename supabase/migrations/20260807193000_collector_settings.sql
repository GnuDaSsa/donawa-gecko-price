create table public.collector_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.collector_settings enable row level security;

revoke all on public.collector_settings from public, anon, authenticated;
grant select on public.collector_settings to service_role;
