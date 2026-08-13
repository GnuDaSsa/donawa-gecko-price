import { haversineDistanceKm, type GeoPoint } from "@/lib/geo";
import type { NearbyShopLocation } from "@/lib/types";

export type NearbyInventoryFilter = "ALL" | "WITH_LISTINGS" | "LOCATION_ONLY";

export interface NearbyShopResult {
  shop: NearbyShopLocation;
  distance?: number;
}

interface NearbyShopFilterOptions {
  query?: string;
  region?: string;
  inventory?: NearbyInventoryFilter;
  point?: GeoPoint;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("ko").replace(/\s+/g, " ");
}

export function getNearbyRegions(shops: NearbyShopLocation[]): string[] {
  return [
    "전체",
    ...new Set(shops.map(({ regionLabel }) => regionLabel.split(" ")[0])),
  ];
}

export function filterNearbyShops(
  shops: NearbyShopLocation[],
  {
    query = "",
    region = "전체",
    inventory = "ALL",
    point,
  }: NearbyShopFilterOptions = {},
): NearbyShopResult[] {
  const normalizedQuery = normalize(query);

  return shops
    .filter((shop) => region === "전체" || shop.regionLabel.startsWith(region))
    .filter((shop) => {
      if (inventory === "WITH_LISTINGS") return shop.activeListingCount > 0;
      if (inventory === "LOCATION_ONLY") return shop.activeListingCount === 0;
      return true;
    })
    .filter((shop) => {
      if (!normalizedQuery) return true;
      return [
        shop.name,
        shop.platform.name,
        shop.roadAddress,
        shop.regionLabel,
      ].some((value) => normalize(value).includes(normalizedQuery));
    })
    .map((shop) => ({
      shop,
      distance: point && shop.latitude !== undefined && shop.longitude !== undefined
        ? haversineDistanceKm(point, {
            latitude: shop.latitude,
            longitude: shop.longitude,
          })
        : undefined,
    }))
    .sort((left, right) => {
      if (left.distance !== undefined && right.distance !== undefined) {
        return left.distance - right.distance || left.shop.name.localeCompare(right.shop.name, "ko");
      }
      if (left.distance !== undefined) return -1;
      if (right.distance !== undefined) return 1;
      return right.shop.activeListingCount - left.shop.activeListingCount ||
        left.shop.name.localeCompare(right.shop.name, "ko");
    });
}
