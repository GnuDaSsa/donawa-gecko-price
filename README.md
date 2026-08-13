# 도나와 — Crested Gecko Morph Price Finder Private MVP

허용된 공개 매물 페이지를 보수적으로 수집·정규화하고, 사용자가 크레스티드 게코 모프별 현재 최저 **호가**와 실제 매물을 사이트별로 비교하는 로컬 전용 MVP입니다. 사진 AI 판정, 적정가격 예측, 실거래가 서비스가 아닙니다.

## 현재 구현

- Supabase PostgreSQL 기반 실데이터 저장소와 타입 생성
- RLS 공개 읽기 / 수집기 전용 쓰기 권한 분리
- 피들 사이트맵 + 공개 HTML JSON-LD 수집기
- 키워 공개 게코 카테고리 + 상품 JSON-LD 수집기
- 마이브리더즈 공개 홈 상품 목록 + 공개 상품 HTML 수집기
- 뉴런렙타일 공개 크레스티드게코 카테고리 + 상품 JSON-LD 수집기
- 워터테일의 공식 공개 상품 페이지 상태 보존(현재 확인분은 품절 이력)
- 뉴런쥬라기·뉴런내추럴·더사파리·뉴런렙박스·더브리더스·더베스트팜·뉴런와일드·프랜쥬 공개 카테고리/상품 JSON-LD 수집기
- 도심속도마뱀·빙하기·더몬스터·더쥬·더드래곤·줄스·더쥬 송파점·곤충하모니 공개 Cafe24 카테고리/상품 수집기와 헬로게코 공개 Imweb 상품 수집기
- 주세요닷컴(ZOO세요) 공개 분양 목록 수집기(EUC-KR 대응, 판매자 본문·연락처·주소 비저장)
- 파사모용 사용자 실행형 Playwright review runner와 파사모·동물다락 검토형 CSV 가져오기(무인 크롤링 없음, 원문 host allowlist)
- 로컬 SHA-256 비밀값으로 보호된 Supabase Edge Function
- 판매자 전화·주소·채팅·결제 정보 비수집 및 안전 필드만 저장
- 홈 최초 진입·새로고침에서만 `다나와`의 `ㅏ`가 회전해 `도나와`가 되는 스킵 가능 브랜드 인트로
- 레퍼런스의 넓은 여백·둥근 화이트 앱 셸·카테고리/상품 카드 구조를 모프 시장에 맞게 번역한 반응형 커머스 UI
- 12개 기본 모프와 8개 주요 패턴·형질로 구성된 20개 검토 카테고리 풀. 홈에는 현재 비교 가능한 매물이 있는 항목만 자동 노출
- 실제 한글/영문/별칭 검색, 항목별 현재 최저 호가·활성 매물 수·비교 사이트 수가 연결된 반응형 카탈로그
- 홈 카탈로그와 현재 가격 신호를 실제 Supabase 집계값으로 표시하고, 중복 히어로·전체 집계는 노출하지 않음
- 다나와식 정보 위계를 모프 거래에 맞게 번역한 최저 호가 요약·탭·쇼핑몰별 비교 화면
- 활성 고정가 전체 매물의 사분위수·중앙값·이상치를 보여주는 실제 박스플롯
- 같은 플랫폼별 최저가 집합을 유지하는 가격 비교형 ↔ 이미지형 토글
- 가격 조건을 통과한 현재 매물 전체를 플랫폼별 필터·12건 단위 더보기로 탐색하는 카탈로그
- Trait 배지, 성별·체중, 확인 시각, 원문 링크
- 원문 이미지가 없거나 로딩에 실패한 매물은 대표 사진으로 대체하지 않고 `이미지 없음`으로 명시
- Morph / Trait / Sex / Weight / Price 키워드 Parser
- 가격·상태 변화가 있을 때만 추가되는 이력
- 실패 시 매물 상태를 일괄 변경하지 않는 Collector Run 로그
- 한국시간 매일 09:00·18:00에 피들 및 공개 전문몰 수집기를 실행하는 Supabase Cron
- 매일 새로운 국내 샵 도메인을 탐색하고 robots·공개 고정가·상품 구조를 검증하는 비공개 소스 후보 큐
- OpenAI Responses API 웹 검색으로 장기 꼬리 가격 페이지를 찾고 원문을 독립 재검증하는 비공개 가격 증거 큐(선택 기능, 모델 출력의 매물 DB 직접 입력 금지)
- 공식 매장·사업장 38곳과 검증된 생물 배송·고속버스택배·퀵·방문수령 정책을 분리 저장하는 위치 DB
- 전국 매장을 기본으로 보여주고, 사용자가 `내 위치`를 누르면 GPS 좌표를 브라우저 메모리에서만 사용해 거리순으로 정렬하는 `/nearby`
- `react-kakao-maps-sdk` 기반 카카오 지도, 공식 주소 런타임 좌표 검색, 매장 목록·마커 동기화, 남한 중심 이동 제한
- 홈의 내 주변 판매처 바로가기와 3초 간격으로 왼쪽 전환되는 예정 박람회 배너. 한국시간 종료일이 지나면 자동 제외되고 각 배너는 공식 행사 원문으로 연결
- 실제 DB 연결을 점검하는 `/api/health`

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. `.env.local`은 Git에서 제외됩니다. `/nearby`의 카카오 지도를 사용하려면 Kakao Developers의 JavaScript 키를 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`로 넣고 JavaScript SDK 도메인에 `http://localhost:3000`을 등록합니다.

