import type { CSSProperties } from "react";

import { buildPriceDistribution } from "@/lib/data/price-statistics";
import { formatKRW } from "@/lib/format";
import type { Listing } from "@/lib/types";

function roundedKRW(value: number): string {
  return formatKRW(Math.round(value));
}

export function PriceDistribution({ listings }: { listings: Listing[] }) {
  const stats = buildPriceDistribution(
    listings.flatMap(({ currentPrice }) =>
      currentPrice === undefined ? [] : [currentPrice],
    ),
  );

  if (!stats) {
    return (
      <section
        className="price-distribution price-distribution--empty"
        id="price-distribution"
        aria-labelledby="price-distribution-title"
      >
        <div>
          <h2 id="price-distribution-title">가격 분포</h2>
        </div>
        <p>분포 계산 대상 없음</p>
      </section>
    );
  }

  const span = stats.max - stats.min;
  const position = (value: number) =>
    span === 0 ? 50 : ((value - stats.min) / span) * 100;
  const q1Position = position(stats.q1);
  const q3Position = position(stats.q3);
  const rawBoxHeight = q3Position - q1Position;
  const boxHeight = Math.max(rawBoxHeight, 7.5);
  const boxBottom = Math.min(
    100 - boxHeight,
    Math.max(0, q1Position - (boxHeight - rawBoxHeight) / 2),
  );

  const plotStyle = {
    "--lower-whisker": `${position(stats.lowerWhisker)}%`,
    "--upper-whisker": `${position(stats.upperWhisker)}%`,
    "--box-bottom": `${boxBottom}%`,
    "--box-height": `${boxHeight}%`,
    "--median": `${position(stats.median)}%`,
  } as CSSProperties;

  return (
    <section
      className="price-distribution"
      id="price-distribution"
      aria-labelledby="price-distribution-title"
    >
      <div className="price-distribution__header">
        <div>
          <h2 id="price-distribution-title">현재 매물 가격 분포</h2>
        </div>
        <div className="price-distribution__mean">
          <span>평균 호가</span>
          <strong>{roundedKRW(stats.mean)}</strong>
        </div>
      </div>

      <div
        className="boxplot"
        style={plotStyle}
        role="img"
        aria-label={`${stats.count}건의 가격 분포. 최저 ${roundedKRW(stats.min)}, 25% ${roundedKRW(stats.q1)}, 중앙값 ${roundedKRW(stats.median)}, 75% ${roundedKRW(stats.q3)}, 최고 ${roundedKRW(stats.max)}`}
      >
        <div className="boxplot__vertical-layout">
          <div className="boxplot__canvas" aria-hidden="true">
            <span className="boxplot__axis" />
            <span className="boxplot__whisker" />
            <span className="boxplot__cap boxplot__cap--low" />
            <span className="boxplot__cap boxplot__cap--high" />
            <span className="boxplot__box" />
            <span className="boxplot__median" />
            {stats.outliers.map((price, index) => (
              <span
                className="boxplot__outlier"
                key={`${price}-${index}`}
                style={{
                  bottom: `${position(price)}%`,
                  left: `calc(50% + ${((index % 5) - 2) * 13}px)`,
                }}
                title={roundedKRW(price)}
              />
            ))}
          </div>
          <div className="boxplot__ends" aria-hidden="true">
            <span><small>최고</small>{roundedKRW(stats.max)}</span>
            <span><small>최저</small>{roundedKRW(stats.min)}</span>
          </div>
        </div>
      </div>

      <dl className="distribution-stats">
        <div>
          <dt>최저</dt>
          <dd>{roundedKRW(stats.min)}</dd>
        </div>
        <div>
          <dt>25%</dt>
          <dd>{roundedKRW(stats.q1)}</dd>
        </div>
        <div className="distribution-stats__median">
          <dt>중앙값</dt>
          <dd>{roundedKRW(stats.median)}</dd>
        </div>
        <div>
          <dt>75%</dt>
          <dd>{roundedKRW(stats.q3)}</dd>
        </div>
        <div>
          <dt>최고</dt>
          <dd>{roundedKRW(stats.max)}</dd>
        </div>
      </dl>

      {stats.outliers.length > 0 && (
        <div className="distribution-outliers">
          <strong>분포 밖 가격 {stats.outliers.length}건</strong>
          <div>
            {stats.outliers.map((price, index) => (
              <span key={`${price}-label-${index}`}>{roundedKRW(price)}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
