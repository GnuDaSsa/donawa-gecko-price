# Crested Gecko Morph Price Finder

## POC / MVP Codex Handoff

> 이 문서는 Codex 또는 기타 코딩 에이전트가 프로젝트의 의도, 범위, 화면 구조, 데이터 구조, 수집 방식, 가격 모니터링, 매물 라이프사이클을 오해하지 않고 구현하기 위한 핸드오프 문서다.
>
> **중요:** 이 프로젝트는 AI가 사진을 보고 크레스티드 게코 모프를 판정하는 서비스가 아니다.
>
> 핵심은 판매자가 작성한 매물의 `제목 / 본문 / 가격 / 이미지 / 원문 URL`을 수집하고, **키워드 기반으로 통용 모프명과 세부 특성을 정규화한 뒤 플랫폼별 최저 호가를 비교하는 서비스**다.

---

# 0. 한 줄 정의

**크레스티드 게코의 대표 모프를 사진으로 탐색하고, 선택한 모프의 플랫폼별 최저 호가를 다나와처럼 비교하며, 보기 전환 토글을 누르면 실제 판매 개체의 이미지·가격·특성 태그·원문 링크를 확인할 수 있는 웹사이트를 구축한다.**

---

# 1. POC / MVP의 목적

현재 크레스티드 게코 시장은 같은 이름의 모프라도 판매처와 판매자에 따라 가격 차이가 크다.

사용자는 특정 모프의 현재 매물을 확인하려면 여러 플랫폼을 각각 방문해야 한다.

초기 참고 플랫폼 후보:

* 피들
* 파사모
* 동물다락
* 규모가 있고 공개 웹 매물이 존재하는 전문샵 일부

이 서비스는 여러 소스의 매물을 하나의 데이터 구조로 통합하여 아래 사용자 흐름을 제공한다.

```text
대표 모프 이미지 탐색
        ↓
원하는 모프 클릭
        ↓
플랫폼별 현재 최저 호가 비교
        ↓
[가격 비교형] ↔ [이미지형] 토글
        ↓
실제 개체 확인
        ↓
원문 URL 이동
```

POC에서 가장 중요한 검증 항목은 아래다.

1. 대표 모프를 사진으로 고르는 방식이 직관적인가.
2. 여러 플랫폼의 가격을 한 화면에서 비교하는 것이 유용한가.
3. 플랫폼별 최저가가 실제 탐색 시간을 줄여주는가.
4. 가격형 / 이미지형 전환이 유용한가.
5. 실제 판매 매물의 원문 URL로 자연스럽게 이동할 수 있는가.
6. 가격 및 판매상태 이력을 지속적으로 저장할 수 있는가.

---

# 2. POC에서 과도하게 구현하지 말 것

아래 기능은 현재 요구사항이 아니다.

* 이미지 AI 모프 판정
* AI 기반 품질 평가
* AI 기반 적정가격 예측
* AI가 고퀄/저퀄 판단
* 학술 수준의 유전 온톨로지
* 브리더 혈통 검증
* 자체 거래 중개
* 결제
* 자체 채팅
* 판매자 회원 시스템
* 플랫폼 공식 API 제휴
* 국내 모든 전문샵 크롤링
* 초단위/분단위 실시간 가격 감시
* 사진을 분석하여 풀핀/슈퍼달마 여부 판정
* 복잡한 머신러닝 모델

**POC의 핵심은 수집 → 정규화 → 비교 → 원문 이동이다.**

AI는 없어도 된다.

---

# 3. 핵심 제품 철학

## 3.1 메인은 학술 분류표가 아니라 검색 진입점이다

사용자는 크레스티드 게코를 학술적으로 분류하기 위해 이 사이트에 오는 것이 아니라 특정 모프의 가격과 매물을 보기 위해 들어온다.

따라서 메인 카드의 기준은 다음과 같다.

> 국내 거래시장에서 사용자가 독립적인 이름으로 검색할 가능성이 높은가?

예:

* 릴리화이트
* 아잔틱
* 릴잔틱
* 카푸치노
* 프라푸치노
* 달마시안
* 할리퀸
* 핀스트라이프
* 팬텀
* 세이블
* 소프트스케일
* 기타 실제 거래시장에서 통용되는 대표 이름

모프 개수는 고정하지 않는다.

**24종, 30종 등 특정 숫자를 코드에 하드코딩하지 않는다.**

---

# 4. 메인 페이지

## 4.1 레이아웃

PC 기준:

```text
6열 × N행
```

모프 개수에 따라 행 수는 자동 증가한다.

예:

```text
17개 → 6 + 6 + 5
24개 → 6 × 4
31개 → 6 × 5 + 1
```

반응형 권장:

```text
Desktop : 6 columns
Tablet  : 3~4 columns
Mobile  : 2 columns
```

CSS Grid 사용 권장.

```css
.morph-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}
```

breakpoint에서 4 / 3 / 2열로 축소한다.

---

# 5. 메인 모프 카드

카드는 최대한 단순하게 유지한다.

```text
┌────────────────────┐
│                    │
│                    │
│    대표 모프 사진   │
│                    │
│                    │
├────────────────────┤
│ 릴잔틱              │
│ Lilly Axanthic     │  ← 선택사항
└────────────────────┘
```

필수:

* 대표 이미지
* 한글 표시명

선택:

* 작은 영문명

메인 카드에는 기본적으로 넣지 않는다.

* 가격
* 플랫폼
* 긴 설명
* 유전 설명
* 세부 Trait
* 최저가 배지

목적은 **도감처럼 사진을 보고 모프를 선택하는 경험**이다.

---

# 6. 대표 모프 데이터

예:

```json
{
  "id": "lilly_axanthic",
  "name_ko": "릴잔틱",
  "name_en": "Lilly Axanthic",
  "representative_image": "/morphs/lilly-axanthic.webp",
  "visible_on_home": true,
  "display_order": 4
}
```

`visible_on_home = true`인 데이터를 모두 가져와 표시한다.

관리자는 향후 다음을 조정할 수 있어야 한다.

* 대표 이미지
* 표시 순서
* 노출/비노출
* 검색 별칭

POC에서는 별도 관리자 페이지 없이 DB/JSON 직접 수정도 허용한다.

---

# 7. MORPH와 TRAIT의 분리

이 프로젝트에서 가장 중요한 분류 원칙이다.

## 7.1 MORPH

가격 비교의 기본 그룹이 되는 대표 검색 카테고리다.

예:

