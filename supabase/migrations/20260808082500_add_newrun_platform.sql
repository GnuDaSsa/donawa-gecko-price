insert into public.platforms (name, homepage_url, collector_type, is_active)
values (
  '뉴런렙타일',
  'https://newrunreptile.co.kr/product/list.html?cate_no=197',
  'AUTO_WEB',
  false
)
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type;
