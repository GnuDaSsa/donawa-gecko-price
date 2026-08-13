insert into public.platforms (name, homepage_url, collector_type, is_active)
values ('마이브리더즈', 'https://mybreeders.com', 'AUTO_WEB', false)
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type;