```text
릴리화이트
아잔틱
릴잔틱
카푸치노
프라푸치노
달마시안
할리퀸
핀스트라이프
...
```

## 7.2 TRAIT

개별 판매 매물에 부착되는 세부 특성 태그다.

예:

```text
풀핀
파셜핀
슈퍼달마
잉크스팟
트라이컬러
화이트월
솔리드백
레드베이스
옐로우베이스
하이 익스프레션
...
```

**TRAIT를 독립 MORPH 가격 그룹으로 자동 승격시키지 않는다.**

---

# 8. 분류 예시

## 예시 A

원문:

```text
릴잔틱 풀핀 암컷 18g 45
```

정규화:

```text
MORPH       = 릴잔틱
TRAITS      = 풀핀
SEX         = FEMALE
WEIGHT_G    = 18
PRICE       = 450000
```

## 예시 B

원문:

```text
레드 잉크스팟 슈퍼달마 암컷
```

정규화:

```text
MORPH       = 달마시안
TRAITS      = 레드 / 잉크스팟 / 슈퍼달마
SEX         = FEMALE
```

`슈퍼달마시안`을 별도 메인 카드로 만들 필요는 없다.

## 예시 C

원문:

```text
익스트림 할리퀸 풀핀
```

정규화:

```text
MORPH       = 할리퀸
TRAITS      = 익스트림 / 풀핀
```

---

# 9. TRAIT는 가격 결과 카드에서 보여준다

TRAIT의 중요한 역할은 **사용자가 같은 모프의 개체 차이를 빠르게 이해하도록 돕는 것**이다.

가격 비교형 예:

```text
피들

릴잔틱 암컷 · 18g
#풀핀  #트라이컬러

450,000원

[원문 보기 ↗]
```

이미지형 예:

```text
┌──────────────────────┐
│                      │
│     실제 개체 사진    │
│                      │
├──────────────────────┤
│ 릴잔틱 · 암컷 · 18g   │
│ #풀핀 #트라이컬러     │
│                      │
│ 450,000원            │
│ 피들                 │
│                      │
│ [원문 보기 ↗]        │
└──────────────────────┘
```

---

# 10. TRAIT 필터

POC 우선순위는 다음과 같다.

## Phase 1

* Trait 저장
* Trait 표시

## Phase 2

태그 클릭 시 필터링.

예:

```text
릴잔틱
+
#풀핀
```

선택 시 전체 결과와 플랫폼별 최저가를 해당 조건으로 다시 계산한다.

## Phase 3

Trait 기반 세부 가격 비교.

POC에서 Phase 1까지만 구현해도 성공으로 본다.

---

# 11. 판매자 홍보 문구

다음과 같은 표현은 구조화된 Trait로 사용하지 않는다.

```text
극상
고퀄
초고퀄
탑퀄
하이엔드
미친퀄
강추
귀한 개체
오늘만
급처
```

예:

```text
극상 레드 풀핀 릴잔틱 급처
```

분류:

```text
MORPH  = 릴잔틱
TRAITS = 레드 / 풀핀
```

`극상`, `급처`는 원문 제목에서만 보존한다.

---

# 12. Morph Alias Dictionary

판매자는 동일한 모프를 여러 방식으로 적는다.

예:

```yaml
LILLY_WHITE:
  display_name: 릴리화이트
  aliases:
    - 릴리화이트
    - 릴리 화이트
    - 릴리
    - 릴화
    - lilly white
    - lillywhite
    - lw

AXANTHIC:
  display_name: 아잔틱
  aliases:
    - 아잔틱
    - 아잔
    - axanthic

LILLY_AXANTHIC:
  display_name: 릴잔틱
  aliases:
    - 릴잔틱
    - 릴잔
    - 릴리잔틱
    - 릴리 아잔틱
    - lilly axanthic
    - lilly white axanthic

CAPPUCCINO:
  display_name: 카푸치노
  aliases:
    - 카푸치노
    - 카푸
    - cappuccino

FRAPPUCCINO:
  display_name: 프라푸치노
  aliases:
    - 프라푸치노
    - 프라푸
    - frappuccino
```

---

# 13. Trait Alias Dictionary

예:

```yaml
FULL_PIN:
  display_name: 풀핀
  type: PATTERN_DETAIL
  aliases:
    - 풀핀
    - 풀 핀
    - full pin
    - full pinstripe
    - 100% pin

SUPER_DALMATIAN:
  display_name: 슈퍼달마
  type: EXPRESSION
  aliases:
    - 슈퍼달마
    - 슈달
    - 슈퍼 달마
    - 슈퍼달마시안
    - super dalmatian

INKSPOT:
  display_name: 잉크스팟
  type: SPOT_DETAIL
  aliases:
    - 잉크스팟
    - 잉크 스팟
    - inkspot
    - ink spot

RED_BASE:
  display_name: 레드
  type: COLOR
  aliases:
    - 레드
    - red
    - red base
```

---

# 14. 분류 엔진

POC에서는 AI를 사용하지 않는다.

기본 흐름:

```text
원문 title + description
       ↓
문자열 Normalize
       ↓
조합 모프 우선 탐색
       ↓
일반 모프 탐색
       ↓
Trait 탐색
       ↓
성별 탐색
       ↓
체중 탐색
       ↓
가격 탐색
       ↓
정규화 Listing 생성
```

문자열 Normalization:

* lowercase
* trim
* 다중 공백 제거
* 필요한 경우 특수문자 정리
* 원문은 별도로 보존

---

# 15. 키워드 매칭 우선순위

긴 표현을 먼저 처리한다.

예:

```text
릴잔틱
```

에서 `릴리` 또는 `아잔틱`을 먼저 잡지 않는다.

권장:

```text
1. 조합명 / 긴 모프명
2. 정식 모프명
3. 축약 별칭
4. Trait
5. Sex
6. Weight
7. Price
```

---

# 16. Het 예외

예:

```text
릴리화이트 100% 헷 아잔틱
```

이를 `릴잔틱`으로 분류하면 안 된다.

최소한 아래 표현을 감지한다.

```text
헷
het
100% het
66% het
50% het
pos het
possible het
```

POC에서는:

```text
MORPH = 릴리화이트
```

로 처리하고 `헷 아잔틱`은 원문 또는 별도 메모 필드에 보존해도 된다.

완전한 유전정보 엔진은 만들 필요 없다.

---

# 17. 가격 파싱

예상 입력:

```text
45
45만
45만원
450000
450,000
```

정규화 목표:

```text
450000
```