상단 검색은 한글명·영문명·등록된 별칭을 지원합니다. 예: `릴리`, `axanthic`, `카푸`.

## 수동 데이터 갱신

```bash
npm run collect -- --limit=60
npm run collect:feedle -- --limit=60
npm run collect:shops -- --limit=60
```

기본 `collect` 명령은 피들 다음 22개 공개 전문몰/분양 목록 수집기를 실행합니다. 키워는 공개 `게코` 카테고리에서 `크레스티드 게코` 동물 상품만 고르고 용품은 제외합니다. 마이브리더즈는 공개 홈에 노출된 상품 ID와 공개 상품 HTML의 안전 필드만 사용합니다. 뉴런렙타일과 Cafe24 계열 16개 사이트는 공개 카테고리와 상품 JSON-LD만 읽고 용품·관리자·API·혼합 종 이벤트 경로를 제외합니다. 헬로게코는 공개 Imweb 분양 카테고리와 Product JSON-LD만 사용하고, 주세요닷컴은 공개 카테고리의 판매 상태와 개별 페이지의 제목·종·성별·가격만 허용합니다. 판매자 본문·이름·주소·전화·이메일은 저장하지 않으며 `/api/`, 로그인, 채팅, 판매자 화면, 장바구니, 결제 경로도 사용하지 않습니다.

특정 공개 전문몰만 갱신할 수도 있습니다.

```bash
npm run collect:shops -- --limit=100 --sites=mybreeders
npm run collect:shops -- --limit=100 --sites=newrun
npm run collect:shops -- --limit=48 --sites=jurassic,newrunnatural,thesafari,thereptile,zooseyo
npm run collect:shops -- --limit=48 --sites=thebreeders,bestfarm,newrunwild,frienzoo
npm run collect:shops -- --limit=48 --sites=myage,iceage,themonster,thedragon
npm run collect:shops -- --limit=48 --sites=thezoo,thezoosongpa
npm run collect:shops -- --limit=48 --sites=insectharmony,jules,hellogecko
```

파사모는 Naver Cafe robots 정책상 무인 수집하거나 09:00/18:00 스케줄러에 연결하지 않습니다. 화면을 한 글씩 수동 조작하는 대신, **사용자가 실행할 때만** 최대 3페이지를 저속으로 검토하는 Playwright runner를 사용합니다. 전용 Chrome 프로필에 로그인 상태를 보관하고, 게시글 본문/판매자/연락처/주소는 파일이나 DB에 저장하지 않습니다. 명시적 개체 고정가만 `ready.csv`, 일괄가·가격 미기재·예약·단위 추정은 `needs-review.csv`로 분리합니다.

```bash
# 최초 1회 또는 세션 만료 시: 열린 Chrome에서 사용자가 직접 로그인
npm run pasamo:login

# 최신 1페이지(20개 글) 검토. robots/프로젝트 경계를 매 실행 명시
npm run pasamo:review -- --acknowledge-boundary --pages=1

# ready 행만 즉시 Supabase에 적재할 때만 --apply 추가
npm run pasamo:review -- --acknowledge-boundary --pages=1 --apply
```

Playwright 프로필은 기본적으로 `~/.codex/browser-profiles/donawa-pasamo`에 있고 저장소 밖에 둡니다. 출력은 gitignore된 `output/pasamo/`에 생성됩니다. `--pages`는 1~3, 글 사이 지연은 최소 1.2초이며 CI/백그라운드 실행은 거부합니다. CAPTCHA, 비밀번호, 2FA, 가입/권한 문제는 자동으로 우회하지 않습니다.

