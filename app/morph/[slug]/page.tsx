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

  if (!morph) return { title: "모프를 찾을 수 없음" };

  return {
    title: `${morph.nameKo} 현재 최저 호가`,
    description: `${morph.nameKo} 플랫폼별 최저 호가·판매 매물`,
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
