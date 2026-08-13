import { describe, expect, it } from "vitest";

import { selectMidMarketHomeImage } from "@/lib/data/home-market";
import { buildTraitSubject, resolveTraitSlug } from "@/lib/data/catalog-traits";
import type { Trait } from "@/lib/types";

describe("home morph card listing image", () => {
  it("selects an imaged listing at the median price", () => {
    const result = selectMidMarketHomeImage([
      {
        id: "middle",
        currentPrice: 20_000,
        imageUrl: "https://example.com/middle.webp",
        originalTitle: "중간 매물",
      },
      {
        id: "lowest",
        currentPrice: 10_000,
        imageUrl: "https://example.com/lowest.webp",
        originalTitle: "낮은 매물",
      },
      {
        id: "highest",
        currentPrice: 30_000,
        imageUrl: "https://example.com/highest.webp",
        originalTitle: "높은 매물",
      },
    ]);

    expect(result?.id).toBe("middle");
  });

  it("uses the lower candidate when an even pool is equally close to its median", () => {
    const result = selectMidMarketHomeImage([
      {
        id: "low",
        currentPrice: 10_000,
        imageUrl: "https://example.com/low.webp",
        originalTitle: "낮음",
      },
      {
        id: "middle-low",
        currentPrice: 20_000,
        imageUrl: "https://example.com/middle-low.webp",
        originalTitle: "중간 낮음",
      },
      {
        id: "middle-high",
        currentPrice: 30_000,
        imageUrl: "https://example.com/middle-high.webp",
        originalTitle: "중간 높음",
      },
      {
        id: "high",
        currentPrice: 40_000,
        imageUrl: "https://example.com/high.webp",
        originalTitle: "높음",
      },
    ]);

    expect(result?.id).toBe("middle-low");
  });

  it("skips image-less rows and chooses the nearest imaged price", () => {
    const result = selectMidMarketHomeImage([
      {
        id: "lower-image",
        currentPrice: 10_000,
        imageUrl: "https://example.com/lower.webp",
        originalTitle: "낮은 이미지",
      },
      {
        id: "median-without-image",
        currentPrice: 20_000,
        imageUrl: " ",
        originalTitle: "이미지 없는 중앙값",
      },
      {
        id: "higher-image",
        currentPrice: 40_000,
        imageUrl: "https://example.com/higher.webp",
        originalTitle: "높은 이미지",
      },
    ]);

    expect(result?.id).toBe("lower-image");
  });

  it("avoids listings and image URLs already used by earlier cards", () => {
    const result = selectMidMarketHomeImage(
      [
        {
          id: "used-id",
          currentPrice: 20_000,
          imageUrl: "https://example.com/used-id.webp",
          originalTitle: "이미 쓴 매물",
        },
        {
          id: "duplicate-image",
          currentPrice: 21_000,
          imageUrl: "https://example.com/duplicate.webp",
          originalTitle: "중복 이미지",
        },
        {
          id: "unique",
          currentPrice: 30_000,
          imageUrl: "https://example.com/unique.webp",
          originalTitle: "고유 이미지",
        },
      ],
      new Set(["used-id"]),
      new Set(["https://example.com/duplicate.webp"]),
    );

    expect(result?.id).toBe("unique");
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
