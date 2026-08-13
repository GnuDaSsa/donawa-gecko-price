export interface HomeListingCandidate {
  id: string;
  currentPrice: number;
  imageUrl?: string | null;
  originalTitle: string;
}

function hasImage(candidate: HomeListingCandidate): boolean {
  return Boolean(candidate.imageUrl?.trim());
}

export function selectLowestHomeListing<T extends HomeListingCandidate>(
  candidates: readonly T[],
): T | undefined {
  return [...candidates].sort(
    (a, b) =>
      a.currentPrice - b.currentPrice ||
      Number(hasImage(b)) - Number(hasImage(a)) ||
      a.id.localeCompare(b.id),
  )[0];
}
