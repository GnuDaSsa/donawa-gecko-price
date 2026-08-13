import { describe, expect, it } from "vitest";
import { parsePasamoArticle, sanitizePasamoParagraphs, toPasamoCsv } from "../lib/pasamo-parser.mjs";

function article(overrides = {}) {
  return {
    articleId: "5600001",
    title: "크레스티드게코 분양",
    url: "https://cafe.naver.com/f-e/cafes/12440585/articles/5600001",
    paragraphs: [],
    ...overrides,
  };
}

describe("Pasamo safe article parser", () => {
  it("splits numbered animals into stable fixed-price rows", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "1번 25.09.12 메인 트익할 수컷",
        "10만원",
        "2번 26.04.11 릴리 미구분",
        "5만원",
      ],
    }));

    expect(result.ready).toHaveLength(2);
    expect(result.ready[0]).toMatchObject({
      price: 100000,
      morph: "할리퀸",
      sex: "MALE",
    });
    expect(result.ready[0].url).toMatch(/#item-1$/);
    expect(result.ready[1]).toMatchObject({
      price: 50000,
      morph: "릴리화이트",
      sex: "UNKNOWN",
    });
    expect(result.ready[1].url).toMatch(/#item-2$/);
  });

  it("supports parenthesized and female/male item markers", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "( 1 )",
        "세이블 (미구분)",
        "26.4.6 해칭 5g",
        "30.000원",
        "암-2. 트익할 암컷 성체",
        "분양가 : 30만원",
        "무게 : 38g",
      ],
    }));

    expect(result.ready).toHaveLength(2);
    expect(result.ready[0]).toMatchObject({ price: 30000, morph: "세이블", weight_g: 5 });
    expect(result.ready[1]).toMatchObject({
      price: 300000,
      morph: "할리퀸",
      sex: "FEMALE",
      weight_g: 38,
    });
    expect(result.ready[1].url).toMatch(/#female-2$/);
  });

  it("accepts a numbered item without whitespace after the dot", () => {
    const result = parsePasamoArticle(article({
      paragraphs: ["3.릴리화이트 7g 암추 35만원"],
    }));
    expect(result.ready).toEqual([
      expect.objectContaining({ price: 350000, morph: "릴리화이트", sex: "FEMALE", weight_g: 7 }),
    ]);
    expect(result.ready[0].url).toMatch(/#item-3$/);
  });

  it("creates independent rows for one-line offers", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "릴리 숫 성체 | 개별분양가: 8만",
        "세이블 숫 성체 | 개별분양가: 21만",
        "노멀 암 성체 | 개별분양가: 6만",
      ],
    }));

    expect(result.ready).toHaveLength(3);
    expect(result.ready.map((row) => row.price)).toEqual([80000, 210000, 60000]);
    expect(result.ready.map((row) => row.classification_mode)).toEqual([
      "EXPLICIT",
      "EXPLICIT",
      "UNCLASSIFIED",
    ]);
    expect(result.ready.map((row) => row.sex)).toEqual(["MALE", "MALE", "FEMALE"]);
  });

  it("ignores bracketed cross-post links even when their label contains a price", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "[ 노멀 미구분 만원 분양 ]",
        "https://cafe.naver.com/reptilia/5590112",
        "( 1 )",
        "릴리 미구분 5g",
        "5만원",
      ],
    }));
    expect(result.ready).toHaveLength(1);
    expect(result.ready[0]).toMatchObject({ price: 50000, morph: "릴리화이트" });
  });

  it("keeps article-only bundle prices out of ready comparison rows", () => {
    const result = parsePasamoArticle(article({
      title: "크레 7마리 일괄분양 5만에 보냅니다",
      paragraphs: ["베이비 4마리", "숫 릴리 성체", "노멀 암컷 성체"],
    }));

    expect(result.ready).toHaveLength(0);
    expect(result.review).toEqual([
      expect.objectContaining({
        price: 50000,
        price_type: "BUNDLE",
        review_reason: "ARTICLE_BUNDLE_ONLY",
      }),
    ]);
    expect(result.review[0].url).toMatch(/#bundle$/);
  });

  it("keeps a single explicitly priced article as one stable item", () => {
    const result = parsePasamoArticle(article({
      title: "형질 좋은 고퀄리티 트라이 암컷",
      paragraphs: ["6. 분양가(제시및 경매유도/낚시가격금지) : 35만", "암컷이고 몸무게는 32g 입니다"],
    }));

    expect(result.ready).toEqual([
      expect.objectContaining({
        price: 350000,
        morph: "할리퀸",
        sex: "FEMALE",
        weight_g: 32,
      }),
    ]);
    expect(result.ready[0].url).toMatch(/#item-1$/);
  });

  it("routes a single article-level price with several morph groups to review", () => {
    const result = parsePasamoArticle(article({
      title: "아잔틱 세이블 릴리화이트 트라이 암컷 미구분 분양",
      paragraphs: ["6. 분양가 : 5만원"],
    }));
    expect(result.ready).toHaveLength(0);
    expect(result.review).toEqual([
      expect.objectContaining({ price: 50000, review_reason: "AMBIGUOUS_ARTICLE_LEVEL_PRICE" }),
    ]);
  });

  it("removes the standard cafe notice from generated titles", () => {
    const result = parsePasamoArticle(article({
      title: "고퀄 트라이 암 분양",
      paragraphs: [
        "가급적 모든 내용을 다 작성하되 작성이 어려운 경우 이전 판매 게시글 링크를 허용합니다",
        "6. 분양가 : 10만원",
      ],
    }));
    expect(result.ready[0].title).toBe("고퀄 트라이 암 분양");
  });

  it("normalizes common one-man and ma-neon price spellings", () => {
    const oneMan = parsePasamoArticle(article({
      title: "100헷 아잔틱 만원 분양합니다",
      paragraphs: ["6. 분양가 :만원", "성별 : 숫추", "5.5g", "만원이면 책임비 수준 무료분양이다 생각해주세요"],
    }));
    expect(oneMan.ready).toEqual([expect.objectContaining({ price: 10000, morph: "" })]);

    const maNeon = parsePasamoArticle(article({
      title: "크레 2년 된 수컷 분양",
      paragraphs: ["6. 분양가 : 3마넌", "성별 : 수컷"],
    }));
    expect(maNeon.ready).toEqual([expect.objectContaining({ price: 30000, sex: "MALE" })]);
  });

  it("excludes free offers and routes reservation or inferred units to review", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "1번 노말 미구분",
        "무료분양",
        "2번 릴잔틱 수컷",
        "분양가 : 30만원 - 예약중",
        "3번 스팟타입 트익할 수컷",
        "분양가 : 25",
      ],
    }));

    expect(result.excluded).toEqual([{ reason: "FREE_OFFER_OUTSIDE_PRICE_COMPARISON" }]);
    expect(result.review).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "UNKNOWN", status_evidence: "EXPLICIT_RESERVATION" }),
      expect.objectContaining({ price: 250000, review_reason: "PRICE_UNIT_INFERRED" }),
    ]));
    expect(result.ready).toHaveLength(0);
  });

  it("parses an inferred unit from its own price line before joining the block", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "수-8. 스팟타입 트익할 수컷 아성체",
        "분양가 : 25",
        "생일 : 26년 3월 2일",
        "무게 : 6g",
      ],
    }));
    expect(result.review).toEqual([
      expect.objectContaining({ price: 250000, sex: "MALE", review_reason: "PRICE_UNIT_INFERRED" }),
    ]);
  });

  it("does not apply another numbered group's sold note to the current item", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "수-8. 스팟타입 트익할 수컷 아성체",
        "분양가 : 25만원",
        "생일 : 26년 3월 2일",
        "무게 : 6g",
        "점유무 : X",
        "부모 : 타이탄x이름",
        "비고 : 현재 분양 중인 아이입니다",
        "설명 1",
        "설명 2",
        "사보-1, 2, 3, 5, 6 분양완료",
        "사보-4. 트익할 아성체 암컷",
        "분양가 : 5만원",
      ],
    }));

    expect(result.ready).toHaveLength(2);
    expect(result.ready[0]).toMatchObject({ status: "ACTIVE", price: 250000 });
  });

  it("does not misclassify het-only animals as visual Lilly or Axanthic", () => {
    const result = parsePasamoArticle(article({
      paragraphs: [
        "1번 50헷릴리초초 숫 아성체",
        "10만원",
        "2번 100헷 아잔틱 숫추 5.5g",
        "1만원",
        "3번 릴리100헷아잔틱 암컷 9g",
        "15만원",
      ],
    }));

    expect(result.ready.map((row) => row.morph)).toEqual(["", "", "릴리화이트"]);
  });

  it("drops contact data before candidate generation", () => {
    const paragraphs = sanitizePasamoParagraphs([
      "연락처 010-1234-5678",
      "seller@example.com",
      "https://open.kakao.com/o/abc",
      "1번 릴리 미구분",
      "5만원",
    ]);
    expect(paragraphs.join(" ")).not.toMatch(/010|example\.com|kakao/);

    const result = parsePasamoArticle(article({ paragraphs }));
    expect(JSON.stringify(result)).not.toMatch(/010|example\.com|kakao/);
    expect(result.ready).toHaveLength(1);
  });

  it("writes an importer-compatible CSV without leaking review metadata into fields", () => {
    const result = parsePasamoArticle(article({ paragraphs: ["1번 릴리 암컷 9g", "5만원"] }));
    const csv = toPasamoCsv(result.ready);
    expect(csv).toContain("classification_mode,status_evidence,review_reason");
    expect(csv).toContain("릴리화이트");
    expect(csv).not.toContain("undefined");
  });
});
