export interface HomeListingCandidate {
  id: string;
  currentPrice: number;
  imageUrl?: string | null;
  originalTitle: string;
}

function hasImage(candidate: HomeListingCandidate): boolean {
  return Boolean(candidate.imageUrl?.trim());
}

function medianPrice(candidates: readonly HomeListingCandidate[]): number | undefined {
  const prices = candidates
    .map(({ currentPrice }) => currentPrice)
    .sort((a, b) => a - b);

  if (prices.length === 0) return undefined;

  const middle = Math.floor(prices.length / 2);
  return prices.length % 2 === 0
    ? (prices[middle - 1] + prices[middle]) / 2
    : prices[middle];
}

export function selectMidMarketHomeImage<T extends HomeListingCandidate>(
  candidates: readonly T[],
  excludedIds: ReadonlySet<string> = new Set(),
  excludedImageUrls: ReadonlySet<string> = new Set(),
): T | undefined {
  const median = medianPrice(candidates);
  if (median === undefined) return undefined;

  return candidates
    .filter(
      (candidate) =>
        hasImage(candidate) &&
        !excludedIds.has(candidate.id) &&
        !excludedImageUrls.has(candidate.imageUrl!.trim()),
    )
    .sort(
      (a, b) =>
        Math.abs(a.currentPrice - median) - Math.abs(b.currentPrice - median) ||
        a.currentPrice - b.currentPrice ||
        a.id.localeCompare(b.id),
    )[0];
}
