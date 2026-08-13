import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MarketDetailPage } from "@/components/market-detail-page";
import { buildTraitSubject, resolveTraitSlug } from "@/lib/data/catalog-traits";
import {
  getComparableListingsByTraitSlug,
  getMorphById,
  getPlatformComparisonsByTraitSlug,
  getTraitBySlug,
} from "@/lib/data/repository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trait = await getTraitBySlug(resolveTraitSlug(slug));

  if (!trait) return { title: "모프 키워드를 찾을 수 없음" };

  return {
    title: `${trait.nameKo} 현재 최저 호가`,
    description: `${trait.nameKo} 키워드 현재 판매 매물·가격 비교`,
  };
}

export default async function TraitPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const traitSlug = resolveTraitSlug(slug);
  const trait = await getTraitBySlug(traitSlug);

  if (!trait) notFound();

  const [comparisons, listings] = await Promise.all([
    getPlatformComparisonsByTraitSlug(traitSlug),
    getComparableListingsByTraitSlug(traitSlug),
  ]);
  const pricePool = listings.filter((listing) => listing.platform.isActive);
  const fallbackMorph = pricePool[0]?.morphId
    ? await getMorphById(pricePool[0].morphId)
    : undefined;
  const subject = buildTraitSubject(trait, fallbackMorph?.representativeImage);

  return (
    <MarketDetailPage
      subject={subject}
      comparisons={comparisons}
      pricePool={pricePool}
    />
  );
}
