export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\[\]{}()<>/\\|:;,_+*=!?~`'“”‘’·•-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsAlias(normalizedText: string, alias: string): boolean {
  const normalizedAlias = normalizeText(alias);
  const expression = normalizedAlias
    .split(" ")
    .map(escapeRegExp)
    .join("\\s+");

  return new RegExp(`(?:^|\\s)${expression}(?=$|\\s)`, "iu").test(normalizedText);
}
