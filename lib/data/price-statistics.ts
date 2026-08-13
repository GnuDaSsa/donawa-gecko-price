export interface PriceDistributionStats {
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
}

function quantile(sorted: number[], percentile: number): number {
  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = index - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

/**
 * Builds a Tukey boxplot distribution from asking prices.
 * Quartiles use linear interpolation (R-7), and whiskers end at the
 * furthest observed price within 1.5 × IQR rather than at the fence itself.
 */
export function buildPriceDistribution(
  prices: number[],
): PriceDistributionStats | undefined {
  const sorted = prices
    .filter((price) => Number.isFinite(price) && price >= 0)
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return undefined;
  }

  const min = sorted[0];
  const max = sorted.at(-1)!;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const mean = sorted.reduce((sum, price) => sum + price, 0) / sorted.length;
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inRange = sorted.filter(
    (price) => price >= lowerFence && price <= upperFence,
  );

  return {
    count: sorted.length,
    min,
    q1,
    median,
    q3,
    max,
    mean,
    lowerWhisker: inRange[0] ?? min,
    upperWhisker: inRange.at(-1) ?? max,
    outliers: sorted.filter(
      (price) => price < lowerFence || price > upperFence,
    ),
  };
}
