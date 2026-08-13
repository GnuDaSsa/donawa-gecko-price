import { platforms } from "@/lib/data/platforms";
import { traits } from "@/lib/data/traits";
import type { Listing, ListingStatus, PriceType, Sex } from "@/lib/types";

const platform = Object.fromEntries(platforms.map((item) => [item.id, item]));
const trait = Object.fromEntries(traits.map((item) => [item.slug, item]));

type ListingSeed = {
  id: string;
  platformId: string;
  morphId: string;
  title: string;
  price?: number;
  priceType?: PriceType;
  status?: ListingStatus;
  sex?: Sex;
  weightG?: number;
  traitSlugs?: string[];
  image: string;
  imagePosition?: string;
  checkedAt?: string;
};

function listing(seed: ListingSeed): Listing {
  const checkedAt = seed.checkedAt ?? "2026-08-07T12:00:00.000Z";
  return {
    id: seed.id,
    platform: platform[seed.platformId],
    externalId: seed.id,
    morphId: seed.morphId,
    originalTitle: seed.title,
    originalDescription: `${seed.title} — POC용 원문 보존 예시`,
    originalUrl: `https://example.com/listings/${seed.id}`,
    imageUrl: seed.image,
    imagePosition: seed.imagePosition,
    traits: (seed.traitSlugs ?? []).map((slug) => trait[slug]),
    currentPrice: seed.price,
    priceType: seed.priceType ?? "FIXED",
    currency: "KRW",
    sex: seed.sex ?? "UNKNOWN",
    weightG: seed.weightG,
    status: seed.status ?? "ACTIVE",
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    lastSeenAt: checkedAt,
    lastCheckedAt: checkedAt,
    soldDetectedAt:
      seed.status === "SOLD" ? "2026-08-07T12:00:00.000Z" : undefined,
    classificationSource:
      platform[seed.platformId].collectorType === "MANUAL" ? "MANUAL" : "AUTO_KEYWORD",
    rawData: { title: seed.title, price: seed.price },
  };
}

