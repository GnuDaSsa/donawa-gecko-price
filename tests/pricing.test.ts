import { describe, expect, it } from "vitest";

import {
  buildPlatformComparisons,
  filterComparableListings,
} from "@/lib/data/repository";
import { getAvailableComparisonListings } from "@/lib/data/comparisons";
import { listings } from "@/lib/data/listings";
import { platforms } from "@/lib/data/platforms";

describe("asking-price comparison", () => {
  it("includes only ACTIVE, FIXED listings with a numeric price", () => {
    const result = filterComparableListings(listings, "morph-lilly-axanthic");

    expect(result).toHaveLength(5);
    expect(result.every((listing) => listing.status === "ACTIVE")).toBe(true);
    expect(result.every((listing) => listing.priceType === "FIXED")).toBe(true);
    expect(result.some((listing) => listing.id === "la-sold")).toBe(false);
    expect(result.some((listing) => listing.id === "la-contact")).toBe(false);
  });

  it("selects the lowest asking-price listing for each platform", () => {
    const comparisons = buildPlatformComparisons(
      platforms,
      listings,
      "morph-lilly-axanthic",
    );
    const feedle = comparisons.find((row) => row.platform.id === "platform-feedle");

    expect(feedle?.listing?.id).toBe("la-01");
    expect(feedle?.listing?.currentPrice).toBe(320_000);
  });

  it("keeps an explicit empty platform row", () => {
    const comparisons = buildPlatformComparisons(platforms, listings, "morph-axanthic");
    const watertail = comparisons.find((row) => row.platform.id === "platform-watertail");

    expect(watertail?.listing).toBeNull();
  });

  it("uses the same one-lowest-listing-per-platform set for alternate views", () => {
    const comparisons = buildPlatformComparisons(
      platforms,
      listings,
      "morph-lilly-axanthic",
    );
    const imageListings = getAvailableComparisonListings(comparisons);

    expect(imageListings).toEqual(
      comparisons.flatMap(({ listing }) => (listing ? [listing] : [])),
    );
    expect(new Set(imageListings.map((listing) => listing.platform.id)).size).toBe(
      imageListings.length,
    );
  });

  it("orders available platforms by price and keeps empty platforms last", () => {
    const comparisons = buildPlatformComparisons(
      platforms,
      listings,
      "morph-lilly-axanthic",
    );
    const availablePrices = comparisons.flatMap(({ listing }) =>
      listing ? [listing.currentPrice!] : [],
    );
    const firstEmpty = comparisons.findIndex(({ listing }) => listing === null);

    expect(availablePrices).toEqual([...availablePrices].sort((a, b) => a - b));
    expect(
      comparisons.slice(firstEmpty).every(({ listing }) => listing === null),
    ).toBe(true);
  });
});
