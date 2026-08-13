export type DictionaryRow = {
  id: string;
  slug: string;
  aliases: unknown;
  name_ko: string;
};

export function normalizeDictionaryText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^0-9a-z가-힣]+/g, "");
}

function aliases(row: DictionaryRow): string[] {
  const values = Array.isArray(row.aliases)
    ? row.aliases.filter((value): value is string => typeof value === "string")
    : [];
  return [row.name_ko, ...values].sort(
    (left, right) => normalizeDictionaryText(right).length - normalizeDictionaryText(left).length,
  );
}

function rowBySlug(rows: DictionaryRow[], slug: string): DictionaryRow | undefined {
  return rows.find((row) => row.slug === slug);
}

export function matchDictionary(
  text: string,
  rows: DictionaryRow[],
): DictionaryRow | undefined {
  const normalized = normalizeDictionaryText(text);
  const isNonLilly = /(?:논릴리|nonlilly)/i.test(normalized);
  const hasLilly = !isNonLilly && /(?:릴리화이트|릴리|lillywhite|lilly)/i.test(normalized);
  const hasCappuccino = /(?:카푸치노|cappuccino)/i.test(normalized);
  const hasAxanthic = /(?:아잔틱|axanthic)/i.test(normalized);
  const hasHetAxanthic = /(?:헷(?:100)?아잔틱|100헷아잔틱|het(?:100)?axanthic|100hetaxanthic)/i
    .test(normalized);

  if (hasLilly && hasCappuccino) {
    const frappuccino = rowBySlug(rows, "frappuccino");
    if (frappuccino) return frappuccino;
  }
  if (hasLilly && hasAxanthic && !hasHetAxanthic) {
    const lillyAxanthic = rowBySlug(rows, "lilly-axanthic");
    if (lillyAxanthic) return lillyAxanthic;
  }

  const candidates = rows
    .flatMap((row) =>
      aliases(row).map((alias) => ({ row, alias: normalizeDictionaryText(alias) })),
    )
    .filter(({ alias }) => alias.length > 1 && normalized.includes(alias))
    .sort((left, right) => right.alias.length - left.alias.length);

  for (const candidate of candidates) {
    if (candidate.row.slug === "lilly-white" && isNonLilly) continue;
    if (candidate.row.slug === "axanthic" && hasHetAxanthic) continue;
    return candidate.row;
  }

  return undefined;
}

export function matchTraits(text: string, rows: DictionaryRow[]): DictionaryRow[] {
  const normalized = normalizeDictionaryText(text);
  return rows.filter((row) =>
    aliases(row).some((alias) => {
      const normalizedAlias = normalizeDictionaryText(alias);
      return normalizedAlias.length > 1 && normalized.includes(normalizedAlias);
    }),
  );
}
