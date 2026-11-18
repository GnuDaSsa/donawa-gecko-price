import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MarketDetailPage } from "@/components/market-detail-page";
import {
  getComparableListings,
  getHomeMarketSnapshot,
  getMorphBySlug,
  getPlatformComparisons,
} from "@/lib/data/repository";
import { getAvailableComparisonListings } from "@/lib/data/comparisons";
import { formatKRW } from "@/lib/format";
import { buildDetailShare } from "@/lib/share";
import {
  detailOgImagePath,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_NAME,
} from "@/lib/site";
import { buildProductJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const morph = await getMorphBySlug(slug);

  if (!morph) return { title: "모프를 찾을 수 없음", robots: { index: false, follow: false } };

  const [listings, comparisons] = await Promise.all([
    getComparableListings(morph.id),
    getPlatformComparisons(morph.id),
  ]);
  const prices = listings
    .filter((listing) => listing.platform.isActive && listing.currentPrice !== undefined)
    .map((listing) => listing.currentPrice as number);
  const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const siteCount = getAvailableComparisonListings(comparisons).length;

  const title = minPrice !== undefined ? `${morph.nameKo} 최저 ${formatKRW(minPrice)}` : `${morph.nameKo} 최저 호가 비교`;
  const description =
    minPrice !== undefined
      ? `${morph.nameKo} 모프 현재 최저 ${formatKRW(minPrice)}. ${siteCount}개 사이트, 매물 ${listings.length.toLocaleString("ko-KR")}건을 한 표에 모아 비교합니다. 판매처가 공개한 호가 그대로, 하루 두 번 갱신.`
      : `${morph.nameKo} 모프의 플랫폼별 현재 최저 호가와 판매 매물 비교`;
  const canonical = `/morph/${morph.slug}`;
  const image = detailOgImagePath("morph", morph.slug);
  const imageAlt = `${morph.nameKo} 최저 호가 비교 카드`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "ko_KR",
      title,
      description,
      url: canonical,
      images: [{ url: image, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function MorphPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const morph = await getMorphBySlug(slug);

  if (!morph) notFound();

  const [comparisons, listings, homeSnapshot] = await Promise.all([
    getPlatformComparisons(morph.id),
    getComparableListings(morph.id),
    getHomeMarketSnapshot(),
  ]);
  const pricePool = listings.filter((listing) => listing.platform.isActive);
  const homeSummary = homeSnapshot.morphs.find(
    ({ href }) => href === `/morph/${morph.slug}`,
  );

  const prices = pricePool
    .map((listing) => listing.currentPrice)
    .filter((price): price is number => price !== undefined);
  const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const siteCount = getAvailableComparisonListings(comparisons).length;
  const share = buildDetailShare({
    nameKo: morph.nameKo,
    path: `/morph/${morph.slug}`,
    minPrice,
    siteCount,
    listingCount: pricePool.length,
    image: detailOgImagePath("morph", morph.slug),
  });
  const jsonLd = buildProductJsonLd({
    name: `${morph.nameKo} (${morph.nameEn})`,
    description: `${morph.nameKo} 모프 판매처 공개 호가 비교`,
    path: `/morph/${morph.slug}`,
    image: share.image,
    minPrice,
    maxPrice: prices.length > 0 ? Math.max(...prices) : undefined,
    offerCount: pricePool.length,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <MarketDetailPage
        subject={morph}
        comparisons={comparisons}
        pricePool={pricePool}
        representativeImageUrl={homeSummary?.representativeListingImageUrl}
        share={share}
      />
    </>
  );
}