단위 없는 `45`는 사이트 문맥에 따라 위험할 수 있으므로 플랫폼별 Parser에서 다르게 처리하거나 수동확인 대상으로 둘 수 있다.

---

# 18. 가격 유형

```text
FIXED
CONTACT
BUNDLE
AUCTION
UNKNOWN
```

최저가 계산에는 기본적으로:

```text
status = ACTIVE
AND price_type = FIXED
AND current_price IS NOT NULL
```

만 포함한다.

---

# 19. 가격 없는 매물

다음 표현은 최저가에서 제외한다.

```text
가격문의
협의
연락
DM
교환
문의
```

저장:

```text
price = null
price_type = CONTACT
```

---

# 20. 묶음 판매

예:

```text
두 마리 일괄 50
```

자동으로 마리당 25만원으로 계산하지 않는다.

```text
price = 500000
price_type = BUNDLE
bundle_count = 2
```

기본 최저가 비교에서는 제외를 권장한다.

---

# 21. 하나의 글에 여러 개체

예:

```text
1번 릴리 수 20
2번 아잔틱 미구분 35
3번 릴잔틱 암 60
```

장기적으로:

```text
SOURCE_POST
├─ LISTING_ITEM_1
├─ LISTING_ITEM_2
└─ LISTING_ITEM_3
```

구조가 이상적이다.

그러나 POC에서는 자동 분리가 어렵다면 관리자가 수동으로 각각 등록할 수 있다.

---

# 22. 플랫폼 전략

초기 소스 후보:

```text
피들
파사모
동물다락
공개 웹 전문샵 일부
```

모든 플랫폼을 동일한 방식으로 수집할 필요가 없다.

POC에서 중요한 것은 **최종 Listing 구조를 동일하게 만드는 것**이다.

---

# 23. 플랫폼별 수집 방식

## 피들 / 공개 웹샵

가능하면 자동 Collector.

```text
AUTO_WEB
```

수집 후보:

* 제목
* 가격
* 이미지 URL
* 원문 URL
* 성별
* 체중
* 판매상태
* 게시/업데이트 날짜
* 판매자 또는 샵명

## 파사모

POC에서는 무인 전체 카페 크롤링을 핵심 전제로 두지 않는다.

권장:

```text
MANUAL
또는
BROWSER_HELPER
```

예:

사용자가 본 매물 URL과 주요 정보를 관리자 입력폼에 넣는다.

또는 향후 현재 열어둔 페이지의 정보만 읽어 입력폼에 전달하는 브라우저 보조 기능을 검토한다.

## 동물다락

자동 수집이 불편하면:

```text
CSV_IMPORT
MANUAL
```

허용.

POC는 데이터 수집 자동화율 경쟁이 아니다.

---

# 24. 취합된 데이터 저장 위치

POC/MVP 권장:

```text
Supabase PostgreSQL
```

권장 이유:

* PostgreSQL 제공
* 개발/운영이 쉬움
* JSONB 사용 가능
* SQL Editor
* 향후 Storage/Auth 확장 가능
* Next.js 연동 편함

SQLite도 데모는 가능하지만 **가격 모니터링과 이력 저장을 고려하면 Supabase PostgreSQL을 우선 선택한다.**

---

# 25. 저장 데이터의 3계층

## A. 구조화 데이터

실제 검색과 가격비교에 사용한다.

```text
platform
morph
traits
price
sex
weight
status
url
image_url
timestamps
```

## B. Raw Data

수집 당시 원본을 JSONB로 보존한다.

```json
{
  "title": "릴잔틱 풀핀 암 18g 45",
  "price_text": "45",
  "description": "...",
  "image_url": "...",
  "url": "..."
}
```

이유:

파싱 규칙을 나중에 개선했을 때 사이트를 다시 크롤링하지 않고 재분류할 수 있다.

## C. 이미지

POC에서는 실제 판매 이미지 파일을 직접 저장하지 않는 것을 기본값으로 한다.

```text
image_url
```

만 저장.

우리 서비스의 대표 모프 이미지만:

```text
/public/morphs/
```

또는 자체 Storage에 저장한다.

외부 이미지 Hotlink가 막힌 소스는 추후 별도 대응한다.

---

# 26. DB 테이블 개요

POC 핵심:

```text
platforms
morphs
traits
listings
listing_traits
listing_price_history
listing_status_history
```

관계:

```text
PLATFORM
   │
   └── LISTING ───── MORPH
          │
          ├── TRAITS
          ├── PRICE HISTORY
          └── STATUS HISTORY
```

---

# 27. platforms

```sql
platforms
---------
id
name
homepage_url
collector_type
is_active
created_at
updated_at
```

`collector_type`:

```text
AUTO_WEB
MANUAL
BROWSER_HELPER
CSV_IMPORT
```

---

# 28. morphs

```sql
morphs
------
id
slug
name_ko
name_en
aliases JSONB
representative_image
visible_on_home
display_order
created_at
updated_at
```

---

# 29. traits

```sql
traits
------
id
slug
name_ko
name_en
trait_type
aliases JSONB
is_filterable
created_at
updated_at
```

`trait_type` 예:

```text
PATTERN_DETAIL
EXPRESSION
COLOR
SPOT_DETAIL
OTHER
```

---

# 30. listings

현재 매물 상태를 담당하는 가장 중요한 테이블이다.

```sql
listings
--------
id UUID PRIMARY KEY

platform_id
external_id

morph_id

original_title
original_description
original_url
image_url

current_price
price_type
currency

sex
weight_g
bundle_count

status

first_seen_at
last_seen_at
last_checked_at
sold_detected_at

raw_data JSONB

created_at
updated_at
```

고유성은 가능하면:

```text
(platform_id, external_id)
```

Unique.

External ID가 없다면:

```text
(platform_id, original_url)
```

을 Unique로 사용한다.

---

# 31. listing_traits

한 매물에 여러 Trait가 붙을 수 있다.

```sql
listing_traits
--------------
listing_id
trait_id
source_text
created_at
```

Unique:

```text
(listing_id, trait_id)
```

---

# 32. listing_price_history

현재 가격을 단순 덮어쓰기만 하지 않는다.

```sql
listing_price_history
---------------------
id
listing_id
price
observed_at
```

예:

```text
8/07  450000
8/10  420000
8/13  390000
```

`listings.current_price`는 현재 또는 마지막 확인 가격.

History는 과거 변경 이력이다.

가격이 그대로라면 매 수집마다 History를 추가하지 않는다.

**가격이 변경되었을 때만 추가한다.**

