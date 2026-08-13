import { describe, expect, it } from "vitest";

import { selectLowestHomeListing } from "@/lib/data/home-market";
import { buildTraitSubject, resolveTraitSlug } from "@/lib/data/catalog-traits";
import type { Trait } from "@/lib/types";

describe("home morph card listing image", () => {
  it("selects the absolute lowest-price listing", () => {
    const result = selectLowestHomeListing([
      {
        id: "higher-with-image",
        currentPrice: 20_000,
        imageUrl: "https://example.com/higher.webp",
        originalTitle: "두 번째 매물",
      },
      {
        id: "lowest-without-image",
        currentPrice: 10_000,
        imageUrl: null,
        originalTitle: "최저가 매물",
      },
    ]);

    expect(result?.id).toBe("lowest-without-image");
    expect(result?.imageUrl).toBeNull();
  });

  it("prefers an actual image only within an exact lowest-price tie", () => {
    const result = selectLowestHomeListing([
      {
        id: "lowest-without-image",
        currentPrice: 10_000,
        imageUrl: " ",
        originalTitle: "이미지 없는 최저가",
      },
      {
        id: "lowest-with-image",
        currentPrice: 10_000,
        imageUrl: "https://example.com/lowest.webp",
        originalTitle: "이미지 있는 최저가",
      },
    ]);

    expect(result?.id).toBe("lowest-with-image");
    expect(result?.imageUrl).toBe("https://example.com/lowest.webp");
  });

  it("uses a stable id order when price and image state are equal", () => {
    const result = selectLowestHomeListing([
      {
        id: "b",
        currentPrice: 10_000,
        imageUrl: null,
        originalTitle: "B",
      },
      {
        id: "a",
        currentPrice: 10_000,
        imageUrl: null,
        originalTitle: "A",
      },
    ]);

    expect(result?.id).toBe("a");
  });
});

describe("dynamic keyword subjects", () => {
  it("builds a category from any filterable database trait", () => {
    const trait: Trait = {
      id: "trait-charcoal",
      slug: "charcoal",
      nameKo: "차콜",
      nameEn: "Charcoal",
      traitType: "COLOR",
      aliases: ["차콜", "챠콜"],
      isFilterable: true,
    };

    expect(buildTraitSubject(trait, "/morphs/axanthic.webp")).toMatchObject({
      id: "catalog-trait-charcoal",
      slug: "charcoal",
      nameKo: "차콜",
      representativeImage: "/morphs/axanthic.webp",
    });
  });

  it("keeps the legacy extreme-harlequin URL compatible", () => {
    expect(resolveTraitSlug("extreme-harlequin")).toBe("extreme");
    expect(resolveTraitSlug("charcoal")).toBe("charcoal");
  });
});
