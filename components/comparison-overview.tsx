import { ExternalLink, TrendingDown } from "lucide-react";

import { CURRENT_PRICE_WINDOW_DAYS } from "@/lib/data/comparisons";
import { buildPriceDistribution } from "@/lib/data/price-statistics";
import { formatCheckedAt, formatKRW } from "@/lib/format";
import type { Listing, Morph, PlatformComparison } from "@/lib/types";

export function ComparisonOverview({
  morph,
  comparisons,
  pricePool,
}: {
  morph: Morph;
  comparisons: PlatformComparison[];
  pricePool: Listing[];
}) {
  const available = comparisons.flatMap(({ listing }) =>
    listing ? [listing] : [],
  );
  const bestListing = available[0];
  const distribution = buildPriceDistribution(
    pricePool.flatMap(({ currentPrice }) =>
      currentPrice === undefined ? [] : [currentPrice],
    ),
  );

  return (
    <section className="comparison-overview" aria-labelledby="current-best-title">
      <div className="comparison-overview__primary">
        <div className="comparison-overview__label-row">
          <p className="comparison-overview__label" id="current-best-title">
            현재 최저 호가
          </p>
          <span><TrendingDown size={13} aria-hidden="true" /> 낮은 가격순</span>
        </div>
        {bestListing ? (
          <>
            <p className="comparison-overview__price">
              <strong>{formatKRW(bestListing.currentPrice!)}</strong>
            </p>
            <p className="comparison-overview__source">
              <span>{bestListing.platform.name}</span>
              <span aria-hidden="true">·</span>
              <span>{formatCheckedAt(bestListing)}</span>
            </p>
            <p className="comparison-overview__title">
              {bestListing.originalTitle}
            </p>
            <a
              className="comparison-overview__cta"
              href={bestListing.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              최저가 원문 보기
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </>
        ) : (
          <p className="comparison-overview__empty">
            최근 {CURRENT_PRICE_WINDOW_DAYS}일 동안 확인된 고정가 매물이 없습니다.
          </p>
        )}
      </div>

      <div className="comparison-overview__facts">
        <div className="comparison-overview__heading">
          <h2>{morph.nameKo} 가격비교</h2>
        </div>
        <dl className="comparison-facts">
          <div>
            <dt>비교 사이트</dt>
            <dd>{available.length}곳</dd>
          </div>
          <div>
            <dt>현재 매물 풀</dt>
            <dd>{pricePool.length}건</dd>
          </div>
          <div>
            <dt>최저 호가</dt>
            <dd>{distribution ? formatKRW(distribution.min) : "-"}</dd>
          </div>
          <div>
            <dt>중앙값</dt>
            <dd>{distribution ? formatKRW(Math.round(distribution.median)) : "-"}</dd>
          </div>
        </dl>
        <p className="comparison-overview__notice">
          최근 {CURRENT_PRICE_WINDOW_DAYS}일 내 판매를 확인한 매물의 공개 호가입니다. 거래 조건은 원문에서 확인하세요.
        </p>
      </div>
    </section>
  );
}
