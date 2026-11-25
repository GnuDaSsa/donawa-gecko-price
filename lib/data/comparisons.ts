import type { Listing, PlatformComparison } from "@/lib/types";

export const CURRENT_PRICE_WINDOW_DAYS = 14;

export function getAvailableComparisonListings(
  comparisons: PlatformComparison[],
): Listing[] {
  return comparisons.flatMap(({ listing }) => (listing ? [listing] : []));
}
