# Domestic Crested-Gecko Source Audit

Audit date: 2026-08-11 (Asia/Seoul)
Scope: Korean-facing sources that can contribute a current crested-gecko **asking price** to the private MVP.

## Acceptance Boundary

A source is eligible for unattended collection only when all conditions are true:

1. A public, login-free page exposes individual crested-gecko animals.
2. The page exposes a fixed numeric price and a current/sold state that can be verified.
3. Public category/product pages are compatible with the site's robots policy.
4. Discovery and parsing can remain on exact-host HTTPS pages without private APIs, account, chat, cart, checkout, or seller dashboards.
5. The collector can store only comparison-safe fields and omit seller contact, address, private narrative, and payment information.

“국내 전부” therefore means every audited candidate that passes this boundary, not every post or account-gated marketplace on the Korean internet.

## Added to Automatic Collection

| Source | Collector key | Public discovery surface | First controlled run | Comparable active rows | Notes |
|---|---|---|---:|---:|---|
| 뉴런쥬라기 | `jurassic` | [Crested Gecko category](https://thejurassic.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/132/) | 20 | 10 | Cafe24 public category/product JSON-LD |
| 뉴런내추럴 | `newrunnatural` | [Reptile category](https://newrunnatural.co.kr/category/%EB%8F%84%EB%A7%88%EB%B1%80/48/) | 8 | 2 | Cafe24; sold-out category icon wins |
| 더사파리 | `thesafari` | [Crested Gecko category](https://thesafari.kr/product/list.html?cate_no=160) | 14 | 9 | Cafe24 public category/product JSON-LD |
| 뉴런렙박스 | `thereptile` | [Crested Gecko category](https://thereptile.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/143/) | 5 | 3 | Cafe24 public category/product JSON-LD |
| 더브리더스 | `thebreeders` | [Crested Gecko category](https://thebreeders.cafe24.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/72/) | 48 | 37 | Cafe24 public category/product JSON-LD |
| 더베스트팜 | `bestfarm` | [Crested Gecko category](https://www.thebestfarm.kr/product/list.html?cate_no=25) | 16 | 13 | Cafe24 public category/product JSON-LD |
| 뉴런와일드 | `newrunwild` | [Gecko category](https://newrunwild.co.kr/category/%EA%B2%8C%EC%BD%94%EB%B6%99%EC%9D%B4%EB%A5%98/80/) | 4 | 1 | Cafe24; non-crested products excluded |
| 프랜쥬 | `frienzoo` | [Reptile category](https://frienzoo.com/category/%ED%8C%8C%EC%B6%A9%EB%A5%98/256/) | 2 | 1 | Cafe24; non-crested products excluded |
| 주세요닷컴 / ZOO세요 | `zooseyo` | [Crested Gecko general-sale category](https://www.zooseyo.com/sale/sale_list.php?cate1=%C6%C4%C3%E6%2F%BE%E7%BC%AD%B7%F9&cate2=%B5%B5%B8%B6%B9%EC%28%B0%D4%C4%DA%29&cate3=%C5%A9%B7%B9%BD%BA%C6%BC%B5%E5%20%B0%D4%C4%DA&tabs=1) | 8 | 3 | EUC-KR; category state + strict detail allowlist |

All nine first runs succeeded, stored 125 rows, and emitted zero collector warnings. The database check found zero phone/email-like patterns across their stored titles, descriptions, and raw data.

### 2026-08-10 general-shop expansion

| Source | Collector key | Public discovery surface | First controlled run | Comparable active rows | Notes |
|---|---|---|---:|---:|---|
| 도심속도마뱀 | `myage` | [Crested Gecko category](https://myage.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/130/) | 100 | 84 | Cafe24; bounded at the manual per-source maximum |
| 빙하기 | `iceage` | [Gecko category](https://iceagereptile.com/category/%EA%B2%8C%EC%BD%94-%E2%94%82-Gecko/97/) | 10 | 7 | Cafe24; non-crested products excluded |
| 더몬스터 | `themonster` | [Crested Gecko category](https://themonster.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/109/) | 6 | 3 | Mixed crested/leopard event product explicitly rejected |
| 더쥬 | `thezoo` | [Crested Gecko category](https://xn--9m1b023b.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/90/) | 100 | 55 | Cafe24; embedded title markup stripped before storage |
| 더드래곤 | `thedragon` | [Gecko category](https://thedragon1.cafe24.com/category/%EA%B2%8C%EC%BD%94%EB%A5%98/67/) | 6 | 1 | Cafe24; non-crested products excluded |
| 줄스 | `jules` | [Crested Gecko catalog](https://ehddud3.cafe24.com/product/list.html?cate_no=31) | 100 | 0 | All 100 checked products were sold history, so the platform stays out of current-price UI |
| 더쥬 송파점 | `thezoosongpa` | [Crested Gecko category](https://gjwnddnjs123.cafe24.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/59/) | 4 | 1 | Cafe24 public category/product JSON-LD |
| 곤충하모니 | `insectharmony` | [Crested Gecko category](https://xn--699at5i1sh8pu9yi.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/162/) | 100 | 5 | 79 of 100 checked rows were explicit sold history |
| 헬로게코 | `hellogecko` | [Lilly White category](https://hellogcekogood.com/24) | 28 | 1 | Public Imweb categories/Product JSON-LD; 27 sold, one non-crested item rejected |

The nine controlled expansion runs stored 454 rows: 244 current fixed-price rows and 210 sold rows. Exactly 157 current rows were safe for morph comparison. All runs finished successfully; 헬로게코 logged one expected parse warning for the rejected non-crested product. A connected audit found zero phone/email patterns, zero HTML-markup titles, zero mixed-species/supply titles, zero original-URL host violations, and zero active rows missing a fixed numeric price.

## Existing Automatic Sources Retained

- [Feedle](https://www.feedle.me): sitemap-listed public `/pet/` HTML and JSON-LD only.
- [Kiwo](https://kiwo.kr/products?category=%EA%B2%8C%EC%BD%94): public gecko category/product HTML; non-crested animals and supplies excluded.
- [WaterTail](https://watertail.com/listsofanimals): verified public animal-product state; current confirmed rows are sold history.
- [MyBreeders](https://mybreeders.com): public product discovery and an explicit safe-field allowlist.
- [Newrun Reptile](https://newrunreptile.co.kr/product/list.html?cate_no=197): public crested-gecko category/product JSON-LD.

The private MVP now has 25 automated sources in total: Feedle plus 24 public-shop/classified sources.

## Continuous New-Source Discovery

Fixed-source listing refresh and new-domain discovery are separate operations. A scheduled Codex audit runs daily at 08:20 Asia/Seoul with rotated Korean queries; a protected Supabase Edge channel is also scheduled at 03:30 Asia/Seoul and uses only Naver's official Web Search API when its Function Secrets are configured. Both channels compare against existing platforms and the private candidate queue. They never add a domain to the price comparison automatically.

Candidate promotion requires exact HTTPS, an allowed robots route, a public crested-gecko page, a numeric fixed price, an observable sale state, and Product JSON-LD or an equivalently reviewed product structure. A category result may cause at most one same-host public product probe. Login, admin/API, chat, cart, checkout, payment, contact data, raw result snippets, and page-body persistence remain outside the boundary.

The first controlled discovery audit on 2026-08-10 found:

| Candidate | Queue state | Evidence |
|---|---|---|
| [타란센터](https://tarancenter.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/85/) | `ELIGIBLE_REVIEW` | robots allowed; Cafe24 category exposed 6 crested-gecko product links; three product pages parsed as two ACTIVE fixed-price rows and one explicit SOLD row with Product JSON-LD. This is a candidate, not yet an automatic platform. |
| [크레팍스](https://www.crepax.kr/) | `REJECTED` | Search index evidence existed, but current A/AAAA resolution was absent; recorded as `DNS_UNRESOLVED` for auditable re-check rather than silently forgotten. |

The official API channel intentionally records `SKIPPED / MISSING_NAVER_SEARCH_CREDENTIALS` until its two optional Function Secrets are configured. The scheduled Codex discovery channel remains active independently.

### 2026-08-11 daily discovery run 7

The 08:20 KST audit rotated general web, public Instagram-result, indexable Threads/X, reptile-fair/expo, official-shop, and connected-store queries. Six previously unknown hosts were independently checked; one reached `ELIGIBLE_REVIEW` and five were retained as explicit rejections. No platform, listing, or shop-location row was created.

| Candidate | Queue state | Independent result |
|---|---|---|
| [뉴런네이처](https://nature01321.cafe24.com/category/%EB%8F%84%EB%A7%88%EB%B1%80/46/) | `ELIGIBLE_REVIEW` | Cafe24 robots allows the public route; the official [company page](https://nature01321.cafe24.com/shopinfo/company.html) exposes the public business location; two current crested-gecko products expose Product JSON-LD, fixed KRW prices, and `InStock`. The source uses quality and receiving-method options, so any later collector must emit one product row at its animal-only base price and must not turn shipping surcharges into duplicate listings. |
| [서울렙타일](https://www.seoulreptile.co.kr/goods/goods_list.php?cateCd=001005001001) | `REJECTED` | Current product and location evidence exists, but the default `User-agent: *` policy is `Disallow: /`; unattended collection remains prohibited. |
| [작은생명](https://bono2048.cafe24.com/) | `REJECTED` | The current root returns Cafe24's “This store is unavailable”; the previously indexed category and product URLs now return 404. Cached search results were not accepted as current price evidence. |
| [크레팩토리](https://crefactory.cafe24.com/category/%5BSpecialGecko%5D/58/) | `REJECTED` | Robots allows the route and an official company page exists, but the public crested-gecko category currently contains zero animals; the home catalog is supplies only. |
| [크레산도 수성점](https://cresando.co.kr/category/%EC%83%9D%EB%AC%BC/70/) | `REJECTED` | Robots allows the route and the public shop page confirms a business location, but the live-animal category currently contains zero products. It may be reviewed later as a location-only directory candidate, not as a price source. |
| [크레파크](https://www.crepark.co.kr/) | `REJECTED` | Public community/event pages and store items were found, but the reproducible store examples are supplies and no current fixed-price animal product was verified. Event copy is not listing evidence. |

Run 7 recorded 36 rotated queries, six reviewed candidates, six safe queue upserts, and one eligible-review result. The connected database remained at 30 platforms, 1,237 listings, and 22 shop locations; only the private candidate/run tables changed. Threads, X, and expo searches yielded no additional brand for which both an official location surface and a separate robots-compatible fixed-price product surface could be confirmed.

### OpenAI web price-evidence channel

The protected `discover-public-sources` Edge Function also has a separate `OPENAI_WEB_SEARCH` mode scheduled at 04:10 Asia/Seoul. It uses the OpenAI Responses API with high reasoning effort, required live `web_search`, high search context, strict JSON Schema output, blocked private/social domains, and complete search-source metadata. It is a discovery/evidence route, not a new listing collector.

Every model claim must name a direct public HTTPS item page and an exact numeric KRW price. The server independently verifies that the URL occurred in the search sources and direct citation set, checks robots, fetches the page with a bounded response, extracts the price again, and requires unambiguous ACTIVE/SOLD evidence. Unsupported, mismatched, private, blocked, or unreadable claims stay `NEW` or `REJECTED`; validated unknown hosts enter only the existing source-review queue. Raw page bodies, result snippets, contacts, and model reasoning are not retained.

`price_evidence_candidates` is service-role-only with RLS enabled and no anon/authenticated privileges. The first protected smoke is source-discovery run 4: `SKIPPED / MISSING_OPENAI_API_KEY`, zero search calls, zero sources, and empty usage, proving that the scheduled channel makes no paid request until the separately billed key is explicitly placed in Supabase Function Secrets.

## Audited but Not Unattended

| Candidate | State | Reason / route |
|---|---|---|
| [파사모](https://cafe.naver.com/reptilia) | user-invoked Playwright review + protected import | The correct crested-gecko sale board is cafe `12440585`, menu `1704`. Naver Cafe robots policy prohibits the desired unattended crawl, so keep a dedicated logged-in profile, explicit 1–3-page commands, minimum delay, no cron/CI/background run, safe-field-only parsing, and review-queue separation. |
| [동물다락](https://www.dongda.co.kr) | reviewed import only | The public web surface does not expose a comparable listing catalog; do not reverse-engineer the app. |
| [크레팍스](https://www.crepax.kr/) | unavailable | Domain was NXDOMAIN during the audit, so there is no current surface to schedule. Re-audit only if the domain returns. |
| Kim's Reptile | excluded | The domain failed TLS negotiation during the audit and its public crawl boundary could not be verified. |
| LinkAqua Godomall / 서울렙타일 | excluded | Their `User-agent: *` robots policy disallows the public surface needed for unattended collection. |
| 02reptile | unavailable | DNS resolution failed during the audit. Re-audit only when a public domain returns. |
| KakaoTalk, Instagram, Daangn, and seller-only communities | excluded | Login/app/contact-first surfaces do not expose a reproducible public fixed-price catalog. |
| Consultation-only shops, supply-only catalogs, and mixed-species event pages | excluded | They cannot establish an individual current crested-gecko fixed price/status without inference or manual contact. |

## Cross-source Store Discovery: Social and Expo Signals

Public Instagram profiles, indexable Threads/X results, reptile-fair/animal-forum schedules, official venue pages, public blogs, and connected shop links are now searched as **candidate discovery signals**, not as listing evidence. The daily Codex discovery automation rotates these channels and records a candidate only after removing already-known hosts. A social profile title or an expo booth mention can establish that a brand is worth reviewing, but it cannot by itself establish a current price, sale state, delivery method, or official store address.

The 2026-08-10 controlled audit cross-checked Instagram-discovered shops and reptile-fair-related results against separate official surfaces:

| Candidate | Discovery signal | Independent confirmation | Result |
|---|---|---|---|
| [타란센터](https://www.instagram.com/taran_center/) | public Instagram profile plus general web discovery | official [company page](https://tarancenter.com/shopinfo/company.html), allowed robots, and public [Cafe24 crested category](https://tarancenter.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/85/) with fixed-price Product JSON-LD | onboarded automatic source and official Seoul Gangbuk store location |
| [렙타일스토어 광주점](https://www.reptilestore.co.kr/product/list.html?cate_no=98) | expo-related/general reptile-shop search | official [company page](https://www.reptilestore.co.kr/shopinfo/company.html), allowed robots, and one current fixed-price crested product in the public Cafe24 lizard category | onboarded automatic source and official Gwangju store location; the random-morph row remains unclassified rather than forced into a morph pool |
| [크레리즘 인천청라점](https://www.instagram.com/crerism_official/) | public Instagram profile and connected SmartStore/blog results | shop-controlled [public location page](https://sites.google.com/view/phachungkrerismincheon) with store name, address, hours, and business identity | location-only directory row; no deterministic public fixed-price collector yet |
| [낭게코](https://www.instagram.com/nang_geckos/) | reptile-fair booth search and public Instagram profile | shop-controlled [public location page](https://sites.google.com/view/pachunglyusyab) with store address, hours, and business identity | location-only directory row; no deterministic public fixed-price collector yet |

Other public Instagram hits included Gecko Mong, Gecko Island, Gecko Art, Jacobson Reptile, Kiuda, Edam Gecko, GeckoLand, and Mesozoic Reptile. They remain discovery leads because a separate official store-address page and reproducible public fixed-price product surface were not both confirmed in this pass. Indexable Threads and X searches did not yield a candidate that met those two independent evidence axes; this is reported as “no independently verifiable hit,” not proof that the shops have no account. Social/login walls are never bypassed.

The first bounded collection after review stored six Taran Center products (two active comparable and four sold history) and one current fixed-price Reptile Store product (kept morph-unclassified). Neither collector stored contact details, search snippets, or social post bodies. Both sources are included in the existing 09:00/18:00 final bounded shop batch; social/expo discovery itself still cannot write listings.

## Public Shop Location and Fulfillment Audit

Location data has a different privacy boundary from seller listings. Only an official shop/company page may establish a public business location; individual-community seller addresses, inferred home locations, meeting places, and article-body contact data are never accepted. Price-source eligibility and location-directory eligibility are reviewed independently: a store can enter `/nearby` without a fixed-price catalog, but it cannot create a collector or listing unless the separate price boundary passes. The base migration `20260810120636_add_shop_locations_and_fulfillment.sql`, cross-search migration `20260810143004_add_cross_searched_reptile_shops.sql`, and directory expansions `20260813105116_expand_location_only_shop_directory.sql` and `20260813113705_expand_verified_reptile_shop_directory.sql` now store 38 official locations. Twenty locations retain previously verified stored coordinates; the other 18 keep null database coordinates and are resolved client-side only through Kakao's official address search when the map key is configured.

The 2026-08-13 directory review added six [디어렙 official branches](https://dear-rep.com/store): Daejeon, Sejong Boram, Gongju, Dangjin Sucheong, Cheongju Yongam, and Cheonan Seongseong. The official brand page is the address evidence; cached Nominatim results are only coordinates. The `디어렙` price platform remains inactive, every new branch has zero listing rows, and `source_candidates.evidence.onboarded_scope` is `LOCATION_DIRECTORY_ONLY`. This prevents the public store count from fabricating price coverage.

A second 2026-08-13 review used Instagram, Threads/X-indexable results, reptile-fair material, and reptile directories only to discover names. Ten businesses entered the location directory only after a separate official company/store page confirmed the public business address: 크레팍스, 뉴런네이처, 크레팩토리, 크레산도 수성점, 게코몽, 나슨 판교, 게코스토리, 마린렙타일, 게코홀릭, and 발토앤제이. Their platforms remain inactive and the group has zero listing rows. BDB렙타일 and 오인트렙타일 remain discovery leads because the current address evidence was an aggregator/social surface rather than a separately verified official business page. Failed TLS/DNS domains and private/apartment breeder addresses were not onboarded.

The location directory distinguishes `STORE` from `BUSINESS_ADDRESS`, defaults every visit policy to `CONFIRM_REQUIRED`, and retains the exact evidence URL and verification time. Current listing data is joined at platform level only. Existing price-linked rows use `PLATFORM_ONLINE`; the newest ten location-only rows use `LOCATION_CONFIRMED` and create no inventory. `/nearby` explicitly says online animals are seller-wide inventory rather than verified branch stock.

Fulfillment is stored separately in 21 evidence-backed option rows across nine platforms:

| Evidence group | Confirmed interpretation |
|---|---|
| [곤충하모니 guide](https://xn--699at5i1sh8pu9yi.com/shopinfo/guide.html) | Live reptiles: ordinary parcel unavailable; express-bus shipment and quick available subject to coordination. |
| [더쥬 guide](https://xn--9m1b023b.com/shopinfo/guide.html) | Live reptiles: ordinary parcel unavailable; express bus, quick, and store pickup available. |
| [더쥬 송파 guide](https://gjwnddnjs123.cafe24.com/shopinfo/guide.html) | Express bus, quick, specialized reptile courier, and pickup are listed as live-animal receiving methods. |
| [더브리더스 guide](https://thebreeders.cafe24.com/shopinfo/guide.html) | Express bus and quick are live-animal options; generic postal parcel and store pickup require confirmation rather than being assumed applicable. |
| [뉴런렙타일](https://newrunreptile.co.kr/shopinfo/company.html), [뉴런렙박스](https://thereptile.co.kr/product/list.html?cate_no=130), [뉴런와일드](https://newrunwild.co.kr/shopinfo/company.html) | Official express-bus payment/add-on surface exists; schedules and terminals still require direct confirmation. |
| [도심속도마뱀](https://myage.co.kr/) and [키워](https://kiwo.kr/) | Official copy refers to specialized live/special-animal delivery. |
| [프랜쥬](https://frienzoo.com/shopinfo/company.html) | Express-bus service is visible, but applicability and schedule are `CONFIRM_REQUIRED`. |

Generic Cafe24 text such as `배송 방법: 택배` is not enough to claim that a live gecko can use ordinary parcel delivery. The schema therefore carries both `availability` and `applies_to`. No official evidence confirmed registered-mail delivery for live reptiles during this audit, so there is currently no `REGISTERED_MAIL` row rather than an inferred answer.

User geolocation is not a database input. `/nearby` starts in a nationwide South Korea view and requests GPS only when the user presses `내 위치`; the returned coordinate exists only in React client memory for local distance sorting and map centering. Permission denial leaves the nationwide view in place, with no fixed substitute location. The page uses a split map/list directory with store/region search and price-linked/location-only filters. Its embedded map is the real Kakao Maps JavaScript SDK through the MIT `react-kakao-maps-sdk` wrapper. The SDK restricts zoom and clamps the map center to South Korea; the `services` library resolves address-only official locations and discovers public Kakao Places search results in the browser without promoting them into database coordinates or verified price rows. A user-owned JavaScript key, Kakao Map API activation, and registered JavaScript SDK domains are mandatory; no Kakao tiles or API routes are borrowed without them.

## Current Connected Snapshot

- Listings: 1,237 total after the bounded cross-search onboarding run and existing collectors.
- Current fixed-price rows: 900; safely morph-classified comparison rows: 614.
- Rows with public listing images: 1,098.
- Platforms with current fixed-price inventory: 24. Location-only shops remain inactive price platforms until a deterministic public catalog is reviewed.
- Lilly White: 188 comparable current rows across 21 platforms, with a 15,000 KRW minimum asking price.
- Pasamo: 139 total rows, 137 active fixed-price rows, and 89 safely morph-classified comparison rows.
- History: 1,233 price rows and 1,238 status rows.
- Schedule: `0 0,9 * * *` UTC = 09:00 and 18:00 Asia/Seoul, split into Feedle plus six bounded shop calls.
- Public shop directory: 38 official addresses; 20 stored distance-capable coordinates; 21 fulfillment option rows across nine platforms. Six Dear Rep branches and the newest ten verified businesses are location-only and create no prices/listings.

This is a private-MVP snapshot, not a claim of completed-sale prices, breeder authenticity, image rights, or exhaustive access to private Korean communities.
