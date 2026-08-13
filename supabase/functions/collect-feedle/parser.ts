export type FeedleListingStatus = "ACTIVE" | "SOLD" | "UNKNOWN";
export type FeedleSex = "MALE" | "FEMALE" | "UNKNOWN";

export type FeedleListing = {
  externalId: string;
  originalTitle: string;
  safeDescription: string;
  originalUrl: string;
  imageUrl?: string;
  currentPrice?: number;
  priceType: "FIXED" | "UNKNOWN";
  status: FeedleListingStatus;
  sex: FeedleSex;
  weightG?: number;
  morphText: string;
  traitText: string;
  rawData: Record<string, string | number | undefined>;
};

export type SitemapEntry = {
  url: string;
  lastModified?: string;
};

type JsonObject = Record<string, unknown>;

const SAFE_PROPERTIES = new Set(["종", "모프", "성별", "크기", "체중", "몸무게", "해칭일"]);

function asObject(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasType(value: unknown, expected: string): boolean {
  const object = asObject(value);
  if (!object) return false;
  const type = object["@type"];
  return Array.isArray(type) ? type.includes(expected) : type === expected;
}

function findProduct(value: unknown): JsonObject | undefined {
  if (hasType(value, "Product")) return asObject(value);

  if (Array.isArray(value)) {
    for (const child of value) {
      const product = findProduct(child);
      if (product) return product;
    }
    return undefined;
  }

  const object = asObject(value);
  if (!object) return undefined;

  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    const product = findProduct(object[key]);
    if (product) return product;
  }

  return undefined;
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function propertyMap(product: JsonObject): Map<string, string> {
  const result = new Map<string, string>();
  const properties = Array.isArray(product.additionalProperty)
    ? product.additionalProperty
    : [];

  for (const property of properties) {
    const object = asObject(property);
    const name = asString(object?.name);
    const value = asString(object?.value) ??
      (typeof object?.value === "number" ? String(object.value) : undefined);
    if (name && value) result.set(name, value);
  }

  return result;
}

function firstOffer(value: unknown): JsonObject | undefined {
  if (Array.isArray(value)) return asObject(value[0]);
  return asObject(value);
}

function firstImage(value: unknown): string | undefined {
  if (Array.isArray(value)) return asString(value[0]);
  return asString(value);
}

function parseSex(value?: string): FeedleSex {
  if (!value) return "UNKNOWN";
  if (/암컷|female/i.test(value)) return "FEMALE";
  if (/수컷|male/i.test(value)) return "MALE";
  return "UNKNOWN";
}

function parseStatus(value?: string): FeedleListingStatus {
  if (!value) return "UNKNOWN";
  if (/InStock$/i.test(value)) return "ACTIVE";
  if (/SoldOut$/i.test(value)) return "SOLD";
  return "UNKNOWN";
}

export function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const blocks = xml.matchAll(/<url>([\s\S]*?)<\/url>/gi);

  for (const block of blocks) {
    const body = block[1];
    const url = body.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
    if (!url) continue;
    const lastModified = body.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1];
    entries.push({
      url: decodeXml(url.trim()),
      lastModified: lastModified?.trim(),
    });
  }

  return entries;
}

export function parseFeedleProductHtml(html: string, fallbackUrl: string): FeedleListing | null {
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  let product: JsonObject | undefined;
  for (const script of scripts) {
    try {
      product = findProduct(JSON.parse(script[1].trim()));
      if (product) break;
    } catch {
      // Ignore malformed third-party JSON-LD and continue to the next block.
    }
  }

  if (!product) return null;

  const category = asString(product.category) ?? "";
  if (!category.includes("크레스티드 게코")) return null;

  const originalUrl = asString(product.url) ?? fallbackUrl;
  const externalId = originalUrl.split("/").filter(Boolean).at(-1);
  const originalTitle = asString(product.name);
  if (!externalId || !originalTitle) return null;

  const properties = propertyMap(product);
  const offer = firstOffer(product.offers);
  const rawPrice = typeof offer?.price === "number"
    ? offer.price
    : Number(asString(offer?.price));
  const currentPrice = Number.isFinite(rawPrice) && rawPrice > 0
    ? Math.round(rawPrice)
    : undefined;
  const status = parseStatus(asString(offer?.availability));
  const weightText = properties.get("체중") ?? properties.get("몸무게");
  const weight = weightText?.match(/(\d+(?:\.\d+)?)\s*g/i)?.[1];
  const weightG = weight ? Number(weight) : undefined;
  const safePairs = [...properties.entries()].filter(([name]) => SAFE_PROPERTIES.has(name));
  const safeDescription = safePairs.map(([name, value]) => `${name}: ${value}`).join(" · ");
  const morphText = properties.get("모프") ?? originalTitle.replace("크레스티드 게코", "").trim();
  const sexText = properties.get("성별");

  return {
    externalId,
    originalTitle,
    safeDescription,
    originalUrl,
    imageUrl: firstImage(product.image),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status,
    sex: parseSex(sexText),
    weightG,
    morphText,
    traitText: `${morphText} ${originalTitle}`,
    rawData: {
      source: "feedle-jsonld",
      category,
      morph: morphText,
      sex: sexText,
      weight_g: weightG,
      availability: asString(offer?.availability),
    },
  };
}
