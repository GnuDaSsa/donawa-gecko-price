export type PublicShopListingStatus = "ACTIVE" | "SOLD" | "UNKNOWN";
export type PublicShopSex = "MALE" | "FEMALE" | "UNKNOWN";

export type PublicShopListing = {
  externalId: string;
  originalTitle: string;
  safeDescription: string;
  originalUrl: string;
  imageUrl?: string;
  currentPrice?: number;
  priceType: "FIXED" | "UNKNOWN";
  status: PublicShopListingStatus;
  sex: PublicShopSex;
  weightG?: number;
  morphText: string;
  traitText: string;
  rawData: Record<string, string | number | boolean | undefined>;
};

export type ZooseyoProductTarget = {
  url: string;
  status: PublicShopListingStatus;
  imageUrl?: string;
};

export type Cafe24SourceOptions = {
  expectedHostname: string;
  source: string;
  safeDescription: string;
  categoryNo?: number;
};

export type ImwebSourceOptions = {
  expectedHostname: string;
  source: string;
  safeDescription: string;
};

type JsonObject = Record<string, unknown>;

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

function findJsonLdProduct(html: string): JsonObject | undefined {
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const script of scripts) {
    try {
      const product = findProduct(JSON.parse(script[1].trim()));
      if (product) return product;
    } catch {
      // Ignore malformed third-party JSON-LD and keep looking.
    }
  }

  return undefined;
}

function firstOffer(value: unknown): JsonObject | undefined {
  if (Array.isArray(value)) return asObject(value[0]);
  return asObject(value);
}

function firstImage(value: unknown): string | undefined {
  if (Array.isArray(value)) return asString(value[0]);
  return asString(value);
}

