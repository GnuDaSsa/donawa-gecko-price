import { describe, expect, it } from "vitest";

import {
  parseFeedleProductHtml,
  parseSitemap,
} from "@/supabase/functions/collect-feedle/parser";

const product = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "크레스티드 게코 릴리화이트 풀핀",
  description: "판매자실명님의 개체. 공개 설명",
  image: ["https://api.feedle.me/storage/v1/object/public/public/images/example"],
  category: "크레스티드 게코",
  url: "https://www.feedle.me/pet/test-listing-id",
  additionalProperty: [
    { "@type": "PropertyValue", name: "종", value: "크레스티드 게코" },
    { "@type": "PropertyValue", name: "모프", value: "릴리화이트 풀핀" },
    { "@type": "PropertyValue", name: "성별", value: "암컷" },
    { "@type": "PropertyValue", name: "체중", value: "18.5g" },
  ],
  offers: {
    "@type": "Offer",
    price: 290000,
    priceCurrency: "KRW",
    availability: "https://schema.org/InStock",
    seller: { "@type": "Person", name: "판매자실명" },
  },
};

describe("Feedle public JSON-LD parser", () => {
  it("extracts comparison fields without persisting seller PII", () => {
    const html = `<html><script type="application/ld+json">${JSON.stringify(product)}</script></html>`;
    const result = parseFeedleProductHtml(html, product.url);

    expect(result).toMatchObject({
      externalId: "test-listing-id",
      currentPrice: 290000,
      priceType: "FIXED",
      status: "ACTIVE",
      sex: "FEMALE",
      weightG: 18.5,
      morphText: "릴리화이트 풀핀",
    });
    expect(result?.safeDescription).not.toContain("판매자실명");
    expect(JSON.stringify(result?.rawData)).not.toContain("판매자실명");
  });

  it("keeps sold-out and zero-price pages out of active fixed-price comparison", () => {
    const sold = {
      ...product,
      offers: { ...product.offers, price: 0, availability: "https://schema.org/SoldOut" },
    };
    const html = `<script type="application/ld+json">${JSON.stringify([sold])}</script>`;
    const result = parseFeedleProductHtml(html, product.url);

    expect(result?.status).toBe("SOLD");
    expect(result?.currentPrice).toBeUndefined();
    expect(result?.priceType).toBe("UNKNOWN");
  });

  it("parses sitemap URLs and freshness", () => {
    const xml = `
      <urlset>
        <url><loc>https://www.feedle.me/pet/a&amp;b</loc><lastmod>2026-08-07T01:00:00Z</lastmod></url>
      </urlset>`;

    expect(parseSitemap(xml)).toEqual([
      { url: "https://www.feedle.me/pet/a&b", lastModified: "2026-08-07T01:00:00Z" },
    ]);
  });
});
