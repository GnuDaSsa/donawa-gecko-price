/**
 * 검색 엔진이 읽는 구조화 데이터(JSON-LD).
 *
 * 화면에 보이는 값만 넣는다. 모르는 값은 빼고, 문자열에 `<`가 들어오면
 * 스크립트 태그를 닫지 못하도록 이스케이프해서 돌려준다.
 */
import { absoluteUrl, SITE_NAME } from "@/lib/site";

function serialize(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildWebsiteJsonLd(): string {
  return serialize({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Donawa",
    url: absoluteUrl("/"),
    description: "크레스티드 게코 모프별 현재 최저 호가를 판매처 공개 가격으로 비교하는 사이트",
    inLanguage: "ko-KR",
  });
}

export function buildProductJsonLd(input: {
  name: string;
  description: string;
  path: string;
  image: string;
  minPrice?: number;
  maxPrice?: number;
  offerCount: number;
}): string {
  const url = absoluteUrl(input.path);
  const image = new URL(input.image, url).toString();

  const offers =
    input.minPrice !== undefined
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "KRW",
          lowPrice: input.minPrice,
          ...(input.maxPrice !== undefined ? { highPrice: input.maxPrice } : {}),
          offerCount: input.offerCount,
          availability: "https://schema.org/InStock",
          url,
        }
      : undefined;

  return serialize({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url,
    image,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(offers ? { offers } : {}),
  });
}
