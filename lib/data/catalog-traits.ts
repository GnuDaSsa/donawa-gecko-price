import type { Morph, Trait } from "@/lib/types";

export interface CatalogTraitDefinition {
  traitSlug: string;
  subject: Morph;
}

function subject(
  slug: string,
  nameKo: string,
  nameEn: string,
  aliases: string[],
  displayOrder: number,
): Morph {
  return {
    id: `catalog-trait-${slug}`,
    slug,
    nameKo,
    nameEn,
    aliases,
    representativeImage: `/morphs/${slug}.webp`,
    imagePosition: "center",
    visibleOnHome: true,
    displayOrder,
    priority: 50,
  };
}

export const catalogTraits: CatalogTraitDefinition[] = [
  {
    traitSlug: "patternless",
    subject: subject("patternless", "패턴리스", "Patternless", ["패턴리스", "무패턴", "patternless"], 13),
  },
  {
    traitSlug: "bicolor",
    subject: subject("bicolor", "바이컬러", "Bicolor", ["바이컬러", "바이 컬러", "bicolor", "bi-color"], 14),
  },
  {
    traitSlug: "tiger",
    subject: subject("tiger", "타이거", "Tiger", ["타이거", "tiger"], 15),
  },
  {
    traitSlug: "brindle",
    subject: subject("brindle", "브린들", "Brindle", ["브린들", "brindle"], 16),
  },
  {
    traitSlug: "extreme",
    subject: subject(
      "extreme-harlequin",
      "익스트림 할리퀸",
      "Extreme Harlequin",
      ["익스트림 할리퀸", "익할", "트익", "extreme harlequin"],
      17,
    ),
  },
  {
    traitSlug: "quadstripe",
    subject: subject("quadstripe", "쿼드스트라이프", "Quadstripe", ["쿼드스트라이프", "쿼드", "쿼드 핀", "quadstripe"], 18),
  },
  {
    traitSlug: "tricolor",
    subject: subject("tricolor", "트라이컬러", "Tricolor", ["트라이컬러", "트라이", "tricolor"], 19),
  },
  {
    traitSlug: "white-wall",
    subject: subject("white-wall", "화이트월", "White Wall", ["화이트월", "화이트 월", "white wall"], 20),
  },
];

export function getCatalogTraitDefinition(slug: string) {
  return catalogTraits.find(({ subject: item }) => item.slug === slug);
}

export function resolveTraitSlug(slug: string): string {
  return getCatalogTraitDefinition(slug)?.traitSlug ?? slug;
}

export function buildTraitSubject(
  trait: Trait,
  fallbackImage = "/morphs/harlequin.webp",
): Morph {
  const curated = catalogTraits.find(({ traitSlug }) => traitSlug === trait.slug);

  return {
    id: `catalog-trait-${trait.slug}`,
    slug: trait.slug,
    nameKo: trait.nameKo,
    nameEn: trait.nameEn,
    aliases: [...new Set([...trait.aliases, ...(curated?.subject.aliases ?? [])])],
    representativeImage: curated?.subject.representativeImage ?? fallbackImage,
    imagePosition: curated?.subject.imagePosition ?? "center",
    visibleOnHome: true,
    displayOrder: curated?.subject.displayOrder ?? 1_000,
    priority: curated?.subject.priority ?? 50,
  };
}