function parsePrice(value: unknown): number | undefined {
  const number = typeof value === "number"
    ? value
    : Number(asString(value)?.replaceAll(",", ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

function parseSex(value: string): PublicShopSex {
  const female = /암컷|여아|\bfemale\b/i.test(value);
  const male = /수컷|남아|\bmale\b/i.test(value);
  if (female && male) return "UNKNOWN";
  if (female) return "FEMALE";
  if (male) return "MALE";
  return "UNKNOWN";
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function availabilityStatus(value?: string): PublicShopListingStatus {
  if (!value) return "UNKNOWN";
  if (/InStock$/i.test(value)) return "ACTIVE";
  if (/(SoldOut|OutOfStock)$/i.test(value)) return "SOLD";
  return "UNKNOWN";
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function isClearlyCrestedAnimalTitle(value: string): boolean {
  const clearlyCrested = /크레스티드\s*게코/i.test(value) ||
    /릴리화이트|릴리\s*화이트|릴잔틱|카푸치노|프라푸치노|프라프치노|아잔틱|세이블|달마시안|할리퀸|핀스트라이프|팬텀|소프트\s*스케일|플레임/i.test(value);
  const clearlySupply = /사육장|먹이|푸드|용품|쉘터|테라리움|케이지|은신처|온습도|세트/i.test(value);
  const clearlyOtherSpecies = /레오파드\s*게코|펫\s*테일|가고일\s*게코|리키에너스|데이\s*게코|토케이|카멜레온|거북|스네이크|\b뱀\b/i.test(value);
  return clearlyCrested && !clearlySupply && !clearlyOtherSpecies;
}

function htmlAttribute(tag: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = tag.match(
    new RegExp(`\\b${escapedName}=["']([^"']*)["']`, "i"),
  )?.[1];
  return value ? decodeHtml(value).trim() : undefined;
}

function cafe24ProductId(url: URL): string | undefined {
  const queryId = url.searchParams.get("product_no");
  if (queryId && /^\d+$/.test(queryId)) return queryId;
  return url.pathname.match(/^\/product\/[^/]+\/(\d+)(?:\/|$)/)?.[1];
}

function canonicalCafe24Url(url: URL, productId: string): string {
  const slugMatch = url.pathname.match(/^\/product\/([^/]+)\/(\d+)(?:\/|$)/);
  url.hash = "";
  if (slugMatch) {
    url.pathname = `/product/${slugMatch[1]}/${productId}/`;
    url.search = "";
    return url.toString();
  }

  const category = url.searchParams.get("cate_no");
  url.pathname = "/product/detail.html";
  url.search = "";
  url.searchParams.set("product_no", productId);
  if (category && /^\d+$/.test(category)) url.searchParams.set("cate_no", category);
  return url.toString();
}

export function parseCafe24CategoryHtml(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const urls = new Map<string, string>();

  for (const anchor of html.matchAll(
    /<a\b[^>]*href=["']([^"']*(?:\/product\/|\/product\/detail\.html\?)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    try {
      const url = new URL(decodeHtml(anchor[1]), base);
      if (url.protocol !== "https:" || url.hostname !== base.hostname) continue;
      const productId = cafe24ProductId(url);
      if (!productId) continue;

      let decodedPath = url.pathname;
      try {
        decodedPath = decodeURIComponent(url.pathname);
      } catch {
        // Keep the encoded path if a third-party link is malformed.
      }
      const titleText = `${decodedPath} ${stripTags(anchor[2])}`;
      if (!isClearlyCrestedAnimalTitle(titleText)) continue;
      urls.set(productId, canonicalCafe24Url(url, productId));
    } catch {
      // Ignore non-HTTPS, off-site, and malformed category links.
    }
  }

  return [...urls.values()];
}

function safeCafe24OriginalUrl(
  fallbackUrl: string,
  expectedHostname: string,
  externalId: string,
): string | undefined {
  try {
    const url = new URL(fallbackUrl);
    if (url.protocol !== "https:" || url.hostname !== expectedHostname) return undefined;
    if (cafe24ProductId(url) !== externalId) return undefined;
    return canonicalCafe24Url(url, externalId);
  } catch {
    return undefined;
  }
}

export function parseCafe24ProductHtml(
  html: string,
  fallbackUrl: string,
  options: Cafe24SourceOptions,
): PublicShopListing | null {
  const product = findJsonLdProduct(html);
  if (!product) return null;

  const rawTitle = asString(product.name);
  const originalTitle = rawTitle ? stripTags(rawTitle) : undefined;
  if (!originalTitle || !isClearlyCrestedAnimalTitle(originalTitle)) return null;

  const metaId = metaContent(html, "product:productId");
  let fallbackId: string | undefined;
  try {
    fallbackId = cafe24ProductId(new URL(fallbackUrl));
  } catch {
    return null;
  }
  const externalId = metaId && /^\d+$/.test(metaId) ? metaId : fallbackId;
  if (!externalId) return null;

  const originalUrl = safeCafe24OriginalUrl(
    fallbackUrl,
    options.expectedHostname,
    externalId,
  );
  if (!originalUrl) return null;

  const offer = firstOffer(product.offers);
  const currentPrice = parsePrice(offer?.price);
  const pageStatus = newrunStatus(html);
  const status = pageStatus === "UNKNOWN"
    ? availabilityStatus(asString(offer?.availability))
    : pageStatus;

  return {
    externalId,
    originalTitle,
    safeDescription: options.safeDescription,
    originalUrl,
    imageUrl: firstImage(product.image),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status,
    sex: parseSex(originalTitle),
    morphText: originalTitle,
    traitText: originalTitle,
    rawData: {
      source: options.source,
      product_sold_out: status === "SOLD",
      category_no: options.categoryNo,
    },
  };
}

function imwebProductId(url: URL): string | undefined {
  const queryId = url.searchParams.get("idx");
  if (queryId && /^\d+$/.test(queryId)) return queryId;
  return url.pathname.match(/^\/shop_view\/(\d+)(?:\/|$)/)?.[1];
}

function canonicalImwebUrl(url: URL, productId: string): string {
  url.pathname = "/shop_view/";
  url.search = "";
  url.searchParams.set("idx", productId);
  url.hash = "";
  return url.toString();
}

export function parseImwebCategoryHtml(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const urls = new Map<string, string>();

  for (const anchor of html.matchAll(
    /<a\b[^>]*href=["']([^"']*\/shop_view\/(?:\?idx=)?\d+[^"']*)["'][^>]*>/gi,
  )) {
    try {
      const url = new URL(decodeHtml(anchor[1]), base);
      if (url.protocol !== "https:" || url.hostname !== base.hostname) continue;
      const productId = imwebProductId(url);
      if (!productId) continue;
      urls.set(productId, canonicalImwebUrl(url, productId));
    } catch {
      // Ignore non-HTTPS, off-site, and malformed category links.
    }
  }

  return [...urls.values()];
}

export function parseImwebProductHtml(
  html: string,
  fallbackUrl: string,
  options: ImwebSourceOptions,
): PublicShopListing | null {
  const product = findJsonLdProduct(html);
  if (!product) return null;

  const rawTitle = asString(product.name);
  const originalTitle = rawTitle ? stripTags(rawTitle) : undefined;
  const pageTitle = stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const clearlySupply = /사육장|먹이|푸드|용품|쉘터|테라리움|케이지|은신처|온습도|세트/i.test(
    originalTitle ?? "",
  );
  const clearlyOtherSpecies = /레오파드\s*게코|펫\s*테일|가고일\s*게코|리키에너스|데이\s*게코|토케이|카멜레온|거북|스네이크|\b뱀\b/i.test(
    originalTitle ?? "",
  );
  if (
    !originalTitle ||
    !/크레스티드\s*게코/i.test(pageTitle) ||
    clearlySupply ||
    clearlyOtherSpecies
  ) return null;

  let fallback: URL;
  try {
    fallback = new URL(fallbackUrl);
  } catch {
    return null;
  }
  const externalId = imwebProductId(fallback);
  if (
    !externalId ||
    fallback.protocol !== "https:" ||
    fallback.hostname !== options.expectedHostname
  ) return null;
  const originalUrl = canonicalImwebUrl(fallback, externalId);

  const offer = firstOffer(product.offers);
  const currentPrice = parsePrice(offer?.price);
  const soldBadge = /class=["'][^"']*\bprod_icon\b[^"']*\bsold_out\b[^"']*["']/i.test(html);
  const status = soldBadge
    ? "SOLD"
    : availabilityStatus(asString(offer?.availability));

  return {
    externalId,
    originalTitle,
    safeDescription: options.safeDescription,
    originalUrl,
    imageUrl: firstImage(product.image),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status,
    sex: parseSex(originalTitle),
    morphText: originalTitle,
    traitText: originalTitle,
    rawData: {
      source: options.source,
      product_sold_out: status === "SOLD",
    },
  };
}

function classText(html: string, className: string): string | undefined {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<(?:span|div|h[1-6])\\b[^>]*class=["'][^"']*\\b${escapedClass}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:span|div|h[1-6])>`,
      "i",
    ),
  );
  return match ? stripTags(match[1]) : undefined;
}

function zooseyoInfoValue(html: string, label: string): string | undefined {
  for (const block of html.matchAll(
    /<div\b[^>]*class=["'][^"']*\bpet-info-item\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  )) {
    if (classText(block[1], "pet-info-label") !== label) continue;
    return classText(block[1], "pet-info-value");
  }
  return undefined;
}

function sanitizePublicTitle(value: string): string {
  return value
    .replace(/\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[연락처 생략]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[이메일 생략]")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDisplayedWon(value?: string): number | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function safeZooseyoImage(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://www.zooseyo.com");
    if (
      url.protocol === "https:" &&
      url.hostname === "www.zooseyo.com" &&
      url.pathname.startsWith("/z_cate_list_image/")
    ) {
      return url.toString();
    }
  } catch {
    // Ignore malformed or off-site thumbnails.
  }
  return undefined;
}

export function parseZooseyoCategoryHtml(
  html: string,
  baseUrl = "https://www.zooseyo.com",
): ZooseyoProductTarget[] {
  const targets = new Map<string, ZooseyoProductTarget>();

  for (const anchor of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const openTag = `<a ${anchor[1]}>`;
    const classes = htmlAttribute(openTag, "class")?.split(/\s+/) ?? [];
    if (!classes.includes("d-cate-list-card")) continue;

    const breed = classText(anchor[2], "d-cate-list-breed");
    if (breed !== "크레스티드 게코") continue;

    const href = htmlAttribute(openTag, "href");
    if (!href) continue;

    try {
      const url = new URL(href, baseUrl);
      const listingNo = url.searchParams.get("no");
      if (
        url.protocol !== "https:" ||
        url.hostname !== "www.zooseyo.com" ||
        url.pathname !== "/sale/sale_view.php" ||
        !listingNo ||
        !/^\d+$/.test(listingNo)
      ) {
        continue;
      }
      url.hash = "";

      let imageUrl: string | undefined;
      for (const image of anchor[2].matchAll(/<img\b[^>]*>/gi)) {
        const imageClasses = htmlAttribute(image[0], "class")?.split(/\s+/) ?? [];
        if (!imageClasses.includes("d-cate-list-img")) continue;
        imageUrl = safeZooseyoImage(htmlAttribute(image[0], "src"));
        break;
      }

      const sold = /\bd-sold-overlay\b/i.test(anchor[2]) || /입양\s*완료/i.test(anchor[2]);
      targets.set(listingNo, {
        url: url.toString(),
        status: sold ? "SOLD" : "ACTIVE",
        imageUrl,
      });
    } catch {
      // Ignore malformed and off-site category cards.
    }
  }

  return [...targets.values()];
}

export function parseZooseyoProductHtml(
  html: string,
  fallbackUrl: string,
  target?: ZooseyoProductTarget,
): PublicShopListing | null {
  let url: URL;
  try {
    url = new URL(fallbackUrl);
  } catch {
    return null;
  }
  const externalId = url.searchParams.get("no");
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.zooseyo.com" ||
    url.pathname !== "/sale/sale_view.php" ||
    !externalId ||
    !/^\d+$/.test(externalId)
  ) {
    return null;
  }

  const saleType = classText(html, "pet-info-title");
  const species = zooseyoInfoValue(html, "품종");
  if (!saleType?.includes("일반분양") || species !== "크레스티드 게코") return null;

  const titleMatch = html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  const originalTitle = sanitizePublicTitle(stripTags(titleMatch?.[1] ?? ""));
  if (!originalTitle || !isClearlyCrestedAnimalTitle(`${species} ${originalTitle}`)) return null;

  const currentPrice = parseDisplayedWon(classText(html, "footer-price-value"));
  const sexText = zooseyoInfoValue(html, "성별") ?? "";
  url.hash = "";

  return {
    externalId,
    originalTitle,
    safeDescription: "주세요닷컴 공개 일반분양 카테고리·매물 페이지",
    originalUrl: url.toString(),
    imageUrl: safeZooseyoImage(target?.imageUrl),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status: target?.status ?? "UNKNOWN",
    sex: parseSex(sexText),
    morphText: originalTitle,
    traitText: originalTitle,
    rawData: {
      source: "zooseyo-public-html",
      species,
      listing_status: target?.status ?? "UNKNOWN",
    },
  };
}

export function parseKiwoCategoryHtml(html: string, baseUrl = "https://kiwo.kr"): string[] {
  const urls = new Set<string>();
  const cards = html.matchAll(/<div\b[^>]*class=["'][^"']*product-card[^"']*["'][^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi);

  for (const card of cards) {
    const body = card[1];
    if (!stripTags(body).includes("크레스티드 게코")) continue;
    const href = body.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const url = new URL(decodeHtml(href), baseUrl);
    if (url.hostname === "kiwo.kr" && /^\/product\/\d+$/.test(url.pathname)) {
      urls.add(url.toString());
    }
  }

  return [...urls];
}

export function parseNewrunCategoryHtml(html: string): string[] {
  const urls = new Set<string>();

  for (const match of html.matchAll(
    /href=["'](?:https:\/\/newrunreptile\.co\.kr)?\/product\/detail\.html\?([^"']*\bproduct_no=(\d+)[^"']*)["']/gi,
  )) {
    const params = new URLSearchParams(decodeHtml(match[1]));
    const productNo = params.get("product_no") ?? match[2];
    if (!/^\d+$/.test(productNo)) continue;
    urls.add(
      `https://newrunreptile.co.kr/product/detail.html?product_no=${productNo}&cate_no=197&display_group=1`,
    );
  }

  return [...urls];
}

function newrunStatus(html: string): PublicShopListingStatus {
  const soldOutFlag = html.match(/\bis_soldout_icon\s*=\s*["']([TF])["']/i)?.[1];
  if (soldOutFlag === "T") return "SOLD";
  if (soldOutFlag === "F") return "ACTIVE";
  return "UNKNOWN";
}

function metaContent(html: string, property: string): string | undefined {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(`<meta\\b[^>]*property=["']${escapedProperty}["'][^>]*content=["']([^"']+)["']`, "i"),
  ) ?? html.match(
    new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*property=["']${escapedProperty}["']`, "i"),
  );
  return match ? decodeHtml(match[1]).trim() : undefined;
}

export function parseNewrunProductHtml(
  html: string,
  fallbackUrl: string,
): PublicShopListing | null {
  const product = findJsonLdProduct(html);
  if (!product) return null;

  const originalTitle = asString(product.name);
  const clearlyCrestedAnimal = originalTitle && (
    /크레스티드\s*게코/i.test(originalTitle) ||
    /릴리화이트|릴리\s*화이트|릴잔틱|카푸치노|프라푸치노|아잔틱|세이블|달마시안|할리퀸|핀스트라이프|팬텀|소프트\s*스케일|플레임/i.test(originalTitle)
  );
  if (
    !originalTitle || !clearlyCrestedAnimal ||
    /사육장|먹이|푸드|용품|쉘터|테라리움|세트/i.test(originalTitle)
  ) {
    return null;
  }

  const externalId = metaContent(html, "product:productId") ??
    new URL(fallbackUrl).searchParams.get("product_no") ?? undefined;
  if (!externalId || !/^\d+$/.test(externalId)) return null;

  const offer = firstOffer(product.offers);
  const originalUrl = asString(offer?.url) ?? fallbackUrl;
  const currentPrice = parsePrice(offer?.price);
  const status = newrunStatus(html);

  return {
    externalId,
    originalTitle,
    safeDescription: "뉴런렙타일 공개 크레스티드게코 상품 페이지",
    originalUrl,
    imageUrl: firstImage(product.image),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status,
    sex: parseSex(originalTitle),
    morphText: originalTitle,
    traitText: originalTitle,
    rawData: {
      source: "newrunreptile-jsonld",
      product_sold_out: status === "SOLD",
      category_no: 197,
    },
  };
}

export function parseKiwoProductHtml(
  html: string,
  fallbackUrl: string,
): PublicShopListing | null {
  const product = findJsonLdProduct(html);
  if (!product) return null;

  const category = asString(product.category) ?? "";
  if (!category.includes("크레스티드 게코")) return null;

  const originalUrl = asString(product.url) ?? fallbackUrl;
  const externalId = new URL(originalUrl).pathname.split("/").filter(Boolean).at(-1);
  const originalTitle = asString(product.name);
  if (!externalId || !originalTitle) return null;

  const offer = firstOffer(product.offers);
  const currentPrice = parsePrice(offer?.price);
  const availability = asString(offer?.availability);
  const status = availabilityStatus(availability);

  return {
    externalId,
    originalTitle,
    safeDescription: `분류: ${category}`,
    originalUrl,
    imageUrl: firstImage(product.image),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status,
    sex: parseSex(originalTitle),
    morphText: originalTitle,
    traitText: originalTitle,
    rawData: {
      source: "kiwo-jsonld",
      category,
      availability,
    },
  };
}

function watertailStatus(html: string): PublicShopListingStatus {
  if (/품절된 상품입니다/i.test(html)) return "SOLD";

  const productFlag = html.match(/data-productSoldOut=["']([^"']*)["']/i)?.[1];
  if (/soldout/i.test(productFlag ?? "") && !/notsoldout/i.test(productFlag ?? "")) {
    return "SOLD";
  }

  const optionStates = [...html.matchAll(
    /class=["'][^"']*custom-select-option[^"']*["'][^>]*data-soldout=["'](true|false)["']/gi,
  )].map((match) => match[1].toLowerCase());
  if (optionStates.length > 0 && optionStates.every((state) => state === "true")) {
    return "SOLD";
  }

  return /notsoldout/i.test(productFlag ?? "") ? "ACTIVE" : "UNKNOWN";
}

export function parseWatertailProductHtml(
  html: string,
  fallbackUrl: string,
): PublicShopListing | null {
  const product = findJsonLdProduct(html);
  if (!product) return null;

  const originalTitle = asString(product.name);
  if (!originalTitle || !/^\[크레스티드 게코(?:\s[^\]]+)?\]/.test(originalTitle)) {
    return null;
  }

  const offer = firstOffer(product.offers);
  const originalUrl = asString(offer?.url) ?? fallbackUrl;
  const externalId = new URL(originalUrl).pathname.split("/").filter(Boolean).at(-1);
  if (!externalId) return null;

  const currentPrice = parsePrice(offer?.price);
  const status = watertailStatus(html);

  return {
    externalId,
    originalTitle,
    safeDescription: "워터테일 공개 상품 페이지",
    originalUrl,
    imageUrl: firstImage(product.image),
    currentPrice,
    priceType: currentPrice ? "FIXED" : "UNKNOWN",
    status,
    sex: parseSex(originalTitle),
    morphText: originalTitle,
    traitText: originalTitle,
    rawData: {
      source: "watertail-jsonld",
      product_sold_out: status === "SOLD",
    },
  };
}

type MyBreedersSitemapRow = { url: string; lastModified: number };

export function parseMyBreedersSitemap(xml: string): string[] {
  const rows: MyBreedersSitemapRow[] = [];

  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const location = decodeHtml(block[1].match(/<loc>([\s\S]*?)<\/loc>/i)?.[1] ?? "").trim();
    if (!location) continue;

    try {
      const url = new URL(location);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "mybreeders.com" ||
        !/^\/product\/[A-Za-z0-9_-]+$/.test(url.pathname)
      ) {
        continue;
      }

      const lastModifiedText = block[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1];
      const parsedDate = lastModifiedText ? Date.parse(lastModifiedText.trim()) : Number.NaN;
      rows.push({
        url: url.toString(),
        lastModified: Number.isFinite(parsedDate) ? parsedDate : 0,
      });
    } catch {
      // Ignore malformed sitemap locations.
    }
  }

  return rows
    .sort((a, b) => b.lastModified - a.lastModified || a.url.localeCompare(b.url))
    .map((row) => row.url);
}

export function parseMyBreedersHomeProductUrls(html: string): string[] {
  const decodedRsc = html.replaceAll(String.raw`\"`, `"`);
  const productPageMarker = `"initialProductPage":`;
  const markerIndex = decodedRsc.indexOf(productPageMarker);
  if (markerIndex === -1) return [];

  // The homepage may contain unrelated social/contest payloads. Restrict discovery
  // to the public product-page payload before extracting opaque product ids.
  const productPayload = decodedRsc.slice(markerIndex);
  const urls = new Set<string>();

  for (const match of productPayload.matchAll(/"productNo":"([A-Za-z0-9_-]+)"/g)) {
    urls.add(`https://mybreeders.com/product/${match[1]}`);
  }

  return [...urls];
}

function extractMyBreedersProduct(html: string): JsonObject | undefined {
  const marker = String.raw`\"initialProduct\":`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return undefined;

  const start = markerIndex + marker.length;
  if (html[start] !== "{") return undefined;

  let depth = 0;
  let inString = false;

  for (let index = start; index < html.length; index += 1) {
    const character = html[index];

    if (character === '"') {
      let slashes = 0;
      for (let cursor = index - 1; cursor >= start && html[cursor] === "\\"; cursor -= 1) {
        slashes += 1;
      }
      if (slashes === 1) inString = !inString;
    }

    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;

    if (depth === 0) {
      const escapedObject = html.slice(start, index + 1);
      try {
        const decodedObject = JSON.parse(`"${escapedObject}"`);
        return asObject(JSON.parse(decodedObject));
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function myBreedersStatus(value?: string): PublicShopListingStatus {
  if (value === "ACTIVE") return "ACTIVE";
  if (value && /^(COMPLETED|SOLD|CANCELLED|EXPIRED)$/.test(value)) return "SOLD";
  return "UNKNOWN";
}

function myBreedersImage(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const images = value.flatMap((entry) => {
    const image = asObject(entry);
    const imageUrl = asString(image?.imageUrl) ?? asString(image?.thumbnailUrl);
    return imageUrl ? [{ imageUrl, isThumbnail: image?.isThumbnail === true }] : [];
  });
  return images.find((image) => image.isThumbnail)?.imageUrl ?? images[0]?.imageUrl;
}

export function parseMyBreedersProductHtml(
  html: string,
  fallbackUrl: string,
): PublicShopListing | null {
  const product = extractMyBreedersProduct(html);
  if (!product) return null;

  const species = asString(product.species);
  if (species !== "크레스티드 게코") return null;

  const externalId = asString(product.productNo) ??
    new URL(fallbackUrl).pathname.split("/").filter(Boolean).at(-1);
  const originalTitle = asString(product.title);
  if (!externalId || !originalTitle) return null;

  const morphs = Array.isArray(product.morphs)
    ? product.morphs.filter((value): value is string => typeof value === "string")
    : [];
  const trait = asString(product.trait) ?? "";
  const currentPrice = parsePrice(product.price);
  const statusValue = asString(product.status);
  const gender = asString(product.gender) ?? "";
  const weight = asNumber(product.weight);
  const tradeType = asString(product.tradeType) ?? "";
  const saleChannel = asString(product.saleChannel);

  return {
    externalId,
    originalTitle,
    safeDescription: `종: ${species}${morphs.length ? ` · 등록 모프: ${morphs.join(", ")}` : ""}`,
    originalUrl: fallbackUrl,
    imageUrl: myBreedersImage(product.images),
    currentPrice,
    priceType: tradeType === "SALE" && currentPrice ? "FIXED" : "UNKNOWN",
    status: myBreedersStatus(statusValue),
    sex: parseSex(`${gender} ${originalTitle}`),
    weightG: weight && weight > 0 ? weight : undefined,
    morphText: [...morphs, originalTitle].join(" "),
    traitText: [trait, ...morphs, originalTitle].filter(Boolean).join(" "),
    rawData: {
      source: "mybreeders-public-product-html",
      species,
      morphs: morphs.join(", "),
      product_status: statusValue,
      trade_type: tradeType,
      sale_channel: saleChannel,
    },
  };
}
