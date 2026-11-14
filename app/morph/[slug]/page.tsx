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

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const morph = await getMorphBySlug(slug);

  if (!morph) return { title: "모프를 찾을 수 없음", robots: { index: false, follow: false } };

  const title = `${morph.nameKo} 현재 최저 호가`;
  const description = `${morph.nameKo} 모프의 플랫폼별 현재 최저 호가와 판매 매물 비교`;
  const canonical = `/morph/${morph.slug}`;
  const image = morph.representativeImage;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: [{ url: image, alt: `${morph.nameKo} 대표 이미지` }],
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

  return (
    <MarketDetailPage
      subject={morph}
      comparisons={comparisons}
      pricePool={pricePool}
      representativeImageUrl={homeSummary?.representativeListingImageUrl}
    />
  );
}
