import { parseMorph } from "@/lib/parser/morph-parser";
import { normalizeText } from "@/lib/parser/normalize";
import { parsePrice } from "@/lib/parser/price-parser";
import { parseTraits } from "@/lib/parser/trait-parser";
import type { ParsedListing, RawListingInput, Sex } from "@/lib/types";

export function parseListing(input: RawListingInput): ParsedListing {
  const normalizedText = normalizeText(`${input.title} ${input.description ?? ""}`);
  const price = parsePrice(input.priceText ?? input.title);

  return {
    normalizedText,
    morph: parseMorph(normalizedText),
    traits: parseTraits(normalizedText),
    sex: parseSex(normalizedText),
    weightG: parseWeight(normalizedText),
    ...price,
  };
}

export function parseSex(normalizedText: string): Sex {
  if (/(?:^|\s)(?:암컷|암|여아|female|♀)(?=$|\s)/iu.test(normalizedText)) {
    return "FEMALE";
  }

  if (/(?:^|\s)(?:수컷|수|남아|male|♂)(?=$|\s)/iu.test(normalizedText)) {
    return "MALE";
  }

  return "UNKNOWN";
}

export function parseWeight(normalizedText: string): number | undefined {
  const match = normalizedText.match(/(\d+(?:\.\d+)?)\s*g\b/iu);
  return match ? Number(match[1]) : undefined;
}