동물다락은 공개 웹에 매물 목록이 없어 검토된 내보내기 파일만 받습니다. 두 소스의 최종 검토 CSV는 다음 헤더를 사용합니다.

```csv
platform,title,url,price,price_type,status,morph,traits,sex,weight_g,image_url,classification_mode,status_evidence
```

한 게시글에 여러 개체가 있으면 각 개체를 한 행으로 나누고 원문 URL 뒤에 안정적인 개체 fragment(예: `#lilly-baby-1`)를 붙입니다. 이 fragment까지 외부 식별자에 포함되므로 같은 게시글의 개체들이 서로 덮어쓰지 않습니다. 원문 표현이 유전형인지 시각 모프인지 불명확하면 `classification_mode`를 `UNCLASSIFIED`로 두어 매물과 가격은 보존하되 모프별 최저가에는 넣지 않습니다.

판매완료는 제목·본문에서 해당 개체의 `분양완료/판매완료/거래완료`가 명시된 경우만 `SOLD + EXPLICIT_ITEM_SOLD`로 기록합니다. 게시글 전체 완료 문구는 모든 잔여 개체에 `EXPLICIT_ARTICLE_SOLD`를 사용합니다. 할인 전 가격의 취소선이나 오래된 게시일만으로 SOLD 처리하지 않습니다. 예약은 `UNKNOWN + EXPLICIT_RESERVATION`, 원문이 명시적으로 삭제된 경우만 `DELETED + ARTICLE_NOT_FOUND`, 장기간 재검토하지 못한 행은 `STALE + AGED_UNREVIEWED`로 구분합니다.

```bash
npm run import:listings -- --file=/absolute/path/listings.csv
```

원본 URL은 파사모 `cafe.naver.com`, 동물다락 `dongda.co.kr` HTTPS 주소만 허용됩니다. 비교 가능한 실제 매물이 한 건 이상 적재된 플랫폼만 최저가 표에 자동 활성화됩니다.

## 자동 데이터 갱신

Supabase Cron이 매일 **한국시간 09:00와 18:00**에 피들 수집기와 공개 전문몰 수집기를 호출합니다. 데이터베이스가 UTC를 사용하므로 등록된 cron 표현식은 `0 0,9 * * *`이며, 작업 이름은 `donawa-listing-refresh-kst-09-18`입니다. 무료 Edge 런타임에서 22개 전문몰을 한 요청에 직렬화하지 않도록 `기존 4 / 국내 A 5 / 국내 B 4 / 일반샵 A 4 / 일반샵 B 2 / 일반샵 C 3`의 여섯 요청으로 나누고, 피들은 별도 요청으로 갱신합니다. 파사모와 동물다락은 로그인·검토가 필요한 소스이므로 자동 갱신 대상이 아닙니다.

예약 호출은 Supabase의 `pg_cron` + `pg_net`을 사용하고, 프로젝트 URL과 수집기 비밀값은 Vault에 암호화해 둡니다. 원문 비밀값은 migration, 저장소, cron 명령에 기록하지 않습니다. 새 Supabase 프로젝트에 아래 migration과 Edge Function을 배포한 뒤 한 번만 프로비저닝합니다.

```bash
npm run scheduler:configure
```

예약 엔진 실행 여부는 `cron.job_run_details`, 각 소스의 실제 수집 결과는 `public.collector_runs`에서 확인합니다. 수동 갱신 명령은 장애 대응과 즉시 확인용으로 계속 사용할 수 있습니다.

### 신규 소스 일일 발굴

기존 23개 수집처의 매물 갱신과 신규 도메인 발굴은 별도 작업입니다. Codex 자동 작업 `도나와 신규 소스 일일 발굴`이 매일 **한국시간 08:20**에 검색어를 순환하며 국내 웹을 탐색하고, 기존 `platforms` 및 후보 큐와 대조합니다. HTTPS·robots 허용·크레스티드 게코 문맥·숫자 고정가·판매 상태·Product 구조를 모두 확인한 도메인만 `ELIGIBLE_REVIEW` 후보로 남깁니다. 로그인, 관리자/API, 채팅, 장바구니, 결제, 연락처 수집은 사용하지 않습니다.

