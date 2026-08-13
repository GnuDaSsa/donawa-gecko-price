insert into public.platforms (name, homepage_url, collector_type, is_active)
values
  ('피들', 'https://www.feedle.me', 'AUTO_WEB', true),
  ('키워', 'https://kiwo.kr/products?category=%EA%B2%8C%EC%BD%94', 'AUTO_WEB', false),
  ('워터테일', 'https://watertail.com/listsofanimals', 'AUTO_WEB', false),
  ('마이브리더즈', 'https://mybreeders.com', 'AUTO_WEB', false),
  ('뉴런렙타일', 'https://newrunreptile.co.kr/product/list.html?cate_no=197', 'AUTO_WEB', false),
  ('뉴런쥬라기', 'https://thejurassic.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/132/', 'AUTO_WEB', false),
  ('뉴런내추럴', 'https://newrunnatural.co.kr/category/%EB%8F%84%EB%A7%88%EB%B1%80/48/', 'AUTO_WEB', false),
  ('더사파리', 'https://thesafari.kr/product/list.html?cate_no=160', 'AUTO_WEB', false),
  ('뉴런렙박스', 'https://thereptile.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/143/', 'AUTO_WEB', false),
  ('더브리더스', 'https://thebreeders.cafe24.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/72/', 'AUTO_WEB', false),
  ('더베스트팜', 'https://www.thebestfarm.kr/product/list.html?cate_no=25', 'AUTO_WEB', false),
  ('뉴런와일드', 'https://newrunwild.co.kr/category/%EA%B2%8C%EC%BD%94%EB%B6%99%EC%9D%B4%EB%A5%98/80/', 'AUTO_WEB', false),
  ('프랜쥬', 'https://frienzoo.com/category/%ED%8C%8C%EC%B6%A9%EB%A5%98/256/', 'AUTO_WEB', false),
  ('주세요닷컴', 'https://www.zooseyo.com/sale/sale_list.php?cate1=%C6%C4%C3%E6%2F%BE%E7%BC%AD%B7%F9&cate2=%B5%B5%B8%B6%B9%EC%28%B0%D4%C4%DA%29&cate3=%C5%A9%B7%B9%BD%BA%C6%BC%B5%E5%20%B0%D4%C4%DA&tabs=1', 'AUTO_WEB', false),
  ('파사모', 'https://cafe.naver.com/reptilia', 'BROWSER_HELPER', false),
  ('동물다락', 'https://www.dongda.co.kr', 'CSV_IMPORT', false)
on conflict (name) do update set
  homepage_url = excluded.homepage_url,
  collector_type = excluded.collector_type,
  is_active = excluded.is_active;

insert into public.morphs (
  slug, name_ko, name_en, aliases, representative_image, visible_on_home, display_order
)
values
  ('lilly-white', '릴리화이트', 'Lilly White', '["릴리화이트", "릴리 화이트", "릴리", "릴화", "lilly white", "lillywhite", "lw"]', '/morphs/lilly-white.webp', true, 1),
  ('axanthic', '아잔틱', 'Axanthic', '["아잔틱", "아잔", "axanthic"]', '/morphs/axanthic.webp', true, 2),
  ('lilly-axanthic', '릴잔틱', 'Lilly Axanthic', '["릴잔틱", "릴잔", "릴리잔틱", "릴리 아잔틱", "lilly axanthic", "lilly white axanthic"]', '/morphs/lilly-axanthic.webp', true, 3),
  ('cappuccino', '카푸치노', 'Cappuccino', '["카푸치노", "카푸", "cappuccino"]', '/morphs/cappuccino.webp', true, 4),
  ('frappuccino', '프라푸치노', 'Frappuccino', '["프라푸치노", "프라푸", "frappuccino"]', '/morphs/frappuccino.webp', true, 5),
  ('dalmatian', '달마시안', 'Dalmatian', '["슈퍼달마시안", "슈퍼달마", "슈퍼 달마", "슈달", "super dalmatian", "달마시안", "달마", "dalmatian"]', '/morphs/dalmatian.webp', true, 6),
  ('harlequin', '할리퀸', 'Harlequin', '["할리퀸", "할리", "harlequin"]', '/morphs/harlequin.webp', true, 7),
  ('pinstripe', '핀스트라이프', 'Pinstripe', '["핀스트라이프", "핀 스트라이프", "핀스", "pinstripe"]', '/morphs/pinstripe.webp', true, 8),
  ('phantom', '팬텀', 'Phantom', '["팬텀", "phantom"]', '/morphs/phantom.webp', true, 9),
  ('sable', '세이블', 'Sable', '["세이블", "sable"]', '/morphs/sable.webp', true, 10),
  ('soft-scale', '소프트스케일', 'Soft Scale', '["소프트스케일", "소프트 스케일", "soft scale"]', '/morphs/soft-scale.webp', true, 11),
  ('flame', '플레임', 'Flame', '["플레임", "flame"]', '/morphs/flame.webp', true, 12)
on conflict (slug) do update set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  aliases = excluded.aliases,
  representative_image = excluded.representative_image,
  visible_on_home = excluded.visible_on_home,
  display_order = excluded.display_order;