export const listings: Listing[] = [
  listing({ id: "la-01", platformId: "platform-feedle", morphId: "morph-lilly-axanthic", title: "릴잔틱 풀핀 미구분 7g", price: 320000, weightG: 7, traitSlugs: ["full-pin"], image: "/geckos/gecko-4.jpg", imagePosition: "50% 48%" }),
  listing({ id: "la-02", platformId: "platform-feedle", morphId: "morph-lilly-axanthic", title: "하이 익스프레션 릴잔틱 암컷 18g", price: 450000, sex: "FEMALE", weightG: 18, traitSlugs: ["high-expression", "white-wall"], image: "/geckos/gecko-1.jpg", imagePosition: "50% 48%" }),
  listing({ id: "la-03", platformId: "platform-pasamo", morphId: "morph-lilly-axanthic", title: "릴잔틱 트라이 암컷", price: 350000, sex: "FEMALE", traitSlugs: ["tricolor"], image: "/geckos/gecko-2.jpg", imagePosition: "50% 50%" }),
  listing({ id: "la-04", platformId: "platform-animal-attic", morphId: "morph-lilly-axanthic", title: "릴잔틱 화이트월 수컷 12g", price: 390000, sex: "MALE", weightG: 12, traitSlugs: ["white-wall"], image: "/geckos/gecko-3.jpg", imagePosition: "48% 50%", checkedAt: "2026-08-07T00:00:00.000Z" }),
  listing({ id: "la-05", platformId: "platform-kiwo", morphId: "morph-lilly-axanthic", title: "릴잔틱 풀핀 트라이컬러 16g", price: 420000, weightG: 16, traitSlugs: ["full-pin", "tricolor"], image: "/geckos/gecko-1.jpg", imagePosition: "50% 63%" }),
  listing({ id: "la-sold", platformId: "platform-feedle", morphId: "morph-lilly-axanthic", title: "판매완료 릴잔틱 수컷", price: 280000, status: "SOLD", sex: "MALE", image: "/geckos/gecko-4.jpg" }),
  listing({ id: "la-contact", platformId: "platform-pasamo", morphId: "morph-lilly-axanthic", title: "릴잔틱 성체 가격문의", priceType: "CONTACT", image: "/geckos/gecko-3.jpg" }),

  listing({ id: "lw-01", platformId: "platform-feedle", morphId: "morph-lilly-white", title: "릴리화이트 풀핀 암컷 20g", price: 280000, sex: "FEMALE", weightG: 20, traitSlugs: ["full-pin"], image: "/geckos/gecko-1.jpg", imagePosition: "50% 44%" }),
  listing({ id: "lw-02", platformId: "platform-pasamo", morphId: "morph-lilly-white", title: "릴리 화이트 화이트월 미구분", price: 245000, traitSlugs: ["white-wall"], image: "/geckos/gecko-4.jpg" }),
  listing({ id: "lw-03", platformId: "platform-kiwo", morphId: "morph-lilly-white", title: "하이 익스프레션 릴리화이트 15g", price: 310000, weightG: 15, traitSlugs: ["high-expression"], image: "/geckos/gecko-2.jpg" }),

  listing({ id: "ax-01", platformId: "platform-feedle", morphId: "morph-axanthic", title: "아잔틱 수컷 11g", price: 380000, sex: "MALE", weightG: 11, image: "/geckos/gecko-2.jpg" }),
  listing({ id: "ax-02", platformId: "platform-animal-attic", morphId: "morph-axanthic", title: "아잔틱 풀핀 암컷", price: 420000, sex: "FEMALE", traitSlugs: ["full-pin"], image: "/geckos/gecko-3.jpg" }),

  listing({ id: "cp-01", platformId: "platform-feedle", morphId: "morph-cappuccino", title: "카푸치노 미구분 8g", price: 260000, weightG: 8, image: "/geckos/gecko-3.jpg" }),
  listing({ id: "cp-02", platformId: "platform-pasamo", morphId: "morph-cappuccino", title: "카푸 솔리드백 암컷", price: 300000, sex: "FEMALE", traitSlugs: ["solid-back"], image: "/geckos/gecko-1.jpg" }),

  listing({ id: "fr-01", platformId: "platform-kiwo", morphId: "morph-frappuccino", title: "프라푸치노 수컷 14g", price: 520000, sex: "MALE", weightG: 14, image: "/geckos/gecko-1.jpg" }),
  listing({ id: "fr-02", platformId: "platform-feedle", morphId: "morph-frappuccino", title: "프라푸 화이트월 미구분", price: 480000, traitSlugs: ["white-wall"], image: "/geckos/gecko-4.jpg" }),

  listing({ id: "dm-01", platformId: "platform-feedle", morphId: "morph-dalmatian", title: "레드 잉크스팟 슈퍼달마 암컷", price: 240000, sex: "FEMALE", traitSlugs: ["red-base", "inkspot", "super-dalmatian"], image: "/geckos/gecko-2.jpg" }),
  listing({ id: "dm-02", platformId: "platform-pasamo", morphId: "morph-dalmatian", title: "슈퍼 달마 미구분 9g", price: 220000, weightG: 9, traitSlugs: ["super-dalmatian"], image: "/geckos/gecko-3.jpg" }),

  listing({ id: "hq-01", platformId: "platform-feedle", morphId: "morph-harlequin", title: "익스트림 할리퀸 풀핀", price: 190000, traitSlugs: ["extreme", "full-pin"], image: "/geckos/gecko-4.jpg" }),
  listing({ id: "hq-02", platformId: "platform-animal-attic", morphId: "morph-harlequin", title: "트라이컬러 할리퀸 암컷", price: 230000, sex: "FEMALE", traitSlugs: ["tricolor"], image: "/geckos/gecko-1.jpg" }),

  listing({ id: "ps-01", platformId: "platform-feedle", morphId: "morph-pinstripe", title: "핀스트라이프 파셜핀 10g", price: 160000, weightG: 10, traitSlugs: ["partial-pin"], image: "/geckos/gecko-3.jpg" }),
  listing({ id: "ph-01", platformId: "platform-kiwo", morphId: "morph-phantom", title: "팬텀 솔리드백 수컷", price: 270000, sex: "MALE", traitSlugs: ["solid-back"], image: "/geckos/gecko-1.jpg" }),
  listing({ id: "sb-01", platformId: "platform-feedle", morphId: "morph-sable", title: "세이블 암컷 17g", price: 650000, sex: "FEMALE", weightG: 17, image: "/geckos/gecko-2.jpg" }),
  listing({ id: "ss-01", platformId: "platform-pasamo", morphId: "morph-soft-scale", title: "소프트스케일 레드베이스", price: 210000, traitSlugs: ["red-base"], image: "/geckos/gecko-4.jpg" }),
  listing({ id: "fl-01", platformId: "platform-animal-attic", morphId: "morph-flame", title: "레드 플레임 미구분", price: 145000, traitSlugs: ["red-base"], image: "/geckos/gecko-3.jpg" }),
];
