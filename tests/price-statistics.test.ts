import { describe, expect, it } from "vitest";

import { buildPriceDistribution } from "@/lib/data/price-statistics";

describe("price distribution", () => {
  it("calculates R-7 quartiles for a known series", () => {
    const result = buildPriceDistribution([50, 10, 40, 20, 30]);

    expect(result).toMatchObject({
      count: 5,
      min: 10,
      q1: 20,
      median: 30,
      q3: 40,
      max: 50,
      lowerWhisker: 10,
      upperWhisker: 50,
      outliers: [],
    });
    expect(result?.mean).toBe(30);
  });

  it("keeps a high outlier outside the upper whisker", () => {
    const result = buildPriceDistribution([10, 20, 20, 30, 200]);

    expect(result?.upperWhisker).toBe(30);
    expect(result?.outliers).toEqual([200]);
    expect(result?.max).toBe(200);
  });

  it("returns undefined for an empty or invalid pool", () => {
    expect(buildPriceDistribution([])).toBeUndefined();
    expect(buildPriceDistribution([Number.NaN, Number.POSITIVE_INFINITY])).toBeUndefined();
  });

  it("keeps a singleton distribution stable", () => {
    expect(buildPriceDistribution([320_000])).toEqual({
      count: 1,
      min: 320_000,
      q1: 320_000,
      median: 320_000,
      q3: 320_000,
      max: 320_000,
      mean: 320_000,
      lowerWhisker: 320_000,
      upperWhisker: 320_000,
      outliers: [],
    });
  });
});
