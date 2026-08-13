import { describe, expect, it } from "vitest";

import {
  buildOpenAiResponsesRequest,
  countOpenAiSearchCalls,
  evidenceUrlIdentity,
  extractOpenAiSearchSources,
  extractOpenAiUsage,
  parseOpenAiPriceResearchOutput,
} from "@/supabase/functions/discover-public-sources/openai";

const validUrl = "https://www.gecko-market.co.kr/product/lilly-1?utm_source=gpt";

function responseFixture() {
  return {
    id: "resp_test",
    status: "completed",
    usage: {
      input_tokens: 1234,
      output_tokens: 456,
      total_tokens: 1690,
      input_tokens_details: { cached_tokens: 12 },
    },
    output: [
      {
        type: "web_search_call",
        action: {
          sources: [
            { url: validUrl, title: "릴리화이트 12만원" },
            { url: validUrl, title: "duplicate" },
          ],
        },
      },
      {
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            candidates: [
              {
                sourceUrl: validUrl,
                title: "릴리화이트 010-1234-5678",
                priceKrw: 120000,
                status: "ACTIVE",
                morph: "릴리화이트",
                sex: "FEMALE",
                weightG: 24.5,
                confidence: "HIGH",
                citedUrls: [validUrl],
              },
              {
                sourceUrl: "https://cafe.naver.com/private/123",
                title: "로그인 카페",
                priceKrw: 100000,
                status: "UNKNOWN",
                morph: null,
                sex: "UNKNOWN",
                weightG: null,
                confidence: "LOW",
                citedUrls: ["https://cafe.naver.com/private/123"],
              },
              {
                sourceUrl: "https://another-shop.co.kr/product/cheap",
                title: "가격 범위 밖",
                priceKrw: 500,
                status: "ACTIVE",
                morph: null,
                sex: "UNKNOWN",
                weightG: null,
                confidence: "LOW",
                citedUrls: [],
              },
            ],
          }),
          annotations: [{
            type: "url_citation",
            url: validUrl,
            title: "릴리화이트 12만원",
          }],
        }],
      },
    ],
  };
}

describe("OpenAI Responses web-price request", () => {
  it("requires high-effort live web search, source metadata, and strict JSON", () => {
    const request = buildOpenAiResponsesRequest(
      "gpt-5.6-sol",
      ["feedle.co.kr"],
      "2026-08-10",
    );
    expect(request.model).toBe("gpt-5.6-sol");
    expect(request.reasoning).toEqual({ effort: "high" });
    expect(request.tool_choice).toBe("required");
    expect(request.include).toEqual(["web_search_call.action.sources"]);
    expect(request.store).toBe(false);
    expect(request.tools).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "web_search",
        search_context_size: "high",
        external_web_access: true,
        filters: expect.objectContaining({
          blocked_domains: expect.arrayContaining(["naver.com", "instagram.com"]),
        }),
      }),
    ]));
    expect(request.text).toEqual({
      format: expect.objectContaining({
        type: "json_schema",
        strict: true,
      }),
    });
    expect(String(request.input)).toContain("Known hosts: feedle.co.kr");
  });
});

describe("OpenAI web-price response boundary", () => {
  it("keeps only safe fixed-price claims and masks contact details", () => {
    expect(parseOpenAiPriceResearchOutput(responseFixture())).toEqual({
      candidates: [{
        sourceUrl: "https://www.gecko-market.co.kr/product/lilly-1",
        title: "릴리화이트 [연락처 생략]",
        priceKrw: 120000,
        status: "ACTIVE",
        morph: "릴리화이트",
        sex: "FEMALE",
        weightG: 24.5,
        confidence: "HIGH",
        citedUrls: ["https://www.gecko-market.co.kr/product/lilly-1"],
      }],
    });
  });

  it("deduplicates full search sources and stores numeric usage only", () => {
    const payload = responseFixture();
    expect(extractOpenAiSearchSources(payload)).toEqual([{
      url: "https://www.gecko-market.co.kr/product/lilly-1",
      title: "릴리화이트 12만원",
    }]);
    expect(countOpenAiSearchCalls(payload)).toBe(1);
    expect(extractOpenAiUsage(payload)).toEqual({
      input_tokens: 1234,
      output_tokens: 456,
      total_tokens: 1690,
    });
  });

  it("compares www and apex URLs as one provenance identity", () => {
    expect(evidenceUrlIdentity("https://www.shop.co.kr/item/1?utm_source=x"))
      .toBe("https://shop.co.kr/item/1");
    expect(evidenceUrlIdentity("https://shop.co.kr/item/1"))
      .toBe("https://shop.co.kr/item/1");
  });
});
