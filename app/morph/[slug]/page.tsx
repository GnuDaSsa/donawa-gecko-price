import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MarketDetailPage } from "@/components/market-detail-page";
import {
  getComparableListings,
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

  const [comparisons, listings] = await Promise.all([
    getPlatformComparisons(morph.id),
    getComparableListings(morph.id),
  ]);
  const pricePool = listings.filter((listing) => listing.platform.isActive);

  return (
    <MarketDetailPage
      subject={morph}
      comparisons={comparisons}
      pricePool={pricePool}
    />
  );
}
