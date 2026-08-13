import { describe, expect, it } from "vitest";

import {
  analyzePublicShopPage,
  evaluateRobotsTxt,
  extractFixedKrwPrices,
  findPublicProductCandidateUrl,
  inferPublicListingStatus,
  isEligibleForReview,
  normalizeSearchCandidate,
  sanitizeSearchTitle,
} from "@/supabase/functions/discover-public-sources/parser";

describe("source-discovery search result boundary", () => {
  it("keeps only new exact-HTTPS shop candidates and removes tracking", () => {
    const known = new Set(["existing-shop.co.kr"]);
    expect(normalizeSearchCandidate(
      "https://www.new-gecko.co.kr/product/12?utm_source=naver&cate_no=30#detail",
      "<b>크레스티드게코</b> 분양",
      "크레스티드게코 파충류샵",
      2,
      known,
    )).toEqual({
      hostname: "new-gecko.co.kr",
      exampleUrl: "https://www.new-gecko.co.kr/product/12?cate_no=30",
      title: "크레스티드게코 분양",
      discoveryQuery: "크레스티드게코 파충류샵",
      rank: 2,
    });

    expect(normalizeSearchCandidate(
      "https://existing-shop.co.kr/product/1",
      "기존 샵",
      "query",
      1,
      known,
    )).toBeNull();
    expect(normalizeSearchCandidate(
      "https://cafe.naver.com/reptilia/1",
      "카페글",
      "query",
      1,
    )).toBeNull();
    expect(normalizeSearchCandidate(
      "http://new-gecko.co.kr/product/1",
      "HTTP",
      "query",
      1,
    )).toBeNull();
  });

  it("masks phone and email text from provider titles", () => {
    expect(sanitizeSearchTitle(
      "<b>게코샵</b> 010-1234-5678 owner@example.com",
    )).toBe("게코샵 [연락처 생략] [이메일 생략]");
  });
});

describe("source-discovery robots boundary", () => {
  it("uses the longest matching rule and lets Allow win a tie", () => {
    const robots = `
      User-agent: *
      Disallow: /product/
      Allow: /product/public/
      Disallow: /product/public/private
    `;
    expect(evaluateRobotsTxt(
      robots,
      "https://shop.co.kr/product/public/12",
    )).toEqual({ status: "ALLOWED", matchedRule: "allow:/product/public/" });
    expect(evaluateRobotsTxt(
      robots,
      "https://shop.co.kr/product/public/private/12",
    )).toEqual({
      status: "BLOCKED",
      matchedRule: "disallow:/product/public/private",
    });
  });

  it("prefers a named discovery-agent group over wildcard rules", () => {
    const robots = `
      User-agent: *
      Disallow: /

      User-agent: DonawaSourceDiscovery
      Allow: /public/
      Disallow: /
    `;
    expect(evaluateRobotsTxt(
      robots,
      "https://shop.co.kr/public/product/1",
    ).status).toBe("ALLOWED");
    expect(evaluateRobotsTxt(
      robots,
      "https://shop.co.kr/admin",
    ).status).toBe("BLOCKED");
  });
});

describe("source-discovery public product evidence", () => {
  it("recognizes a public Cafe24 crested-gecko fixed-price product", () => {
    const html = `
      <html><body>크레스티드 게코 릴리화이트 분양 180,000원</body>
      <script>var EC_FRONT = {}; var product_no = 120;</script>
      <script type="application/ld+json">{
        "@type":"Product",
        "offers":{"price":180000,"availability":"InStock"}
      }</script></html>`;
    const evidence = analyzePublicShopPage(html);
    expect(evidence).toEqual({
      hasCrestedKeyword: true,
      hasFixedPrice: true,
      hasProductSchema: true,
      hasSaleSignal: true,
      platformHint: "CAFE24",
    });
    expect(isEligibleForReview(evidence)).toBe(true);
  });

  it("does not promote an informational page without Product structure", () => {
    const evidence = analyzePublicShopPage(
      "크레스티드 게코 사육법과 평균 분양가 100,000원",
    );
    expect(evidence.hasCrestedKeyword).toBe(true);
    expect(evidence.hasProductSchema).toBe(false);
    expect(isEligibleForReview(evidence)).toBe(false);
  });

  it("extracts won, 만원, and structured prices without guessing ranges", () => {
    expect(extractFixedKrwPrices(`
      분양가: 180,000원 / 예약금 2만원
      <script type="application/ld+json">{"price":"250000"}</script>
    `)).toEqual([20000, 180000, 250000]);
  });

  it("infers only unambiguous sale state", () => {
    expect(inferPublicListingStatus("availability: InStock, 분양중")).toBe("ACTIVE");
    expect(inferPublicListingStatus("availability: OutOfStock, 분양완료")).toBe("SOLD");
    expect(inferPublicListingStatus("InStock OutOfStock")).toBe("UNKNOWN");
    expect(inferPublicListingStatus("크레스티드 게코 소개")).toBe("UNKNOWN");
  });

  it("finds one same-host public product from a shop category page", () => {
    const html = `
      <a href="/product/crested-gecko-lilly/1077/?cate_no=85#detail">상품</a>
      <a href="https://tracker.example/product/999">외부 링크</a>`;
    expect(findPublicProductCandidateUrl(
      html,
      "https://tarancenter.com/category/crested/85/",
    )).toBe("https://tarancenter.com/product/crested-gecko-lilly/1077/?cate_no=85");
  });
});