---

# 33. listing_status_history

```sql
listing_status_history
----------------------
id
listing_id
old_status
new_status
observed_at
reason
```

예:

```text
8/07 NEW → ACTIVE
8/15 ACTIVE → SOLD
```

---

# 34. Listing Status

권장 상태:

```text
NEW
ACTIVE
SOLD
DELETED
STALE
UNKNOWN
```

## NEW

처음 수집한 직후 내부 상태.

## ACTIVE

현재 판매 중임을 확인.

## SOLD

사이트가 판매완료 / 분양완료 / 품절 등을 명확히 표시.

## DELETED

페이지가 삭제되거나 지속적인 404.

**DELETED는 SOLD와 다르다.**

## STALE

오랫동안 확인되지 않거나 상태가 불명확.

## UNKNOWN

일시적인 네트워크/파싱 문제 등으로 이번 확인에서 판정 불가.

---

# 35. 판매완료 매물 처리 원칙

판매완료 매물을 DB에서 삭제하지 않는다.

```text
ACTIVE
→ SOLD
```

상태만 변경한다.

현재 최저가 계산에서는:

```text
ACTIVE
```

만 포함한다.

SOLD는 향후 과거 호가 분석 데이터로 사용한다.

---

# 36. 판매완료 가격의 의미

매물이:

```text
450,000원
```

에 올라왔다가 `SOLD`가 되었다고 해서 실제 450,000원에 거래됐다고 단정할 수 없다.

네고 가능성이 있기 때문이다.

따라서 해당 데이터는:

```text
last_known_asking_price
```

즉:

> 판매완료 직전 마지막으로 확인된 호가

로 취급한다.

**실거래가라고 표현하지 않는다.**

---

# 37. 매물이 사라졌을 때

한 번 검색에서 사라졌다고 바로 SOLD 처리하지 않는다.

예:

```text
1회 확인 실패
→ UNKNOWN 또는 기존 ACTIVE 유지

2~3회 연속 확인 실패
→ STALE / DELETED 후보

명확한 SOLD 표기 발견
→ SOLD
```

예:

```text
8/07 21:00 정상 확인
8/08 09:00 확인 실패
8/08 21:00 확인 실패
8/09 09:00 404

→ DELETED
```

중요:

```text
DELETED != SOLD
```

---

# 38. first_seen_at / last_seen_at / last_checked_at

반드시 구분한다.

## first_seen_at

처음 수집한 시간.

## last_seen_at

매물이 실제 존재하는 것을 마지막으로 확인한 시간.

## last_checked_at

Collector가 해당 매물을 마지막으로 확인하려고 시도한 시간.

예:

```text
last_seen_at     = 2026-08-07 21:00
last_checked_at  = 2026-08-08 09:00
```

이면:

> 8월 8일 9시에 확인했지만 해당 매물의 존재는 확인되지 않았다.

라는 의미다.

---

# 39. 가격 모니터링 주기

POC 기본값:

```text
공개 자동수집 플랫폼
하루 2회
```

권장 시간:

```text
09:00
21:00
```

이유:

크레스티드 게코 매물은 주식처럼 분 단위 갱신이 필요하지 않다.

초기 권장:

```text
피들 / 거래량 많은 공개 플랫폼 : 12시간
전문샵                          : 24시간도 가능
파사모                          : 수동 입력 시
동물다락                        : POC에서는 수동 가능
```

향후 필요 시:

```text
거래량 많은 플랫폼 : 6시간
일반 플랫폼        : 12시간
정적 전문샵        : 24시간
```

으로 조정한다.

---

# 40. Scheduler

POC에서 복잡한 별도 서버가 반드시 필요한 것은 아니다.

후보:

```text
GitHub Actions
Vercel Cron
Supabase scheduled job
작은 Worker
```

기본:

```text
09:00 collector run
21:00 collector run
```

---

# 41. Collector Upsert Logic

매번 전체 DB를 갈아엎지 않는다.

```text
Collector가 매물 발견
        ↓
platform + external_id 존재?
      ↙        ↘
    YES        NO
     ↓          ↓
기존 Listing   신규 Listing 생성
비교
     ↓
가격 변경?
→ Price History 추가

상태 변경?
→ Status History 추가

last_seen_at 갱신
last_checked_at 갱신
```

---

# 42. 가격 변경 처리

예:

처음:

```text
450000
```

다음 수집:

```text
420000
```

처리:

```text
listings.current_price
450000 → 420000
```

동시에:

```text
listing_price_history
420000 / observed_at
```

추가.

가격이 변하지 않았으면 매번 History Row를 추가하지 않는다.

---

# 43. 상태 변경 처리

예:

```text
ACTIVE → SOLD
```

처리:

```text
listings.status = SOLD
listings.sold_detected_at = now()
```

동시에:

```text
listing_status_history
```

추가.

---

# 44. 현재 최저가 계산

기본 쿼리 논리:

```sql
WHERE
    morph_id = :selectedMorph
AND status = 'ACTIVE'
AND price_type = 'FIXED'
AND current_price IS NOT NULL
```

그 후 Platform별:

```text
MIN(current_price)
```

를 계산한다.

---

# 45. 가격 비교형 화면

모프 클릭 후 기본 진입 화면이다.

예:

```text
릴잔틱

현재 판매 매물 36건

[가격 비교] [이미지로 보기]

플랫폼별 최저 호가
────────────────────────────

피들
320,000원
릴잔틱 미구분 · 7g
#풀핀
오늘 21:00 확인
[원문 보기 ↗]

파사모
350,000원
릴잔틱 암컷
#트라이컬러
사용자 등록
[원문 보기 ↗]

A샵
390,000원
릴잔틱 암컷 · 15g
오늘 09:00 확인
[원문 보기 ↗]
```

---

# 46. “시세” 대신 “현재 최저 호가”

POC에서는 실제 거래가격을 알 수 없으므로 표현을 정확히 한다.

권장:

```text
플랫폼별 최저 호가
현재 판매 중 최저가
현재 등록가격
```

피할 표현:

```text
실거래가
확정 시세
실제 판매가격
```

---

# 47. 가격 비교형 데이터

각 플랫폼 Row 또는 Card에 표시할 정보.

필수:

* 플랫폼
* 최저 호가
* 최저가 매물 제목
* 원문 URL

권장:

* 이미지 썸네일
* 성별
* 체중
* Trait Tags
* Last Checked At

---

# 48. 이미지형 토글

사용자가:

