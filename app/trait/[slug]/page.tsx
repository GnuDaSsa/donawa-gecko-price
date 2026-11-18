import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MarketDetailPage } from "@/components/market-detail-page";
import { buildTraitSubject, resolveTraitSlug } from "@/lib/data/catalog-traits";
import { getAvailableComparisonListings } from "@/lib/data/comparisons";
import {
  getComparableListingsByTraitSlug,
  getHomeMarketSnapshot,
  getMorphById,
  getPlatformComparisonsByTraitSlug,
  getTraitBySlug,
} from "@/lib/data/repository";
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
  const traitSlug = resolveTraitSlug(slug);
  const trait = await getTraitBySlug(traitSlug);

  if (!trait) {
    return { title: "모프 키워드를 찾을 수 없음", robots: { index: false, follow: false } };
  }

  const [listings, comparisons] = await Promise.all([
    getComparableListingsByTraitSlug(traitSlug),
    getPlatformComparisonsByTraitSlug(traitSlug),
  ]);
  const prices = listings
    .filter((listing) => listing.platform.isActive && listing.currentPrice !== undefined)
    .map((listing) => listing.currentPrice as number);
  const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const siteCount = getAvailableComparisonListings(comparisons).length;

  const title = minPrice !== undefined ? `${trait.nameKo} 최저 ${formatKRW(minPrice)}` : `${trait.nameKo} 최저 호가 비교`;
  const description =
    minPrice !== undefined
      ? `${trait.nameKo} 키워드 현재 최저 ${formatKRW(minPrice)}. ${siteCount}개 사이트, 매물 ${listings.length.toLocaleString("ko-KR")}건을 한 표에 모아 비교합니다.`
      : `${trait.nameKo} 키워드의 현재 판매 매물과 플랫폼별 가격 비교`;
  const canonical = `/trait/${trait.slug}`;
  const image = detailOgImagePath("trait", trait.slug);
  const imageAlt = `${trait.nameKo} 최저 호가 비교 카드`;

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

export default async function TraitPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const traitSlug = resolveTraitSlug(slug);
  const trait = await getTraitBySlug(traitSlug);

  if (!trait) notFound();

  const [comparisons, listings, homeSnapshot] = await Promise.all([
    getPlatformComparisonsByTraitSlug(traitSlug),
    getComparableListingsByTraitSlug(traitSlug),
    getHomeMarketSnapshot(),
  ]);
  const pricePool = listings.filter((listing) => listing.platform.isActive);
  const fallbackMorph = pricePool[0]?.morphId
    ? await getMorphById(pricePool[0].morphId)
    : undefined;
  const subject = buildTraitSubject(trait, fallbackMorph?.representativeImage);
  const homeSummary = homeSnapshot.morphs.find(
    ({ href }) => href === `/trait/${trait.slug}`,
  );

  const prices = pricePool
    .map((listing) => listing.currentPrice)
    .filter((price): price is number => price !== undefined);
  const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const siteCount = getAvailableComparisonListings(comparisons).length;
  const share = buildDetailShare({
    nameKo: trait.nameKo,
    path: `/trait/${trait.slug}`,
    minPrice,
    siteCount,
    listingCount: pricePool.length,
    image: detailOgImagePath("trait", trait.slug),
  });
  const jsonLd = buildProductJsonLd({
    name: `${trait.nameKo} (${trait.nameEn})`,
    description: `${trait.nameKo} 키워드 판매처 공개 호가 비교`,
    path: `/trait/${trait.slug}`,
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
        subject={subject}
        comparisons={comparisons}
        pricePool={pricePool}
        representativeImageUrl={homeSummary?.representativeListingImageUrl}
        share={share}
      />
    </>
  );
}