insert into public.traits (slug, name_ko, name_en, trait_type, aliases)
values
  ('full-pin', '풀핀', 'Full Pinstripe', 'PATTERN_DETAIL', '["풀핀", "풀 핀", "full pin", "full pinstripe", "100% pin"]'),
  ('partial-pin', '파셜핀', 'Partial Pinstripe', 'PATTERN_DETAIL', '["파셜핀", "파셜 핀", "partial pin"]'),
  ('super-dalmatian', '슈퍼달마', 'Super Dalmatian', 'EXPRESSION', '["슈퍼달마", "슈달", "슈퍼 달마", "슈퍼달마시안", "super dalmatian"]'),
  ('inkspot', '잉크스팟', 'Inkspot', 'SPOT_DETAIL', '["잉크스팟", "잉크 스팟", "inkspot", "ink spot"]'),
  ('tricolor', '트라이컬러', 'Tricolor', 'COLOR', '["트라이컬러", "트라이 컬러", "트라이", "tricolor"]'),
  ('white-wall', '화이트월', 'White Wall', 'PATTERN_DETAIL', '["화이트월", "화이트 월", "white wall"]'),
  ('solid-back', '솔리드백', 'Solid Back', 'PATTERN_DETAIL', '["솔리드백", "솔리드 백", "solid back"]'),
  ('red-base', '레드', 'Red Base', 'COLOR', '["레드베이스", "레드 베이스", "레드", "red base", "red"]'),
  ('high-expression', '하이 익스프레션', 'High Expression', 'EXPRESSION', '["하이 익스프레션", "하이익스", "high expression"]'),
  ('extreme', '익스트림', 'Extreme', 'EXPRESSION', '["익스트림", "extreme"]'),
  ('patternless', '패턴리스', 'Patternless', 'PATTERN_DETAIL', '["패턴리스", "무패턴", "patternless"]'),
  ('bicolor', '바이컬러', 'Bicolor', 'COLOR', '["바이컬러", "바이 컬러", "bicolor", "bi-color"]'),
  ('tiger', '타이거', 'Tiger', 'PATTERN_DETAIL', '["타이거", "tiger"]'),
  ('brindle', '브린들', 'Brindle', 'PATTERN_DETAIL', '["브린들", "brindle"]'),
  ('quadstripe', '쿼드스트라이프', 'Quadstripe', 'PATTERN_DETAIL', '["쿼드스트라이프", "쿼드 스트라이프", "쿼드", "쿼드 핀", "quadstripe", "quad stripe"]')
  ,('normal', '노멀', 'Normal', 'OTHER', '["노멀", "노말", "노말모프", "normal"]')
  ,('dripping', '드리피', 'Dripping', 'PATTERN_DETAIL', '["드리피", "drippy", "dripping"]')
  ,('creamsicle', '크림시클', 'Creamsicle', 'COLOR', '["크림시클", "creamcicle", "creamsicle"]')
  ,('empty-back', '엠티백', 'Empty Back', 'PATTERN_DETAIL', '["엠티백", "엠티 백", "empty back", "emptyback"]')
  ,('white-spot', '화이트스팟', 'White Spot', 'SPOT_DETAIL', '["화이트스팟", "화이트 스팟", "white spot"]')
  ,('het-axanthic', '헷 아잔틱', 'Het Axanthic', 'OTHER', '["헷아잔틱", "헷100아잔틱", "100헷아잔틱", "het axanthic", "het100 axanthic", "100% het axanthic"]')
  ,('tangerine', '텐저린', 'Tangerine', 'COLOR', '["텐저린", "tangerine"]')
  ,('white-pin', '화이트핀', 'White Pin', 'PATTERN_DETAIL', '["화이트핀", "화이트 핀", "white pin"]')
  ,('dark-base', '다크', 'Dark Base', 'COLOR', '["다크베이스", "다크 베이스", "다크", "dark base"]')
  ,('cream-base', '크림', 'Cream Base', 'COLOR', '["크림베이스", "크림 베이스", "크림", "cream base"]')
  ,('white-crown', '화이트크라운', 'White Crown', 'PATTERN_DETAIL', '["화이트크라운", "화이트 크라운", "white crown"]')
  ,('charcoal', '차콜', 'Charcoal', 'COLOR', '["차콜", "챠콜", "charcoal"]')
  ,('spot', '스팟', 'Spot', 'SPOT_DETAIL', '["스팟", "spot"]')
  ,('lilly-sable', '릴리세이블', 'Lilly Sable', 'OTHER', '["릴리세이블", "릴리 세이블", "lilly sable"]')
  ,('super-stripe', '슈퍼스트라이프', 'Super Stripe', 'PATTERN_DETAIL', '["슈퍼스트라이프", "슈퍼 스트라이프", "super stripe"]')
  ,('mosaic', '모자이크', 'Mosaic', 'PATTERN_DETAIL', '["모자이크", "mosaic"]')
  ,('hypo', '하이포', 'Hypo', 'COLOR', '["하이포", "hypo"]')
  ,('non-lilly', '논릴리', 'Non-Lilly', 'OTHER', '["논릴리", "논 릴리", "non lilly", "nonlilly"]')
on conflict (slug) do update set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  trait_type = excluded.trait_type,
  aliases = excluded.aliases;

-- UI mock listings live in TypeScript so the app works without credentials.
-- Production-like seed listings should be inserted through apply_listing_observation
-- so initial price and NEW → ACTIVE histories are recorded consistently.