```text
[가격 비교] ↔ [이미지로 보기]
```

를 전환한다.

이미지형에서는 실제 매물 카드를 보여준다.

PC 권장:

```text
4열
```

예:

```text
[사진]       [사진]       [사진]       [사진]

릴잔틱       릴잔틱       릴잔틱       릴잔틱
#풀핀        #트라이       #레드         #화이트월

32만         35만         38만          42만
피들         파사모       피들          A샵
```

---

# 49. 이미지형 정렬

기본:

```text
가격 낮은 순
```

향후:

```text
최신순
가격 낮은 순
가격 높은 순
플랫폼별
```

추가 가능.

POC에서는 `가격 낮은 순`만 있어도 충분하다.

---

# 50. 원문 URL

모든 매물은 반드시 원문 URL을 저장한다.

```text
original_url
```

화면:

```text
[원문 보기 ↗]
```

새 탭:

```html
target="_blank"
rel="noopener noreferrer"
```

---

# 51. 플랫폼 URL도 별도 저장

```text
platform.homepage_url
listing.original_url
```

두 종류를 분리한다.

개별 매물이 삭제되어도 플랫폼 메인 링크는 유지 가능하다.

---

# 52. 이미지 URL

POC에서는:

```text
image_url
```

을 저장한다.

이미지가 깨지면:

```text
이미지 없음
```

Fallback UI를 보여주고 원문 링크는 유지한다.

이미지 Hotlink 문제 때문에 전체 서비스를 막지 않는다.

---

# 53. 판매완료 매물의 사용자 노출

기본 화면:

```text
ACTIVE only
```

SOLD / DELETED / STALE은 숨긴다.

향후:

```text
[현재 매물]
[판매완료 포함]
```

토글 가능.

POC에서는 이 토글을 구현하지 않아도 된다.

---

# 54. 과거 매물을 왜 보존하는가

몇 달 뒤 다음 기능으로 확장 가능하다.

```text
가격 변화 추이
등록 후 판매완료까지 기간
가격 인하 횟수
최근 90일 마지막 호가 분포
모프별 등록량 변화
```

따라서 SOLD를 삭제하지 않는다.

---

# 55. Raw Snapshot 정책

POC:

```text
listings.raw_data JSONB
```

에 마지막 원본 데이터를 저장해도 충분하다.

향후 별도 Snapshot Table로 확장 가능.

모든 수집 때 Snapshot을 쌓기보다는:

```text
가격 변경
상태 변경
본문 중요 변경
```

이 발생한 경우만 추가 Snapshot을 남기는 것이 효율적이다.

---

# 56. 중복 처리

첫 단계 중복 방지:

```text
UNIQUE(platform_id, external_id)
```

External ID가 없으면:

```text
UNIQUE(platform_id, original_url)
```

다른 플랫폼에 같은 개체가 중복 등록된 것까지 POC에서 자동 판정할 필요는 없다.

향후 이미지 Hash 등을 이용 가능하다.

---

# 57. 파사모 데이터

POC에서는 파사모를 자동 무인 대량 크롤링하는 것을 필수 요구사항으로 두지 않는다.

가능한 MVP 입력 방식:

```text
관리자 입력폼

플랫폼
원문 URL
제목
본문
가격
이미지 URL
성별
체중
```

저장 시 동일 Parser를 통과해:

```text
MORPH
TRAITS
```

를 추출한다.

즉 수동 입력 데이터와 자동 수집 데이터를 동일 DB에 넣는다.

---

# 58. 수동 등록 화면

권장:

```text
플랫폼      [파사모 ▼]

원문 URL
[...........................]

제목
[...........................]

본문
[...........................]

가격
[...........................]

이미지 URL
[...........................]

[파싱 미리보기]

모프
릴잔틱

Traits
#풀핀

Sex
암컷

Weight
18g

Price
450,000

[저장]
```

---

# 59. Parser 결과 수정

완벽한 자동분류를 목표로 하지 않는다.

관리자가:

```text
모프 변경
Trait 추가/삭제
가격 수정
성별 수정
체중 수정
```

할 수 있어야 한다.

관리자 UI가 부담되면 초기에는 DB 직접 수정도 허용한다.

---

# 60. 프론트엔드 추천

```text
Next.js
TypeScript
React
```

UI:

```text
Tailwind CSS
```

페이지 예:

```text
/
└─ 모프 메인

/morph/[slug]
└─ 모프별 가격 비교

/admin/listings/new
└─ 수동 매물 등록

/admin
└─ 최소 관리 화면
```

---

# 61. 백엔드 권장

POC:

```text
Next.js Server Actions / Route Handlers
+
Supabase
```

별도 FastAPI를 반드시 만들 필요는 없다.

수집기를 Python으로 만들 경우:

```text
Python Collectors
→ Supabase PostgreSQL
```

구조로 간다.

---

# 62. 수집기 권장

정적 HTML:

```text
requests
BeautifulSoup
```

JS 렌더링 필요:

```text
Playwright
```

사이트별 Adapter를 독립시킨다.

```text
collectors/
├── base.py
├── feedle.py
├── shop_a.py
└── ...
```

공통 인터페이스 예:

```python
class Collector:
    def fetch_listings(self) -> list[RawListing]:
        ...
```

---

# 63. NormalizedListing 예

```ts
interface NormalizedListing {
  platformId: string;
  externalId?: string;

  originalTitle: string;
  originalDescription?: string;
  originalUrl: string;
  imageUrl?: string;

  morphId?: string;
  traitIds: string[];

  price?: number;
  priceType:
    | "FIXED"
    | "CONTACT"
    | "BUNDLE"
    | "AUCTION"
    | "UNKNOWN";

  sex?: "MALE" | "FEMALE" | "UNKNOWN";
  weightG?: number;

  status:
    | "NEW"
    | "ACTIVE"
    | "SOLD"
    | "DELETED"
    | "STALE"
    | "UNKNOWN";

  rawData: unknown;
}
```

---

# 64. 가격 업데이트 서비스 의사코드

```python
for raw_listing in collector.fetch_listings():

    normalized = normalize(raw_listing)

    existing = find_listing(
        platform=normalized.platform,
        external_id=normalized.external_id,
        url=normalized.original_url
    )

    if not existing:
        create_listing(normalized)
        add_status_history("NEW", "ACTIVE")

        if normalized.price:
            add_price_history(normalized.price)

        continue

    if normalized.price != existing.current_price:
        update_current_price(normalized.price)
        add_price_history(normalized.price)

    if normalized.status != existing.status:
        add_status_history(
            existing.status,
            normalized.status
        )
        update_status(normalized.status)

    update_last_seen()
    update_last_checked()
```

