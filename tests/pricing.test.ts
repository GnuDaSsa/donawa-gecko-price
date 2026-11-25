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

  it("preserves the price pool and platform ranking when commercial priority changes", () => {
    const activeShop = { ...platforms[0], isActive: true };
    const firstShop = { ...activeShop, id: "a", name: "가 상점" };
    const secondShop = { ...activeShop, id: "b", name: "나 상점" };
    const emptyShop = { ...activeShop, id: "c", name: "다 상점" };
    const morphId = "test-morph";
    const seed = { ...listings[0], morphId };
    const inventory = [
      { ...seed, id: "cheapest", platform: firstShop, currentPrice: 100_000 },
      { ...seed, id: "higher", platform: firstShop, currentPrice: 300_000 },
      { ...seed, id: "second", platform: secondShop, currentPrice: 150_000 },
      { ...seed, id: "sold", platform: emptyShop, currentPrice: 10_000, status: "SOLD" as const },
    ];

    // Feed the paid shop and its highest-commission listing first, as an ad feed might.
    for (const sponsor of [undefined, firstShop, secondShop, emptyShop]) {
      const shops = [firstShop, secondShop, emptyShop]
        .map((shop) => ({ ...shop, isSponsored: shop.id === sponsor?.id }))
        .sort((a, b) => Number(b.isSponsored) - Number(a.isSponsored));
      const offers = inventory
        .map((listing) => ({
          ...listing,
          platform: { ...listing.platform, isSponsored: listing.platform.id === sponsor?.id },
          commission: listing.platform.id === sponsor?.id ? listing.currentPrice * 0.1 : 0,
        }))
        .sort((a, b) => b.commission - a.commission);

      const pool = filterComparableListings(offers, morphId);
      expect(pool.map(({ id, currentPrice }) => [id, currentPrice])).toEqual([
        ["cheapest", 100_000],
        ["second", 150_000],
        ["higher", 300_000],
      ]);
      const rows = buildPlatformComparisons(shops, offers, morphId);
      expect(rows.map(({ platform, listing }) => [platform.id, listing?.id ?? null])).toEqual([
        [firstShop.id, "cheapest"],
        [secondShop.id, "second"],
        [emptyShop.id, null],
      ]);

      const tiedOffers = offers.map((listing) =>
        listing.id === "second" ? { ...listing, currentPrice: 100_000 } : listing,
      );
      const tiedRows = buildPlatformComparisons(shops, tiedOffers, morphId);
      expect(tiedRows.map(({ platform }) => platform.name)).toEqual(["가 상점", "나 상점", "다 상점"]);
    }
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
