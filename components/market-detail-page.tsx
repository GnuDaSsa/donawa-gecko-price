import { ChevronLeft, CircleCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { AllListings } from "@/components/all-listings";
import { ComparisonOverview } from "@/components/comparison-overview";
import { DetailHeroImage } from "@/components/detail-hero-image";
import { MorphListings } from "@/components/morph-listings";
import { PriceDistribution } from "@/components/price-distribution";
import { SiteHeader } from "@/components/site-header";
import { getAvailableComparisonListings } from "@/lib/data/comparisons";
import type { Listing, Morph, PlatformComparison } from "@/lib/types";

export function MarketDetailPage({
  subject,
  comparisons,
  pricePool,
  representativeImageUrl,
}: {
  subject: Morph;
  comparisons: PlatformComparison[];
  pricePool: Listing[];
  representativeImageUrl?: string;
}) {
  const availableComparisons = getAvailableComparisonListings(comparisons);

  return (
    <main className="market-app detail-page">
      <SiteHeader />

      <div className="detail-content page-shell">
        <section className="detail-hero" aria-labelledby="morph-title">
          <div className="detail-hero__image" aria-hidden="true">
            <DetailHeroImage
              representativeImageUrl={representativeImageUrl}
              fallbackImageUrl={subject.representativeImage}
              fallbackImagePosition={subject.imagePosition}
            />
          </div>
          <div className="detail-hero__shade" />
          <div className="detail-hero__inner">
            <Link className="breadcrumb" href="/#morph-catalog">
              <ChevronLeft size={14} aria-hidden="true" /> 전체 모프·키워드
            </Link>
            <div className="detail-hero__heading">
              <h1 id="morph-title">{subject.nameKo}</h1>
              <p className="detail-hero__en">{subject.nameEn}</p>
            </div>
            <div className="detail-hero__badges" aria-label="현재 데이터 요약">
              <span><CircleCheck size={14} aria-hidden="true" /> 판매중 {pricePool.length}건</span>
              <span><Sparkles size={14} aria-hidden="true" /> {availableComparisons.length}개 사이트 비교</span>
            </div>
          </div>
        </section>

        <ComparisonOverview
          morph={subject}
          comparisons={comparisons}
          pricePool={pricePool}
        />

        <nav className="comparison-tabs" aria-label="가격비교 상세 메뉴">
          <a className="comparison-tabs__active" href="#comparison-list">
            가격비교 <span>{availableComparisons.length}</span>
          </a>
          <a href="#price-distribution">
            가격분포 <span>{pricePool.length}</span>
          </a>
          <a href="#all-listings">
            전체매물 <span>{pricePool.length}</span>
          </a>
        </nav>

        <PriceDistribution listings={pricePool} />

        <section
          className="comparison-list-section"
          id="comparison-list"
          aria-labelledby="listing-title"
        >
          <div className="detail-summary">
            <div>
              <h2 id="listing-title">쇼핑몰별 최저가</h2>
            </div>
          </div>

          <MorphListings morph={subject} comparisons={comparisons} />
        </section>

        <AllListings morph={subject} listings={pricePool} />
      </div>
    </main>
  );
}