Supabase에도 매일 **한국시간 03:30**에 보호된 `discover-public-sources` Edge Function을 호출하는 보조 Cron이 있습니다. 이 채널은 HTML 검색 결과 페이지를 긁지 않고 Naver 공식 웹문서 검색 API만 사용합니다. `NAVER_SEARCH_CLIENT_ID`와 `NAVER_SEARCH_CLIENT_SECRET`이 Function Secrets에 없으면 실패나 무음 처리가 아니라 `SKIPPED / MISSING_NAVER_SEARCH_CREDENTIALS`로 감사 로그를 남깁니다. Codex 08:20 탐색은 이 선택 자격증명과 무관하게 동작합니다.

별도 선택 채널은 매일 **한국시간 04:10**에 OpenAI Responses API의 `web_search`와 고추론 모델을 사용해 공개 국내 샵·브리더 상품 URL과 명시적 호가를 탐색합니다. 결과는 `price_evidence_candidates`에만 저장되며, 원문 HTTPS URL이 실제 검색 sources에 포함됐는지 확인한 다음 robots, 크레스티드 게코 문맥, 정확한 숫자 가격, 현재/완료 상태를 Edge Function이 다시 읽어 검증합니다. 검증돼도 기존 플랫폼은 결정론적 수집기가 다시 수집하고, 미등록 도메인은 `source_candidates / ELIGIBLE_REVIEW`까지만 이동합니다. 모델 주장·검색 snippet은 `listings`에 직접 기록되지 않습니다.

이 채널은 ChatGPT 웹 세션 자동화가 아니라 별도 과금되는 OpenAI API입니다. `OPENAI_API_KEY`는 저장소·브라우저·채팅에 넣지 말고 Supabase **Function Secrets**에 직접 설정해야 합니다. 현재 키가 없으면 유료 호출 전에 `SKIPPED / MISSING_OPENAI_API_KEY`를 남깁니다.

```bash
# 공식 검색 API 채널 즉시 실행. 자격증명 미설정 시 exit 2와 SKIPPED 사유를 출력
npm run sources:discover

# 비공개 후보 큐 조회
npm run sources:candidates

# OpenAI 웹 가격 연구 즉시 실행. 키 미설정 시 exit 2와 SKIPPED 사유를 출력
npm run sources:discover:gpt

# 서비스 역할로만 읽는 가격 증거 큐 조회
npm run sources:prices:gpt -- --status=VALIDATED
```

후보 큐는 사용자 가격 UI에 노출되지 않으며 새 도메인을 `platforms`나 `listings`에 자동 등록하지 않습니다. 실제 수집처 편입은 공개 상품 파서·판매 상태·PII 경계·소규모 실수집을 별도로 검토한 뒤 진행합니다.

## 내 주변 매장·배송 정보

`http://localhost:3000/nearby`에서 판매처 공식 페이지로 확인한 매장·사업장과 Kakao Places에서 찾은 전국 파충류샵을 함께 볼 수 있습니다. 공식 주소로 검증한 매장과 지도 검색 결과는 배지와 집계에서 분리합니다. 페이지는 전국 보기로 시작하며, `내 위치` GPS 또는 검색창에 입력한 장소명·도로명 주소를 기준으로 주변 매장을 거리순 정렬합니다. 기준 좌표와 Kakao 검색 결과를 Supabase 가격 DB에 쓰지 않습니다.

- `shop_locations`: 공식 매장/사업장 주소, 위치 유형, 좌표 정확도, 방문 확인 정책, 근거 URL, 검증 시각
- `platform_fulfillment_options`: 일반택배, 등기, 고속버스택배, 퀵, 생물 전문배송, 방문수령을 `가능/불가/사전확인`과 `생물/전체상품/용품`으로 분리
- 현재 테스트 기준점은 코드에 공개 상수로 고정하고 Haversine 직선거리 계산에만 사용하며, 브라우저 위치 권한을 요청하지 않음
- 내부 지도는 Kakao JavaScript SDK를 사용하므로 JavaScript 키, Kakao Map API 활성화, `localhost` 및 배포 도메인 등록이 필요함. 키가 없거나 도메인이 맞지 않으면 목록과 외부 카카오맵 링크만 유지하고 설정 안내를 표시함
- 표시 매물은 해당 플랫폼의 **전체 현재 온라인 매물**이며, 지점별 현장 재고로 확인된 것처럼 표시하지 않음

생물의 일반택배는 용품 택배 안내와 구분합니다. 현재 공식 근거에서 파충류 등기 배송을 확인한 판매처는 없으므로 `REGISTERED_MAIL`을 임의로 생성하지 않았습니다. 배송비·시간·터미널·현장 재고는 주문 전 원문에서 다시 확인해야 합니다.

