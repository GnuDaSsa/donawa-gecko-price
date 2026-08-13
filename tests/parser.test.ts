import { describe, expect, it } from "vitest";

import { parseListing, parsePrice } from "@/lib/parser";

describe("listing parser", () => {
  it("parses a combo morph before shorter aliases", () => {
    const result = parseListing({ title: "릴잔틱 풀핀 암컷 18g 45" });

    expect(result.morph?.slug).toBe("lilly-axanthic");
    expect(result.traits.map((trait) => trait.slug)).toContain("full-pin");
    expect(result.sex).toBe("FEMALE");
    expect(result.weightG).toBe(18);
    expect(result.price).toBe(450_000);
    expect(result.priceType).toBe("FIXED");
  });

  it("does not promote a Lilly White het Axanthic to Lilly Axanthic", () => {
    const result = parseListing({ title: "릴리화이트 100% 헷 아잔틱 암컷 22g 38" });

    expect(result.morph?.slug).toBe("lilly-white");
  });

  it("maps Super Dalmatian to a Dalmatian morph plus traits", () => {
    const result = parseListing({ title: "레드 잉크스팟 슈퍼달마 암컷", priceText: "35만" });

    expect(result.morph?.slug).toBe("dalmatian");
    expect(result.traits.map((trait) => trait.slug)).toEqual(
      expect.arrayContaining(["red-base", "inkspot", "super-dalmatian"]),
    );
  });

  it("ignores promotional language that is not in the trait dictionary", () => {
    const result = parseListing({ title: "극상 레드 풀핀 릴잔틱 급처", priceText: "450,000" });

    expect(result.traits.map((trait) => trait.slug)).toEqual(
      expect.arrayContaining(["red-base", "full-pin"]),
    );
    expect(result.traits.map((trait) => trait.nameKo)).not.toContain("극상");
  });
});

describe("price parser", () => {
  it.each([
    ["45", 450_000],
    ["45만", 450_000],
    ["45만원", 450_000],
    ["450000", 450_000],
    ["450,000원", 450_000],
  ])("normalizes %s", (input, expected) => {
    expect(parsePrice(input)).toMatchObject({ price: expected, priceType: "FIXED" });
  });

  it("excludes contact listings from fixed-price comparison", () => {
    expect(parsePrice("가격문의")).toEqual({ priceType: "CONTACT" });
  });

  it("keeps a bundle total without deriving a per-animal price", () => {
    expect(parsePrice("두 마리 일괄 50")).toEqual({
      price: 500_000,
      priceType: "BUNDLE",
      bundleCount: 2,
    });
  });
});
