import { describe, expect, it } from "vitest";

import { filterNearbyShops, getNearbyRegions } from "@/lib/nearby-shops";
import type { NearbyShopLocation } from "@/lib/types";

function shop(
  id: string,
  name: string,
  regionLabel: string,
  activeListingCount: number,
  latitude?: number,
  longitude?: number,
): NearbyShopLocation {
  return {
    id,
    name,
    regionLabel,
    roadAddress: `${regionLabel} 테스트로 1`,
    latitude,
    longitude,
    locationType: "STORE",
    coordinateAccuracy: latitude === undefined ? "UNVERIFIED" : "STREET",
    visitPolicy: "CONFIRM_REQUIRED",
    inventoryScope: "PLATFORM_ONLINE",
    evidenceUrl: "https://example.com/location",
    verifiedAt: "2026-08-13T00:00:00Z",
    fulfillmentOptions: [],
    activeListingCount,
    minPrice: activeListingCount > 0 ? 50_000 : undefined,
    morphCounts: [],
    previewListings: [],
    platform: {
      id: `platform-${id}`,
      name,
      homepageUrl: "https://example.com",
      collectorType: "MANUAL",
      isActive: activeListingCount > 0,
    },
  };
}

const shops = [
  shop("songpa", "송파게코", "서울 송파", 3, 37.50, 127.12),
  shop("daejeon", "디어렙 본점", "대전 유성", 0, 36.37, 127.31),
  shop("unmapped", "좌표대기샵", "부산 연제", 0),
];

describe("nearby shop directory filters", () => {
  it("keeps location-only shops in the default directory", () => {
    expect(filterNearbyShops(shops).map(({ shop: item }) => item.id)).toEqual([
      "songpa",
      "daejeon",
      "unmapped",
    ]);
  });

  it("sorts by distance only after a user point is supplied", () => {
    expect(filterNearbyShops(shops, {
      point: { latitude: 37.5, longitude: 127.12 },
    })[0]?.shop.id).toBe("songpa");
    expect(filterNearbyShops(shops)[0]?.distance).toBeUndefined();
  });

  it("filters current listings and location-only shops separately", () => {
    expect(filterNearbyShops(shops, { inventory: "WITH_LISTINGS" }))
      .toHaveLength(1);
    expect(filterNearbyShops(shops, { inventory: "LOCATION_ONLY" })
      .map(({ shop: item }) => item.id))
      .toEqual(["daejeon", "unmapped"]);
  });

  it("searches store, platform, address and region text", () => {
    expect(filterNearbyShops(shops, { query: "유성" })[0]?.shop.id).toBe("daejeon");
    expect(filterNearbyShops(shops, { query: "좌표대기" })[0]?.shop.id).toBe("unmapped");
    expect(filterNearbyShops(shops, { region: "서울" })[0]?.shop.id).toBe("songpa");
  });

  it("builds region options without limiting the shop catalog", () => {
    expect(getNearbyRegions(shops)).toEqual(["전체", "서울", "대전", "부산"]);
  });
});
