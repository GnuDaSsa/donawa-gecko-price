import { traits } from "@/lib/data/traits";
import { containsAlias } from "@/lib/parser/normalize";
import type { Trait } from "@/lib/types";

export function parseTraits(normalizedText: string): Trait[] {
  return traits.filter((trait) =>
    [...trait.aliases].sort((a, b) => b.length - a.length).some((alias) =>
      containsAlias(normalizedText, alias),
    ),
  );
}
