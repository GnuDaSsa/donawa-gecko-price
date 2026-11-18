/**
 * 공유 미리보기 카드가 준비된 상세 페이지 슬러그.
 *
 * `scripts/build-og-cards.py`가 sitemap의 모프·키워드 페이지마다
 * `public/og/{kind}/{slug}.png`를 만들고 이 목록을 갱신한다.
 * 목록에 없는 슬러그는 사이트 기본 카드(`/og/donawa-og.png`)를 쓴다.
 */
export const MORPH_OG_SLUGS: readonly string[] = [
  "axanthic",
  "cappuccino",
  "dalmatian",
  "flame",
  "frappuccino",
  "harlequin",
  "lilly-axanthic",
  "lilly-white",
  "phantom",
  "pinstripe",
  "sable",
  "soft-scale",
];

export const TRAIT_OG_SLUGS: readonly string[] = [
  "bicolor",
  "brindle",
  "charcoal",
  "cream-base",
  "creamsicle",
  "dark-base",
  "dripping",
  "empty-back",
  "extreme",
  "full-pin",
  "het-axanthic",
  "high-expression",
  "hypo",
  "inkspot",
  "lilly-sable",
  "mosaic",
  "non-lilly",
  "normal",
  "partial-pin",
  "patternless",
  "quadstripe",
  "red-base",
  "solid-back",
  "spot",
  "super-dalmatian",
  "super-stripe",
  "tangerine",
  "tiger",
  "tricolor",
  "white-crown",
  "white-pin",
  "white-spot",
  "white-wall",
];

export function hasMorphOgCard(slug: string): boolean {
  return MORPH_OG_SLUGS.includes(slug);
}

export function hasTraitOgCard(slug: string): boolean {
  return TRAIT_OG_SLUGS.includes(slug);
}
