import { normalizeText } from "@/lib/parser/normalize";
import type { PriceType } from "@/lib/types";

export interface PriceParseResult {
  price?: number;
  priceType: PriceType;
  bundleCount?: number;
}

const CONTACT_WORDS = ["가격문의", "가격 문의", "문의", "협의", "연락", "dm", "교환"];
const AUCTION_WORDS = ["경매", "옥션", "auction", "입찰"];

export function parsePrice(value: string): PriceParseResult {
  const normalized = normalizeText(value.replace(/(?<=\d),(?=\d{3}\b)/g, ""));
  const compact = normalized.replace(/\s+/g, "");

  if (CONTACT_WORDS.some((word) => compact.includes(word.replace(/\s+/g, "")))) {
    return { priceType: "CONTACT" };
  }

  const bundleCount = parseBundleCount(normalized);
  const isBundle = bundleCount !== undefined || /(?:일괄|묶음|bundle)/iu.test(normalized);
  const isAuction = AUCTION_WORDS.some((word) => normalized.includes(word));
  const price = extractPrice(normalized);

  if (isBundle) {
    return { price, priceType: "BUNDLE", bundleCount };
  }

  if (isAuction) {
    return { price, priceType: "AUCTION" };
  }

  if (price !== undefined) {
    return { price, priceType: "FIXED" };
  }

  return { priceType: "UNKNOWN" };
}

function extractPrice(normalized: string): number | undefined {
  const tenThousand = normalized.match(/(\d+(?:\.\d+)?)\s*만(?:원)?/u);
  if (tenThousand) {
    return Math.round(Number(tenThousand[1]) * 10_000);
  }

  const directCandidates = [...normalized.matchAll(/(?:^|\s)(\d[\d,]{3,})(?:\s*원)?(?=$|\s)/gu)];
  if (directCandidates.length > 0) {
    return Number(directCandidates.at(-1)![1].replace(/,/g, ""));
  }

  const withoutWeightsAndPercentages = normalized
    .replace(/\d+(?:\.\d+)?\s*g\b/giu, " ")
    .replace(/\d+\s*%/gu, " ");
  const shortCandidates = [...withoutWeightsAndPercentages.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)(?=$|\s)/gu)];
  const short = shortCandidates.at(-1)?.[1];

  if (!short) {
    return undefined;
  }

  const value = Number(short);
  return value < 1_000 ? Math.round(value * 10_000) : Math.round(value);
}

function parseBundleCount(normalized: string): number | undefined {
  const numeric = normalized.match(/(\d+)\s*마리/u);
  if (numeric) {
    return Number(numeric[1]);
  }

  const koreanCounts: Record<string, number> = {
    한: 1,
    두: 2,
    세: 3,
    네: 4,
  };
  const korean = normalized.match(/(한|두|세|네)\s*마리/u);
  return korean ? koreanCounts[korean[1]] : undefined;
}