---

# 65. Collector 실패 시

네트워크 오류나 HTML 구조 변경으로 Collector가 실패할 수 있다.

그 경우 전체 플랫폼 매물을 SOLD/DELETED 처리하면 안 된다.

```text
Collector 실행 실패
→ 기존 Listing 상태 변경 없음
→ Error Log만 기록
```

즉:

> 수집 실패와 매물이 사라진 것은 다르다.

---

# 66. Collector Health

향후 권장:

```text
last_success_at
last_failure_at
last_error
```

관리 화면 예:

```text
피들
최근 성공: 오늘 21:01

A샵
최근 실패: 오늘 21:02
HTML selector not found
```

POC에서는 Console/Log만 있어도 충분하다.

---

# 67. 최저가 Freshness

사용자가 최신성을 알 수 있도록:

```text
오늘 21:00 확인
12시간 전 확인
```

등을 표시하는 것이 좋다.

오래된 데이터:

```text
48시간 이상 미확인
```

이면:

```text
업데이트 지연
```

배지를 표시하는 방향을 고려한다.

---

# 68. 향후 세로형 가격 분포 UI

이전 논의에서 플랫폼별 세로 박스플롯 아이디어가 있었지만 **POC 필수 기능은 아니다.**

우선:

```text
플랫폼별 최저 호가
```

부터 구현한다.

데이터가 충분히 쌓인 후:

```text
파사모
피들
동물다락
A샵
```

각각의 가격 분포를 세로형 Box Plot으로 나타낼 수 있다.

이 기능을 위해 현재부터 가격 History와 과거 Listing을 보존한다.

---

# 69. Box Plot 확장 원칙

향후 구현 시:

```text
현재 ACTIVE 호가 분포
```

또는:

```text
과거 마지막 호가 분포
```

를 명확히 구분한다.

실거래가로 부르지 않는다.

표본이 너무 적은 플랫폼은 Box Plot을 그리지 않는다.

---

# 70. POC 구현 우선순위

## Priority 0 — 기본 골격

* Next.js
* Supabase 연결
* DB Schema
* Seed Data

## Priority 1 — 메인

* 6열 × N행 Morph Grid
* 대표 이미지
* 모프명
* 상세페이지 이동

## Priority 2 — 상세 가격 비교

* 선택 Morph의 ACTIVE Listing 조회
* 플랫폼별 최저가
* 원문 URL

## Priority 3 — 이미지형

* 보기 전환 Toggle
* 이미지 카드
* 가격
* 플랫폼
* Trait Tag
* URL

## Priority 4 — Parser

* Morph Alias
* Trait Alias
* Sex
* Weight
* Price

## Priority 5 — 실제 Collector 1개

* 피들 또는 구현하기 쉬운 공개 플랫폼

## Priority 6 — History

* Price History
* Status History
* Listing Upsert

## Priority 7 — 수동 입력

* 파사모/기타 플랫폼 테스트 데이터 등록

## Priority 8 — Scheduler

* 하루 2회 자동 실행

---

# 71. POC 성공 기준

다음 시나리오가 작동하면 POC는 성공이다.

```text
1. 사용자가 메인에서 릴잔틱 사진을 누른다.

2. 릴잔틱 상세페이지가 열린다.

3. 피들 / 파사모 / 기타 플랫폼의 현재 최저 호가가 표시된다.

4. 각 가격 옆에서 실제 최저가 매물의 Trait가 보인다.

5. 원문 보기 버튼을 누르면 실제 판매페이지가 새 탭으로 열린다.

6. 이미지 보기 토글을 누르면 릴잔틱 실제 매물들의 사진이 카드형으로 나타난다.

7. 각 카드에 가격 / 플랫폼 / Trait / URL이 보인다.

8. Collector가 다음 실행에서 가격 변경을 발견하면
   current_price가 갱신되고 History가 남는다.

9. 판매완료 매물은 현재 최저가에서 제외되지만 DB에는 남는다.
```

---

# 72. UX 핵심 문구

메인:

```text
크레스티드 게코 모프별 가격 비교
원하는 모프를 선택하세요
```

상세:

```text
릴잔틱
현재 판매 중 매물 36건

[가격 비교] [이미지로 보기]
```

가격:

```text
플랫폼별 최저 호가
```

링크:

```text
원문 보기
매물 보기
판매처에서 보기
```

---

# 73. UI 핵심 원칙

* 화려한 대시보드보다 탐색성 우선
* 모프 사진이 크게 보여야 함
* 메인에서 정보 과부하 금지
* 가격 비교에서는 숫자를 빠르게 스캔할 수 있어야 함
* 이미지형에서는 개체 사진이 가장 중요
* Trait는 작은 Badge/Tag
* URL 이동 버튼을 명확하게
* 데이터 확인 시각 표시
* SOLD는 현재 결과에서 기본 숨김
* 모바일에서도 이용 가능

---

# 74. Seed / Mock Data

실제 Collector가 완성되기 전에는 Mock Data로 전체 UX를 먼저 완성한다.

예:

```json
[
  {
    "platform": "피들",
    "morph": "릴잔틱",
    "title": "릴잔틱 풀핀 미구분 7g",
    "traits": ["풀핀"],
    "price": 320000,
    "status": "ACTIVE",
    "image_url": "/mock/lilly-axanthic-1.jpg",
    "original_url": "https://example.com/1"
  },
  {
    "platform": "파사모",
    "morph": "릴잔틱",
    "title": "릴잔틱 트라이 암컷",
    "traits": ["트라이컬러"],
    "price": 350000,
    "status": "ACTIVE",
    "image_url": "/mock/lilly-axanthic-2.jpg",
    "original_url": "https://example.com/2"
  }
]
```

실제 Collector가 준비되면 동일 DB Schema에 넣기 때문에 UI 코드는 변경하지 않는다.

---

# 75. 추천 프로젝트 구조

