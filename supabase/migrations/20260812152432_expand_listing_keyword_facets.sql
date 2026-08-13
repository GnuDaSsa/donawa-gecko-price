insert into public.traits (slug, name_ko, name_en, trait_type, aliases, is_filterable)
values
  ('normal', '노멀', 'Normal', 'OTHER', '["노멀", "노말", "노말모프", "normal"]', true),
  ('dripping', '드리피', 'Dripping', 'PATTERN_DETAIL', '["드리피", "drippy", "dripping"]', true),
  ('creamsicle', '크림시클', 'Creamsicle', 'COLOR', '["크림시클", "creamcicle", "creamsicle"]', true),
  ('empty-back', '엠티백', 'Empty Back', 'PATTERN_DETAIL', '["엠티백", "엠티 백", "empty back", "emptyback"]', true),
  ('white-spot', '화이트스팟', 'White Spot', 'SPOT_DETAIL', '["화이트스팟", "화이트 스팟", "white spot"]', true),
  ('het-axanthic', '헷 아잔틱', 'Het Axanthic', 'OTHER', '["헷아잔틱", "헷100아잔틱", "100헷아잔틱", "het axanthic", "het100 axanthic", "100% het axanthic"]', true),
  ('tangerine', '텐저린', 'Tangerine', 'COLOR', '["텐저린", "tangerine"]', true),
  ('white-pin', '화이트핀', 'White Pin', 'PATTERN_DETAIL', '["화이트핀", "화이트 핀", "white pin"]', true),
  ('dark-base', '다크', 'Dark Base', 'COLOR', '["다크베이스", "다크 베이스", "다크", "dark base"]', true),
  ('cream-base', '크림', 'Cream Base', 'COLOR', '["크림베이스", "크림 베이스", "크림", "cream base"]', true),
  ('white-crown', '화이트크라운', 'White Crown', 'PATTERN_DETAIL', '["화이트크라운", "화이트 크라운", "white crown"]', true),
  ('charcoal', '차콜', 'Charcoal', 'COLOR', '["차콜", "챠콜", "charcoal"]', true),
  ('spot', '스팟', 'Spot', 'SPOT_DETAIL', '["스팟", "spot"]', true),
  ('lilly-sable', '릴리세이블', 'Lilly Sable', 'OTHER', '["릴리세이블", "릴리 세이블", "lilly sable"]', true),
  ('super-stripe', '슈퍼스트라이프', 'Super Stripe', 'PATTERN_DETAIL', '["슈퍼스트라이프", "슈퍼 스트라이프", "super stripe"]', true),
  ('mosaic', '모자이크', 'Mosaic', 'PATTERN_DETAIL', '["모자이크", "mosaic"]', true),
  ('hypo', '하이포', 'Hypo', 'COLOR', '["하이포", "hypo"]', true),
  ('non-lilly', '논릴리', 'Non-Lilly', 'OTHER', '["논릴리", "논 릴리", "non lilly", "nonlilly"]', true)
on conflict (slug) do update set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  trait_type = excluded.trait_type,
  aliases = excluded.aliases,
  is_filterable = excluded.is_filterable;

insert into public.listing_traits (listing_id, trait_id, source_text)
select distinct
  listing.id,
  trait.id,
  left(listing.original_title, 240)
from public.listings as listing
join public.traits as trait
  on trait.slug in (
    'normal', 'dripping', 'creamsicle', 'empty-back', 'white-spot',
    'het-axanthic', 'tangerine', 'white-pin', 'dark-base', 'cream-base',
    'white-crown', 'charcoal', 'spot', 'lilly-sable', 'super-stripe',
    'mosaic', 'hypo', 'non-lilly'
  )
cross join lateral jsonb_array_elements_text(trait.aliases) as alias(value)
where length(regexp_replace(lower(alias.value), '[^0-9a-z가-힣]+', '', 'g')) > 1
  and regexp_replace(lower(listing.original_title), '[^0-9a-z가-힣]+', '', 'g') like
    '%' || regexp_replace(lower(alias.value), '[^0-9a-z가-힣]+', '', 'g') || '%'
on conflict (listing_id, trait_id) do update set
  source_text = excluded.source_text;