현재 파사모 **기존 DB 원문 기준본**은 `docs/reviewed-imports/pasamo-2026-08-09-full-audit.csv`입니다. 이름과 달리 게시판 전체가 아니라 당시 DB에 이미 연결돼 있던 원문 10개만 다시 검토한 파일입니다. 46개체 중 44건은 활성 고정가, 1건은 가격문의, 1건은 개체 블록에 `분양완료`가 명시된 SOLD입니다. 실제 메뉴 1704 최신 페이지는 별도로 20개 일반 글을 노출하며 다음 페이지들도 존재합니다. 이후 갱신은 Playwright runner의 실행 배치 단위로 기록하고, 게시판 전체 완료라고 부르지 않습니다. 상세 판별표는 `docs/pasamo-review-policy.md`를 따릅니다.

최신 게시판 배치 기준본은 `docs/reviewed-imports/pasamo-2026-08-09-1158-board-page1-*.{csv,json}`입니다. 메뉴 1704의 당시 최신 1페이지 일반 글 20개를 검토해 개체별 활성 고정가 93건을 적재했고, 판별이 필요한 9건은 별도 CSV에 보류했으며 무료분양 3건은 가격비교에서 제외했습니다. 글 열기 실패는 0건입니다. 같은 ready CSV를 재적재해도 전체 매물과 가격/상태 이력 수가 증가하지 않는 것까지 확인했습니다. 이 배치는 **그 시점 최신 1페이지**이지 게시판 전체가 아닙니다.

## Supabase 구성

1. `supabase/migrations/20260807130000_initial_schema.sql`
2. `supabase/migrations/20260807193000_collector_settings.sql`
3. `supabase/migrations/20260808080000_add_mybreeders_platform.sql`
4. `supabase/migrations/20260808082500_add_newrun_platform.sql`
5. `supabase/migrations/20260808155949_add_scheduled_collector_refresh.sql`
6. `supabase/migrations/20260809013000_add_domestic_public_shop_platforms.sql`
7. `supabase/migrations/20260809014500_split_scheduled_shop_batches.sql`
8. `supabase/migrations/20260810080409_add_general_reptile_shop_platforms.sql`
9. `supabase/migrations/20260810102419_add_daily_source_discovery.sql`
10. `supabase/migrations/20260810103015_add_codex_source_discovery_provider.sql`
11. `supabase/migrations/20260810120636_add_shop_locations_and_fulfillment.sql`
12. `supabase/migrations/20260810130039_add_openai_web_price_evidence.sql`
13. `supabase/migrations/20260810131441_index_price_evidence_platform.sql`
14. `supabase/migrations/20260810143004_add_cross_searched_reptile_shops.sql`
15. `supabase/migrations/20260812152432_expand_listing_keyword_facets.sql`
16. `supabase/migrations/20260813105116_expand_location_only_shop_directory.sql`
17. `supabase/migrations/20260813113705_expand_verified_reptile_shop_directory.sql`
18. `supabase/seed.sql`
19. `supabase/functions/collect-feedle/`
20. `supabase/functions/collect-public-shops/`
21. `supabase/functions/import-listings/`
22. `supabase/functions/discover-public-sources/`

현재 연결 프로젝트와 로컬 호출 비밀값은 `.env.local`에만 있습니다. 서비스 역할 키는 로컬 저장소나 브라우저에 보관하지 않고 Edge Function의 Supabase 관리 환경에서만 사용합니다.

## 검증

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## 대표 이미지

홈 탐색 카드는 표시 가격은 현재 최저 호가로 유지하되, 사진은 해당 모프·형질의 전체 가격 풀 중앙값에 가장 가까운 이미지 보유 매물에서 고릅니다. 같은 매물 ID나 이미지 URL은 다른 홈 카드에서 다시 쓰지 않으며, 사용할 수 있는 고유 매물 사진이 없거나 원격 이미지가 실패할 때만 `public/morphs/`의 대표 사진으로 대체합니다. 대표 사진의 개별 출처와 권리 상태는 `public/morphs/ATTRIBUTION.md`에 있습니다. 실제 매물 카드는 항상 원문 썸네일만 사용하며, 썸네일이 없거나 불러오지 못하면 `이미지 없음`을 표시합니다.

## 현재 범위 밖

- 공개 배포 및 상업 운영
- 관리자용 웹 화면(보호된 CSV CLI는 구현됨)
- 이미지 기반 모프 판정
- 실거래가·적정가 예측
- 수집 범위 밖 플랫폼의 무인 크롤링