```text
/
├── app/
│   ├── page.tsx
│   ├── morph/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── admin/
│   │   └── listings/
│   │       └── new/
│   │           └── page.tsx
│   └── api/
│
├── components/
│   ├── MorphCard.tsx
│   ├── MorphGrid.tsx
│   ├── PriceComparison.tsx
│   ├── ListingCard.tsx
│   ├── TraitBadge.tsx
│   └── ViewToggle.tsx
│
├── lib/
│   ├── supabase.ts
│   ├── pricing.ts
│   ├── parser/
│   │   ├── normalize.ts
│   │   ├── morphDictionary.ts
│   │   ├── traitDictionary.ts
│   │   ├── priceParser.ts
│   │   └── listingParser.ts
│   └── db/
│
├── collectors/
│   ├── base.py
│   ├── feedle.py
│   └── shop_a.py
│
├── public/
│   └── morphs/
│
├── supabase/
│   └── migrations/
│
└── docs/
    └── handoff.md
```

---

# 76. MVP에서 가장 중요한 데이터 원칙

1. 현재 매물과 과거 매물을 삭제/덮어쓰기 방식으로 관리하지 않는다.
2. `listings`는 현재 상태를 가진다.
3. 가격 변경은 `listing_price_history`에 남긴다.
4. 상태 변경은 `listing_status_history`에 남긴다.
5. SOLD 매물은 삭제하지 않는다.
6. SOLD 매물은 현재 최저가 계산에서는 제외한다.
7. DELETED와 SOLD를 구분한다.
8. 수집 실패와 매물 삭제를 구분한다.
9. 현재 가격은 실거래가가 아니라 호가다.
10. 원문 URL은 모든 Listing의 핵심 필드다.
11. Morph와 Trait를 분리한다.
12. Trait는 개체 카드에서 Tag로 보여준다.
13. 광고성 수식어를 분류에 사용하지 않는다.
14. AI는 POC에 필요하지 않다.
15. 메인 Morph 수는 고정하지 않는다.
16. PC 레이아웃은 `6열 × N행`이다.

---

# 77. Codex가 임의로 해석하면 안 되는 부분

## 잘못된 해석 1

```text
슈퍼달마도 이름이 있으니 별도 Morph
```

기본안에서는 아니다.

```text
달마시안 = MORPH
슈퍼달마 = TRAIT
```

---

## 잘못된 해석 2

```text
풀핀이 비싸 보이니 별도 가격 그룹
```

아니다.

```text
대표 MORPH
+
FULL_PIN Trait
```

으로 처리한다.

---

## 잘못된 해석 3

```text
판매완료니까 삭제
```

금지.

History 데이터로 보존한다.

---

## 잘못된 해석 4

```text
판매완료 당시 45만원이므로 실거래가 45만원
```

금지.

`last known asking price`다.

---

## 잘못된 해석 5

```text
메인 모프는 24종
```

금지.

```text
6 columns × N
```

이다.

---

# 78. Codex 최초 작업 요청

첫 작업에서는 다음을 구현한다.

```text
1. Next.js 프로젝트 초기화

2. Supabase PostgreSQL Schema 작성

3. Morph / Trait Seed 데이터 구조 작성

4. Mock Listing 데이터 작성

5. 메인 6열 × N Morph Grid 구현

6. Morph 상세페이지 구현

7. 플랫폼별 최저 호가 계산 구현

8. 가격 비교 / 이미지 보기 Toggle 구현

9. 실제 Listing 카드에 Trait Badge 구현

10. Original URL 링크 구현

11. ACTIVE Only Filtering 구현

12. Price / Status History DB Schema 구현
```

**이 단계에서 실제 크롤러 때문에 UI 구현을 막지 않는다.**

먼저 Mock Data로 전체 제품 흐름을 완성한다.

---

# 79. Codex 두 번째 작업

UI POC가 정상 작동한 이후:

```text
1. 실제 공개 플랫폼 1곳 Collector 작성

2. external_id / original_url 기반 Upsert

3. 가격 변경 감지

4. Price History 저장

5. 상태 변경 감지

6. Status History 저장

7. last_seen / last_checked 구분

8. Scheduler 연결

9. Collector Error Logging
```

---

# 80. Codex 세 번째 작업

```text
1. 파사모 등 수동 등록 화면

2. Parser Preview

3. Morph 수정

4. Trait 수정

5. Image URL 입력

6. Original URL 입력

7. DB 저장
```

---

# 81. 향후 확장 가능하지만 현재 구현하지 않을 것

데이터가 누적되면 다음을 검토할 수 있다.

```text
플랫폼별 세로형 Box Plot
모프별 가격 분포
가격 하락 추이
최근 30일 / 90일 등록가격
판매완료까지 걸린 기간
Trait Filter
성별 Filter
체중 Filter
가격 알림
신규 매물 알림
중복 개체 탐지
```

하지만 **현재 POC 범위 밖이다.**

---

# 82. 최종 제품 구조

```text
                    [대표 Morph DB]
                         │
                         ▼
                  6열 × N 메인 화면
                         │
                         ▼
                사용자가 Morph 선택
                         │
                         ▼
┌─────────────────────────────────────────┐
│              Listing DB                 │
│                                         │
│  피들 ─┐                                │
│  샵 ───┼→ Collector → Parser → DB       │
│  파사모 ─→ Manual / Helper → Parser ────┤
│  기타 ─┘                                │
│                                         │
│ Morph + Trait + Price + Status + URL    │
└─────────────────────────────────────────┘
                         │
                         ▼
             [플랫폼별 최저 호가]
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          가격 비교형             이미지형
              │                     │
              └──────────┬──────────┘
                         ▼
                   [원문 보기]
                         │
                         ▼
                  원 판매 플랫폼
```

---

# 83. 데이터 Lifecycle 예시

하나의 매물이 처음 45만원으로 발견된 경우:

```text
2026-08-07
NEW
↓
ACTIVE

Price
450,000
```

가격이 내려가면:

```text
2026-08-10
450,000
↓
420,000
```

다시 내려가면:

```text
2026-08-13
420,000
↓
390,000
```

판매완료가 확인되면:

```text
2026-08-15
ACTIVE
↓
SOLD
```

DB 현재 상태:

```text
status = SOLD
current_price = 390000
```

Price History:

```text
08/07 450000
08/10 420000
08/13 390000
```

Status History:

```text
08/07 NEW → ACTIVE
08/15 ACTIVE → SOLD
```

현재 최저가 화면에서는 제외하지만 기록은 남긴다.

---

# 84. 최초 SQL 조회의 핵심

모프 상세페이지 현재 매물:

```sql
SELECT *
FROM listings
WHERE morph_id = :morph_id
  AND status = 'ACTIVE'
  AND price_type = 'FIXED'
ORDER BY current_price ASC;
```

플랫폼별 최저가 논리:

