import type { Listing, PlatformComparison } from "@/lib/types";

export function getAvailableComparisonListings(
  comparisons: PlatformComparison[],
): Listing[] {
  return comparisons.flatMap(({ listing }) => (listing ? [listing] : []));
}
