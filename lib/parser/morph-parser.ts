import { morphs } from "@/lib/data/morphs";
import { containsAlias, escapeRegExp, normalizeText } from "@/lib/parser/normalize";
import type { Morph } from "@/lib/types";

export function stripHetSegments(normalizedText: string): string {
  const morphAliases = morphs
    .flatMap((morph) => morph.aliases)
    .map(normalizeText)
    .sort((a, b) => b.length - a.length)
    .map((alias) => alias.split(" ").map(escapeRegExp).join("\\s+"));

  const target = morphAliases.join("|");
  const hetPattern = new RegExp(
    `(?:\\b(?:100|66|50)\\s*%\\s*|\\b(?:pos|possible)\\s+)?(?:헷|het)\\s+(?:${target})(?=$|\\s)`,
    "giu",
  );

  return normalizedText.replace(hetPattern, " ").replace(/\s+/g, " ").trim();
}

export function parseMorph(normalizedText: string): Morph | undefined {
  const phenotypeText = stripHetSegments(normalizedText);

  const candidates = morphs
    .flatMap((morph) =>
      morph.aliases.map((alias) => ({ morph, alias, aliasLength: normalizeText(alias).length })),
    )
    .sort(
      (a, b) =>
        b.morph.priority - a.morph.priority || b.aliasLength - a.aliasLength,
    );

  return candidates.find(({ alias }) => containsAlias(phenotypeText, alias))?.morph;
}