```sql
SELECT DISTINCT ON (platform_id)
       *
FROM listings
WHERE morph_id = :morph_id
  AND status = 'ACTIVE'
  AND price_type = 'FIXED'
  AND current_price IS NOT NULL
ORDER BY platform_id, current_price ASC;
```

또는 Application Layer에서 플랫폼별 Group + Min 처리 가능.

---

# 85. Trait가 붙은 매물 조회

예:

```sql
SELECT
    l.*,
    array_agg(t.name_ko) AS traits
FROM listings l
LEFT JOIN listing_traits lt
    ON lt.listing_id = l.id
LEFT JOIN traits t
    ON t.id = lt.trait_id
WHERE l.morph_id = :morph_id
  AND l.status = 'ACTIVE'
GROUP BY l.id;
```

---

# 86. Parser Confidence는 필수 아님

POC에서는 복잡한 확률/Confidence 시스템을 만들 필요 없다.

대신:

```text
AUTO
MANUAL
```

정도만 분류 출처로 기록해도 충분하다.

예:

```text
classification_source = AUTO_KEYWORD
```

또는:

```text
classification_source = MANUAL
```

향후 필요할 때 확장한다.

---

# 87. 대표 모프 이미지

메인 대표 이미지는 실제 판매 매물 이미지와 분리한다.

```text
Morph Representative Image
≠
Listing Image
```

대표 이미지는 서비스 내 고정 Asset.

```text
/public/morphs/
```

매물 이미지는 판매 플랫폼에서 가져온 `image_url`.

---

# 88. 가격 표시 Format

DB:

```text
320000
```

UI:

```text
320,000원
```

한국 원화 기준.

유틸 함수 예:

```ts
export function formatKRW(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}
```

---

# 89. 성별

최소:

```text
MALE
FEMALE
UNKNOWN
```

화면:

```text
수컷
암컷
미구분
```

---

# 90. Weight

DB:

```text
weight_g NUMERIC
```

UI:

```text
18g
```

없으면 표시하지 않는다.

---

# 91. Listing Card 정보 우선순위

이미지형 카드에서:

```text
1. 이미지
2. 가격
3. 모프명
4. 원문 제목
5. Trait
6. 성별 / 체중
7. 플랫폼
8. 확인 시각
9. 원문 버튼
```

정보가 없는 필드는 빈 공간을 억지로 만들지 않는다.

---

# 92. 가격 비교형 정보 우선순위

```text
1. 플랫폼명
2. 최저 가격
3. 해당 최저가 개체 제목
4. Trait
5. 성별 / 체중
6. 확인 시각
7. 원문 URL
```

---

# 93. 동일 모프의 플랫폼 매물이 없는 경우

예:

```text
동물다락
현재 확인된 매물 없음
```

가격을 `0원`으로 보여주면 안 된다.

```text
NULL
```

로 처리.

---

# 94. 오래된 데이터의 최저가 사용

`last_checked_at`이 너무 오래된 ACTIVE 매물을 계속 최저가로 보여주는 문제가 생길 수 있다.

향후:

```text
freshness threshold = 48h 또는 72h
```

설정 가능.

POC에서는:

```text
ACTIVE + Last Checked At 표시
```

부터 구현.

---

# 95. 데이터 갱신 실패가 오래 지속될 경우

예:

피들 Collector가 4일간 실패.

이때 피들 전체 매물을 자동 SOLD 처리하면 안 된다.

화면에서:

```text
피들
데이터 업데이트 지연
마지막 정상 확인: 4일 전
```

으로 표시할 수 있다.

이 기능은 POC에서는 관리자 로그만 있어도 된다.

---

# 96. 현재 단계의 가장 중요한 기술검증

다음 네 가지가 실제로 가능한지 먼저 증명한다.

```text
A.
공개 판매 플랫폼에서
가격 / 제목 / 이미지 / URL
수집 가능 여부

B.
키워드 사전으로
Morph / Trait
정규화 가능 여부

C.
Supabase에서
Listing + History
누적 가능 여부

D.
Next.js에서
가격형 ↔ 이미지형
전환 UX 구현 가능 여부
```

이 네 가지가 성공하면 POC의 기술적 타당성은 충분하다.

---

# 97. 구현 순서 강제 권장

Codex는 처음부터 크롤러부터 만들지 않는다.

반드시:

```text
DB
↓
Mock Data
↓
메인 UI
↓
상세 가격 UI
↓
이미지 Toggle
↓
Parser
↓
Collector
↓
Scheduler
```

순으로 진행하는 것을 권장한다.

이유:

데이터 수집 문제가 발생하더라도 제품 자체 UX 검증을 계속할 수 있기 때문이다.

---

# 98. 최종적으로 기억할 것

이 서비스의 핵심 기술은 AI가 아니다.

```text
Crawler / Manual Input
        +
Keyword Dictionary
        +
Parser
        +
Normalized Database
        +
Price Monitoring
        +
Simple Comparison UI
```

이다.

핵심 가치는 다음 한 문장으로 설명된다.

> **제각각 작성된 크레스티드 게코 판매글을 일정한 기준으로 묶어서, 사용자가 사진 한 번 클릭으로 여러 플랫폼의 현재 최저 호가와 실제 개체를 비교할 수 있게 만든다.**

따라서 POC는 복잡한 기능보다 아래 흐름을 먼저 완성한다.

```text
사진으로 모프 선택
→ 플랫폼별 최저 호가
→ 이미지 보기
→ 특성 태그 확인
→ 원문 URL 이동
```

백엔드에서는 처음부터:

```text
현재 가격
+
가격 이력
+
현재 판매상태
+
상태 이력
```

을 보존하여 이후 가격 분포와 시세 분석 기능으로 확장할 수 있도록 한다.

---

# 99. Codex에게 주는 최종 지시

**현재 단계에서는 완벽한 서비스가 아니라 작동하는 POC를 만든다.**

다음 원칙을 최우선한다.

```text
Simple
Observable
Editable
Replaceable
```

즉:

* 단순하게 구현한다.
* 데이터 흐름을 확인할 수 있게 한다.
* Morph / Trait Dictionary를 쉽게 수정할 수 있게 한다.
* 특정 플랫폼 Collector가 실패해도 다른 부분을 갈아엎지 않게 한다.
* UI와 데이터 수집부를 분리한다.
* 실제 플랫폼 연동 전 Mock Data로 전체 UX를 먼저 완성한다.
* 나중에 데이터를 버리지 않도록 Price/Status History는 초기부터 남긴다.

이 문서에 명시되지 않은 고급 기능을 Codex가 임의로 확장 구현하지 않는다.
