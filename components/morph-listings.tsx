"use client";

import { ArrowDownWideNarrow, Clock3, ExternalLink, Grid2X2, Rows3 } from "lucide-react";
import { useState } from "react";

import { ListingCard } from "@/components/listing-card";
import { TraitBadge } from "@/components/trait-badge";
import {
  formatCheckedAt,
  formatKRW,
  formatListingMeta,
} from "@/lib/format";
import type { Morph, PlatformComparison } from "@/lib/types";

type View = "price" | "image";

export function MorphListings({
  morph,
  comparisons,
}: {
  morph: Morph;
  comparisons: PlatformComparison[];
}) {
  const [view, setView] = useState<View>("price");

  return (
    <>
      <div className="comparison-toolbar">
        <div className="comparison-toolbar__states" aria-label="현재 비교 조건">
          <span className="comparison-toolbar__sort">
            <ArrowDownWideNarrow size={14} aria-hidden="true" />
            최저가순
          </span>
          <span>판매중</span>
          <span>고정가</span>
        </div>
        <div className="view-toggle" role="group" aria-label="매물 보기 방식">
          <button
            type="button"
            aria-pressed={view === "price"}
            onClick={() => setView("price")}
          >
            <Rows3 size={15} aria-hidden="true" />
            가격 비교
          </button>
          <button
            type="button"
            aria-pressed={view === "image"}
            onClick={() => setView("image")}
          >
            <Grid2X2 size={15} aria-hidden="true" />
            이미지로 보기
          </button>
        </div>
      </div>

      <div className="view-panel">
        {comparisons.length === 0 ? (
          <div className="empty-state">
            <div>
              <h3>현재 매물 없음</h3>
              <p>다음 데이터 갱신 대기</p>
            </div>
          </div>
        ) : view === "price" ? (
          <PriceView comparisons={comparisons} />
        ) : (
          <div className="listing-grid">
            {comparisons.map(({ platform, listing }) =>
              listing ? (
                <ListingCard key={platform.id} listing={listing} morph={morph} />
              ) : (
                <article className="listing-card listing-card--empty" key={platform.id}>
                  <span className="platform-mark" aria-hidden="true">
                    {platform.name.slice(0, 1)}
                  </span>
                  <strong>{platform.name}</strong>
                  <p>현재 확인된 매물 없음</p>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </>
  );
}

function PriceView({ comparisons }: { comparisons: PlatformComparison[] }) {
  return (
    <div className="price-table">
      {comparisons.map(({ platform, listing }, index) =>
        listing ? (
          <article
            className={`price-row${index === 0 ? " price-row--best" : ""}`}
            key={platform.id}
          >
            <div className="price-row__platform">
              <span className="platform-mark" aria-hidden="true">
                {platform.name.slice(0, 1)}
              </span>
              <span>
                {platform.name}
                {index === 0 && <small>최저가</small>}
              </span>
            </div>
            <div className="price-row__price">
              <strong>{formatKRW(listing.currentPrice!)}</strong>
              <span>{formatListingMeta(listing)}</span>
            </div>
            <div className="price-row__listing">
              <h3>{listing.originalTitle}</h3>
              <div className="trait-list">
                {listing.traits.map((trait) => (
                  <TraitBadge key={trait.id} name={trait.nameKo} />
                ))}
              </div>
            </div>
            <span className="price-row__freshness">
              <Clock3 size={13} aria-hidden="true" />
              {formatCheckedAt(listing)}
            </span>
            <a
              className="external-button"
              href={listing.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${platform.name} 최저 호가 매물 원문 보기`}
            >
              <span>원문 보기</span>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </article>
        ) : (
          <article className="price-row price-row--empty" key={platform.id}>
            <div className="price-row__platform">
              <span className="platform-mark" aria-hidden="true">
                {platform.name.slice(0, 1)}
              </span>
              {platform.name}
            </div>
            <p className="price-row__empty">현재 확인된 매물 없음</p>
          </article>
        ),
      )}
    </div>
  );
}
