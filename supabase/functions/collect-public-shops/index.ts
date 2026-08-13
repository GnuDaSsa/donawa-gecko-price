import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";

import {
  matchDictionary,
  matchTraits,
  type DictionaryRow,
} from "../_shared/dictionary.ts";
import {
  parseCafe24CategoryHtml,
  parseCafe24ProductHtml,
  parseImwebCategoryHtml,
  parseImwebProductHtml,
  parseKiwoCategoryHtml,
  parseKiwoProductHtml,
  parseMyBreedersHomeProductUrls,
  parseMyBreedersProductHtml,
  parseMyBreedersSitemap,
  parseNewrunCategoryHtml,
  parseNewrunProductHtml,
  parseWatertailProductHtml,
  parseZooseyoCategoryHtml,
  parseZooseyoProductHtml,
  type Cafe24SourceOptions,
  type PublicShopListing,
  type ZooseyoProductTarget,
} from "./parser.ts";

const USER_AGENT = "MorphPickPrivateMVP/0.4 (permitted public category/product pages)";
const MAX_PRODUCTS_PER_SOURCE = 100;
const MAX_KIWO_PAGES = 6;
const MAX_NEWRUN_PAGES = 6;
const CATEGORY_DELAY_MS = 250;
const PRODUCT_DELAY_MS = 200;
// Supabase's ungenerated Edge client needs a broad database generic here; runtime
// access is still constrained to the explicit table/RPC calls below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = ReturnType<typeof createClient<any>>;

// Sixshop does not publish product URLs in its sitemap. These are official,
// publicly indexed animal-product pages used as a conservative bootstrap list.
// Missing/retired pages are warnings, never a reason to alter other listings.
const WATERTAIL_PRODUCT_URLS = [
  "https://watertail.com/product/male",
  "https://watertail.com/product/mi-120-121-122-123-124-125-127",
  "https://watertail.com/product/amchoo-147-148",
  "https://watertail.com/product/mi-120-121-122-123-124-125-127-128",
  "https://watertail.com/product/male-131-132-133-136-137-139",
  "https://watertail.com/product/cremale-4",
] as const;

const ZOOSEYO_CRESTED_CATEGORY_URL =
  "https://www.zooseyo.com/sale/sale_list.php?cate1=%C6%C4%C3%E6%2F%BE%E7%BC%AD%B7%F9&cate2=%B5%B5%B8%B6%B9%EC%28%B0%D4%C4%DA%29&cate3=%C5%A9%B7%B9%BD%BA%C6%BC%B5%E5%20%B0%D4%C4%DA&tabs=1";

const HELLOGECKO_BASE_URL = "https://hellogcekogood.com";
const HELLOGECKO_CATEGORY_URLS = [
  `${HELLOGECKO_BASE_URL}/24`, // Lilly White
  `${HELLOGECKO_BASE_URL}/25`, // Normal / pattern morphs
  `${HELLOGECKO_BASE_URL}/26`, // Cappuccino
  `${HELLOGECKO_BASE_URL}/27`, // Frappuccino
  `${HELLOGECKO_BASE_URL}/28`, // Axanthic
  `${HELLOGECKO_BASE_URL}/29`, // Other crested-gecko morphs
  `${HELLOGECKO_BASE_URL}/39`, // Sold history
] as const;

type Cafe24SourceDefinition = {
  key:
    | "jurassic"
    | "newrunnatural"
    | "thesafari"
    | "thereptile"
    | "thebreeders"
    | "bestfarm"
    | "newrunwild"
    | "frienzoo"
    | "myage"
    | "iceage"
    | "themonster"
    | "thezoo"
    | "thedragon"
    | "jules"
    | "thezoosongpa"
    | "insectharmony"
    | "tarancenter"
    | "reptilestore";
  platformName: string;
  baseUrl: string;
  categoryUrls: string[];
  parserOptions: Cafe24SourceOptions;
};

const CAFE24_SOURCES: Cafe24SourceDefinition[] = [
  {
    key: "jurassic",
    platformName: "뉴런쥬라기",
    baseUrl: "https://thejurassic.co.kr",
    categoryUrls: [
      "https://thejurassic.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/132/",
    ],
    parserOptions: {
      expectedHostname: "thejurassic.co.kr",
      source: "thejurassic-cafe24-jsonld",
      safeDescription: "뉴런쥬라기 공개 크레스티드게코 상품 페이지",
      categoryNo: 132,
    },
  },
  {
    key: "newrunnatural",
    platformName: "뉴런내추럴",
    baseUrl: "https://newrunnatural.co.kr",
    categoryUrls: Array.from(
      { length: 6 },
      (_, index) =>
        `https://newrunnatural.co.kr/category/%EB%8F%84%EB%A7%88%EB%B1%80/48/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "newrunnatural.co.kr",
      source: "newrunnatural-cafe24-jsonld",
      safeDescription: "뉴런내추럴 공개 도마뱀 카테고리·상품 페이지",
      categoryNo: 48,
    },
  },
  {
    key: "thesafari",
    platformName: "더사파리",
    baseUrl: "https://thesafari.kr",
    categoryUrls: Array.from(
      { length: 4 },
      (_, index) =>
        `https://thesafari.kr/product/list.html?cate_no=160&page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "thesafari.kr",
      source: "thesafari-cafe24-jsonld",
      safeDescription: "더사파리 공개 게코도마뱀 카테고리·상품 페이지",
      categoryNo: 160,
    },
  },
  {
    key: "thereptile",
    platformName: "뉴런렙박스",
    baseUrl: "https://thereptile.co.kr",
    categoryUrls: [
      "https://thereptile.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/143/",
    ],
    parserOptions: {
      expectedHostname: "thereptile.co.kr",
      source: "thereptile-cafe24-jsonld",
      safeDescription: "뉴런렙박스 공개 크레스티드게코 상품 페이지",
      categoryNo: 143,
    },
  },
  {
    key: "thebreeders",
    platformName: "더브리더스",
    baseUrl: "https://thebreeders.cafe24.com",
    categoryUrls: Array.from(
      { length: 6 },
      (_, index) =>
        `https://thebreeders.cafe24.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/72/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "thebreeders.cafe24.com",
      source: "thebreeders-cafe24-jsonld",
      safeDescription: "더브리더스 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 72,
    },
  },
  {
    key: "bestfarm",
    platformName: "더베스트팜",
    baseUrl: "https://www.thebestfarm.kr",
    categoryUrls: Array.from(
      { length: 3 },
      (_, index) =>
        `https://www.thebestfarm.kr/product/list.html?cate_no=25&page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "www.thebestfarm.kr",
      source: "thebestfarm-cafe24-jsonld",
      safeDescription: "더베스트팜 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 25,
    },
  },
  {
    key: "newrunwild",
    platformName: "뉴런와일드",
    baseUrl: "https://newrunwild.co.kr",
    categoryUrls: Array.from(
      { length: 3 },
      (_, index) =>
        `https://newrunwild.co.kr/category/%EA%B2%8C%EC%BD%94%EB%B6%99%EC%9D%B4%EB%A5%98/80/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "newrunwild.co.kr",
      source: "newrunwild-cafe24-jsonld",
      safeDescription: "뉴런와일드 공개 게코·붙이류 카테고리·상품 페이지",
      categoryNo: 80,
    },
  },
  {
    key: "frienzoo",
    platformName: "프랜쥬",
    baseUrl: "https://frienzoo.com",
    categoryUrls: Array.from(
      { length: 4 },
      (_, index) =>
        `https://frienzoo.com/category/%ED%8C%8C%EC%B6%A9%EB%A5%98/256/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "frienzoo.com",
      source: "frienzoo-cafe24-jsonld",
      safeDescription: "프랜쥬 공개 파충류 카테고리·상품 페이지",
      categoryNo: 256,
    },
  },
  {
    key: "myage",
    platformName: "도심속도마뱀",
    baseUrl: "https://myage.co.kr",
    categoryUrls: Array.from(
      { length: 9 },
      (_, index) =>
        `https://myage.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/130/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "myage.co.kr",
      source: "myage-cafe24-jsonld",
      safeDescription: "도심속도마뱀 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 130,
    },
  },
  {
    key: "iceage",
    platformName: "빙하기",
    baseUrl: "https://iceagereptile.com",
    categoryUrls: Array.from(
      { length: 3 },
      (_, index) =>
        `https://iceagereptile.com/category/%EA%B2%8C%EC%BD%94-%E2%94%82-Gecko/97/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "iceagereptile.com",
      source: "iceage-cafe24-jsonld",
      safeDescription: "빙하기 공개 게코 카테고리·상품 페이지",
      categoryNo: 97,
    },
  },
  {
    key: "themonster",
    platformName: "더몬스터",
    baseUrl: "https://themonster.co.kr",
    categoryUrls: Array.from(
      { length: 2 },
      (_, index) =>
        `https://themonster.co.kr/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/109/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "themonster.co.kr",
      source: "themonster-cafe24-jsonld",
      safeDescription: "더몬스터 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 109,
    },
  },
  {
    key: "thezoo",
    platformName: "더쥬",
    baseUrl: "https://xn--9m1b023b.com",
    categoryUrls: Array.from(
      { length: 6 },
      (_, index) =>
        `https://xn--9m1b023b.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/90/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "xn--9m1b023b.com",
      source: "thezoo-cafe24-jsonld",
      safeDescription: "더쥬 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 90,
    },
  },
  {
    key: "thedragon",
    platformName: "더드래곤",
    baseUrl: "https://thedragon1.cafe24.com",
    categoryUrls: Array.from(
      { length: 2 },
      (_, index) =>
        `https://thedragon1.cafe24.com/category/%EA%B2%8C%EC%BD%94%EB%A5%98/67/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "thedragon1.cafe24.com",
      source: "thedragon-cafe24-jsonld",
      safeDescription: "더드래곤 공개 게코 카테고리·상품 페이지",
      categoryNo: 67,
    },
  },
  {
    key: "jules",
    platformName: "줄스",
    baseUrl: "https://ehddud3.cafe24.com",
    categoryUrls: Array.from(
      { length: 4 },
      (_, index) =>
        `https://ehddud3.cafe24.com/product/list.html?cate_no=31&page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "ehddud3.cafe24.com",
      source: "jules-cafe24-jsonld",
      safeDescription: "줄스 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 31,
    },
  },
  {
    key: "thezoosongpa",
    platformName: "더쥬 송파점",
    baseUrl: "https://gjwnddnjs123.cafe24.com",
    categoryUrls: Array.from(
      { length: 2 },
      (_, index) =>
        `https://gjwnddnjs123.cafe24.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C-%EA%B2%8C%EC%BD%94/59/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "gjwnddnjs123.cafe24.com",
      source: "thezoosongpa-cafe24-jsonld",
      safeDescription: "더쥬 송파점 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 59,
    },
  },
  {
    key: "insectharmony",
    platformName: "곤충하모니",
    baseUrl: "https://xn--699at5i1sh8pu9yi.com",
    categoryUrls: Array.from(
      { length: 6 },
      (_, index) =>
        `https://xn--699at5i1sh8pu9yi.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/162/?page=${index + 1}`,
    ),
    parserOptions: {
      expectedHostname: "xn--699at5i1sh8pu9yi.com",
      source: "insectharmony-cafe24-jsonld",
      safeDescription: "곤충하모니 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 162,
    },
  },
  {
    key: "tarancenter",
    platformName: "타란센터",
    baseUrl: "https://tarancenter.com",
    categoryUrls: [
      "https://tarancenter.com/category/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94/85/",
    ],
    parserOptions: {
      expectedHostname: "tarancenter.com",
      source: "tarancenter-cafe24-jsonld",
      safeDescription: "타란센터 공개 크레스티드게코 카테고리·상품 페이지",
      categoryNo: 85,
    },
  },
  {
    key: "reptilestore",
    platformName: "렙타일스토어",
    baseUrl: "https://www.reptilestore.co.kr",
    categoryUrls: [
      "https://www.reptilestore.co.kr/product/list.html?cate_no=98",
    ],
    parserOptions: {
      expectedHostname: "www.reptilestore.co.kr",
      source: "reptilestore-cafe24-jsonld",
      safeDescription: "렙타일스토어 공개 도마뱀 카테고리·상품 페이지",
      categoryNo: 98,
    },
  },
];

type PlatformRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type SourceResult = {
  platform: string;
  ok: boolean;
  runId?: number;
  pagesChecked: number;
  stored: number;
  classified: number;
  activeComparable: number;
  sold: number;
  warnings: number;
  error?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]
    ?.toLowerCase();
  const bytes = await response.arrayBuffer();
  if (charset === "euc-kr" || charset === "ks_c_5601-1987" || charset === "cp949") {
    return new TextDecoder("euc-kr").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

async function discoverCafe24Urls(
  source: Cafe24SourceDefinition,
  limit: number,
): Promise<string[]> {
  const urls = new Map<string, string>();

  for (const categoryUrl of source.categoryUrls) {
    const html = await fetchText(categoryUrl);
    for (const productUrl of parseCafe24CategoryHtml(html, source.baseUrl)) {
      const externalId = productUrl.match(/(?:product_no=|\/)(\d+)(?:\/|&|$)/)?.[1] ?? productUrl;
      urls.set(externalId, productUrl);
      if (urls.size >= limit) break;
    }
    if (urls.size >= limit) break;
    await new Promise((resolve) => setTimeout(resolve, CATEGORY_DELAY_MS));
  }

  return [...urls.values()].slice(0, limit);
}

async function discoverHellogeckoUrls(limit: number): Promise<string[]> {
  const urls = new Map<string, string>();

  for (const categoryUrl of HELLOGECKO_CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    for (const productUrl of parseImwebCategoryHtml(html, HELLOGECKO_BASE_URL)) {
      const externalId = new URL(productUrl).searchParams.get("idx") ?? productUrl;
      urls.set(externalId, productUrl);
      if (urls.size >= limit) break;
    }
    if (urls.size >= limit) break;
    await new Promise((resolve) => setTimeout(resolve, CATEGORY_DELAY_MS));
  }

  return [...urls.values()].slice(0, limit);
}

async function discoverZooseyoTargets(limit: number): Promise<ZooseyoProductTarget[]> {
  const html = await fetchText(ZOOSEYO_CRESTED_CATEGORY_URL);
  return parseZooseyoCategoryHtml(html).slice(0, limit);
}

async function discoverKiwoUrls(pageCount: number, limit: number): Promise<string[]> {
  const urls = new Set<string>();
  for (let page = 0; page < pageCount && urls.size < limit; page += 1) {
    const url = new URL("https://kiwo.kr/products");
    url.searchParams.set("category", "게코");
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", "20");
    const html = await fetchText(url.toString());
    for (const productUrl of parseKiwoCategoryHtml(html)) {
      urls.add(productUrl);
      if (urls.size >= limit) break;
    }
    await new Promise((resolve) => setTimeout(resolve, CATEGORY_DELAY_MS));
  }
  return [...urls];
}

async function discoverMyBreedersUrls(
  supabase: SupabaseAdmin,
  platformId: string,
  limit: number,
  offset: number,
): Promise<string[]> {
  const sitemap = await fetchText("https://mybreeders.com/sitemap.xml");
  const sitemapUrls = parseMyBreedersSitemap(sitemap);
  if (sitemapUrls.length > 0) return sitemapUrls.slice(offset, offset + limit);

  const homepage = await fetchText("https://mybreeders.com/");
  const urls = new Set(
    parseMyBreedersHomeProductUrls(homepage).slice(offset, offset + limit),
  );
  const { data: knownListings, error } = await supabase
    .from("listings")
    .select("original_url")
    .eq("platform_id", platformId)
    .order("last_checked_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  for (const listing of knownListings ?? []) {
    const validated = validateMyBreedersUrls([listing.original_url], 1);
    if (validated[0]) urls.add(validated[0]);
    if (urls.size >= limit) break;
  }

  return [...urls].slice(0, limit);
}

async function discoverNewrunUrls(pageCount: number, limit: number): Promise<string[]> {
  const urls = new Set<string>();

  for (let page = 1; page <= pageCount && urls.size < limit; page += 1) {
    const url = new URL("https://newrunreptile.co.kr/product/list.html");
    url.searchParams.set("cate_no", "197");
    url.searchParams.set("page", String(page));
    const html = await fetchText(url.toString());
    const pageUrls = parseNewrunCategoryHtml(html);
    if (pageUrls.length === 0) break;

    for (const productUrl of pageUrls) {
      urls.add(productUrl);
      if (urls.size >= limit) break;
    }
    await new Promise((resolve) => setTimeout(resolve, CATEGORY_DELAY_MS));
  }

  return [...urls];
}

function validateMyBreedersUrls(values: unknown, limit: number): string[] {
  if (!Array.isArray(values)) return [];
  const urls = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      if (
        url.protocol === "https:" &&
        url.hostname === "mybreeders.com" &&
        /^\/product\/[A-Za-z0-9_-]+$/.test(url.pathname)
      ) {
        urls.add(url.toString());
      }
    } catch {
      // Ignore any caller-provided value outside the exact public product host/path.
    }
    if (urls.size >= limit) break;
  }

  return [...urls];
}

async function replaceTraits(
  supabase: SupabaseAdmin,
  listingId: string,
  listing: PublicShopListing,
  traits: DictionaryRow[],
) {
  const { error: deleteError } = await supabase
    .from("listing_traits")
    .delete()
    .eq("listing_id", listingId);
  if (deleteError) throw deleteError;

  const matchedTraits = matchTraits(listing.traitText, traits);
  if (matchedTraits.length === 0) return;

  const { error: insertError } = await supabase
    .from("listing_traits")
    .insert(
      matchedTraits.map((trait) => ({
        listing_id: listingId,
        trait_id: trait.id,
        source_text: listing.traitText.slice(0, 240),
      })),
    );
  if (insertError) throw insertError;
}

async function collectSource(
  supabase: SupabaseAdmin,
  platform: PlatformRow,
  urls: string[],
  parser: (html: string, url: string) => PublicShopListing | null,
  morphs: DictionaryRow[],
  traits: DictionaryRow[],
): Promise<SourceResult> {
  const { data: run, error: runError } = await supabase
    .from("collector_runs")
    .insert({ platform_id: platform.id })
    .select("id")
    .single();

  if (runError) {
    return {
      platform: platform.name,
      ok: false,
      pagesChecked: 0,
      stored: 0,
      classified: 0,
      activeComparable: 0,
      sold: 0,
      warnings: 1,
      error: runError.message,
    };
  }

  let stored = 0;
  let classified = 0;
  let activeComparable = 0;
  let sold = 0;
  const warnings: string[] = [];

  try {
    for (const url of urls) {
      try {
        const html = await fetchText(url);
        const listing = parser(html, url);
        if (!listing) {
          warnings.push(`not a current crested-gecko animal page: ${url}`);
          continue;
        }

        const morph = matchDictionary(listing.morphText, morphs);
        const { data: listingId, error: observationError } = await supabase.rpc(
          "apply_listing_observation",
          {
            p_platform_id: platform.id,
            p_external_id: listing.externalId,
            p_morph_id: morph?.id ?? null,
            p_original_title: listing.originalTitle,
            p_original_description: listing.safeDescription || null,
            p_original_url: listing.originalUrl,
            p_image_url: listing.imageUrl ?? null,
            p_current_price: listing.currentPrice ?? null,
            p_price_type: listing.priceType,
            p_sex: listing.sex,
            p_weight_g: listing.weightG ?? null,
            p_bundle_count: null,
            p_status: listing.status,
            p_classification_source: "AUTO_KEYWORD",
            p_raw_data: listing.rawData,
          },
        );
        if (observationError) throw observationError;

        await replaceTraits(supabase, listingId as string, listing, traits);
        stored += 1;
        if (morph) classified += 1;
        if (
          morph &&
          listing.status === "ACTIVE" &&
          listing.priceType === "FIXED" &&
          listing.currentPrice
        ) {
          activeComparable += 1;
        }
        if (listing.status === "SOLD") sold += 1;
      } catch (error) {
        warnings.push(error instanceof Error ? error.message.slice(0, 180) : "page error");
      }

      await new Promise((resolve) => setTimeout(resolve, PRODUCT_DELAY_MS));
    }

    if (activeComparable > 0 && !platform.is_active) {
      const { error: activateError } = await supabase
        .from("platforms")
        .update({ is_active: true })
        .eq("id", platform.id);
      if (activateError) warnings.push(`platform activation: ${activateError.message}`);
    }

    await supabase
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "SUCCESS",
        listings_seen: stored,
        error_message: warnings.length ? warnings.slice(0, 8).join(" | ") : null,
      })
      .eq("id", run.id);

    return {
      platform: platform.name,
      ok: true,
      runId: run.id,
      pagesChecked: urls.length,
      stored,
      classified,
      activeComparable,
      sold,
      warnings: warnings.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collector failed";
    await supabase
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "FAILED",
        error_message: message.slice(0, 500),
      })
      .eq("id", run.id);

    return {
      platform: platform.name,
      ok: false,
      runId: run.id,
      pagesChecked: urls.length,
      stored,
      classified,
      activeComparable,
      sold,
      warnings: warnings.length,
      error: message,
    };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "POST required" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Function environment is incomplete" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suppliedSecret = request.headers.get("x-collector-secret") ?? "";
  const { data: setting, error: settingError } = await supabase
    .from("collector_settings")
    .select("value")
    .eq("key", "auth_sha256")
    .maybeSingle();

  if (settingError || !setting?.value) {
    return jsonResponse({ ok: false, error: "Collector authentication is not configured" }, 503);
  }

  const suppliedHash = await sha256(suppliedSecret);
  if (!suppliedSecret || !constantTimeEqual(suppliedHash, setting.value)) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => ({})) as {
    configureScheduler?: boolean;
    limit?: number;
    kiwoPages?: number;
    newrunPages?: number;
    myBreedersOffset?: number;
    myBreedersUrls?: string[];
    sites?: string[];
  };

  if (body.configureScheduler === true) {
    const { error } = await supabase.rpc("configure_collector_scheduler", {
      p_collector_secret: suppliedSecret,
      p_project_url: supabaseUrl,
    });
    if (error) {
      return jsonResponse({ ok: false, error: "Scheduler configuration failed" }, 500);
    }
    return jsonResponse({ ok: true, schedulerConfigured: true });
  }

  const requestedLimit = Number.isFinite(body.limit) ? Math.floor(body.limit!) : 48;
  const limit = Math.max(1, Math.min(requestedLimit, MAX_PRODUCTS_PER_SOURCE));
  const requestedPages = Number.isFinite(body.kiwoPages)
    ? Math.floor(body.kiwoPages!)
    : Math.ceil(limit / 12);
  const kiwoPages = Math.max(1, Math.min(requestedPages, MAX_KIWO_PAGES));
  const requestedNewrunPages = Number.isFinite(body.newrunPages)
    ? Math.floor(body.newrunPages!)
    : Math.ceil(limit / 12);
  const newrunPages = Math.max(1, Math.min(requestedNewrunPages, MAX_NEWRUN_PAGES));
  const requestedOffset = Number.isFinite(body.myBreedersOffset)
    ? Math.floor(body.myBreedersOffset!)
    : 0;
  const myBreedersOffset = Math.max(0, requestedOffset);
  const knownSites = [
    "kiwo",
    "watertail",
    "mybreeders",
    "newrun",
    "jurassic",
    "newrunnatural",
    "thesafari",
    "thereptile",
    "thebreeders",
    "bestfarm",
    "newrunwild",
    "frienzoo",
    "myage",
    "iceage",
    "themonster",
    "thezoo",
    "thedragon",
    "jules",
    "thezoosongpa",
    "insectharmony",
    "tarancenter",
    "reptilestore",
    "hellogecko",
    "zooseyo",
  ] as const;
  const requestedSites = new Set(
    Array.isArray(body.sites) && body.sites.length > 0
      ? body.sites.filter((site): site is typeof knownSites[number] =>
          knownSites.includes(site as typeof knownSites[number]))
      : knownSites,
  );

  const [
    { data: platformRows, error: platformError },
    { data: morphRows, error: morphError },
    { data: traitRows, error: traitError },
  ] = await Promise.all([
    supabase
      .from("platforms")
      .select("id, name, is_active")
      .in("name", [
        "키워",
        "워터테일",
        "마이브리더즈",
        "뉴런렙타일",
        "뉴런쥬라기",
        "뉴런내추럴",
        "더사파리",
        "뉴런렙박스",
        "더브리더스",
        "더베스트팜",
        "뉴런와일드",
        "프랜쥬",
        "도심속도마뱀",
        "빙하기",
        "더몬스터",
        "더쥬",
        "더드래곤",
        "줄스",
        "더쥬 송파점",
        "곤충하모니",
        "타란센터",
        "렙타일스토어",
        "헬로게코",
        "주세요닷컴",
      ]),
    supabase.from("morphs").select("id, slug, aliases, name_ko"),
    supabase.from("traits").select("id, slug, aliases, name_ko"),
  ]);

  if (platformError) return jsonResponse({ ok: false, error: platformError.message }, 500);
  if (morphError) return jsonResponse({ ok: false, error: morphError.message }, 500);
  if (traitError) return jsonResponse({ ok: false, error: traitError.message }, 500);

  const platforms = new Map(
    (platformRows as PlatformRow[]).map((platform) => [platform.name, platform]),
  );
  const kiwo = platforms.get("키워");
  const watertail = platforms.get("워터테일");
  const myBreeders = platforms.get("마이브리더즈");
  const newrun = platforms.get("뉴런렙타일");
  const hellogecko = platforms.get("헬로게코");
  const zooseyo = platforms.get("주세요닷컴");
  const missingCafe24Platform = CAFE24_SOURCES.some((source) =>
    requestedSites.has(source.key) && !platforms.get(source.platformName)
  );
  if (
    (requestedSites.has("kiwo") && !kiwo) ||
    (requestedSites.has("watertail") && !watertail) ||
    (requestedSites.has("mybreeders") && !myBreeders) ||
    (requestedSites.has("newrun") && !newrun) ||
    (requestedSites.has("hellogecko") && !hellogecko) ||
    (requestedSites.has("zooseyo") && !zooseyo) ||
    missingCafe24Platform
  ) {
    return jsonResponse({ ok: false, error: "Public-shop platform rows are missing" }, 500);
  }

  const morphs = morphRows as DictionaryRow[];
  const traits = traitRows as DictionaryRow[];
  const results: SourceResult[] = [];

  if (requestedSites.has("kiwo") && kiwo) {
    try {
      const kiwoUrls = await discoverKiwoUrls(kiwoPages, limit);
      results.push(
        await collectSource(
          supabase,
          kiwo,
          kiwoUrls,
          parseKiwoProductHtml,
          morphs,
          traits,
        ),
      );
    } catch (error) {
      results.push({
        platform: "키워",
        ok: false,
        pagesChecked: 0,
        stored: 0,
        classified: 0,
        activeComparable: 0,
        sold: 0,
        warnings: 1,
        error: error instanceof Error ? error.message : "Kiwo discovery failed",
      });
    }
  }

  if (requestedSites.has("watertail") && watertail) results.push(
    await collectSource(
      supabase,
      watertail,
      [...WATERTAIL_PRODUCT_URLS],
      parseWatertailProductHtml,
      morphs,
      traits,
    ),
  );

  if (requestedSites.has("mybreeders") && myBreeders) {
    try {
      const suppliedUrls = validateMyBreedersUrls(body.myBreedersUrls, limit);
      const myBreedersUrls = suppliedUrls.length > 0
        ? suppliedUrls
        : await discoverMyBreedersUrls(
            supabase,
            myBreeders.id,
            limit,
            myBreedersOffset,
          );
      results.push(
        await collectSource(
          supabase,
          myBreeders,
          myBreedersUrls,
          parseMyBreedersProductHtml,
          morphs,
          traits,
        ),
      );
    } catch (error) {
      results.push({
        platform: "마이브리더즈",
        ok: false,
        pagesChecked: 0,
        stored: 0,
        classified: 0,
        activeComparable: 0,
        sold: 0,
        warnings: 1,
        error: error instanceof Error ? error.message : "MyBreeders discovery failed",
      });
    }
  }

  if (requestedSites.has("newrun") && newrun) {
    try {
      const newrunUrls = await discoverNewrunUrls(newrunPages, limit);
      results.push(
        await collectSource(
          supabase,
          newrun,
          newrunUrls,
          parseNewrunProductHtml,
          morphs,
          traits,
        ),
      );
    } catch (error) {
      results.push({
        platform: "뉴런렙타일",
        ok: false,
        pagesChecked: 0,
        stored: 0,
        classified: 0,
        activeComparable: 0,
        sold: 0,
        warnings: 1,
        error: error instanceof Error ? error.message : "Newrun discovery failed",
      });
    }
  }

  for (const source of CAFE24_SOURCES) {
    if (!requestedSites.has(source.key)) continue;
    const platform = platforms.get(source.platformName);
    if (!platform) continue;

    try {
      const urls = await discoverCafe24Urls(source, limit);
      results.push(
        await collectSource(
          supabase,
          platform,
          urls,
          (html, url) => parseCafe24ProductHtml(html, url, source.parserOptions),
          morphs,
          traits,
        ),
      );
    } catch (error) {
      results.push({
        platform: source.platformName,
        ok: false,
        pagesChecked: 0,
        stored: 0,
        classified: 0,
        activeComparable: 0,
        sold: 0,
        warnings: 1,
        error: error instanceof Error ? error.message : `${source.platformName} discovery failed`,
      });
    }
  }

  if (requestedSites.has("hellogecko") && hellogecko) {
    try {
      const urls = await discoverHellogeckoUrls(limit);
      results.push(
        await collectSource(
          supabase,
          hellogecko,
          urls,
          (html, url) => parseImwebProductHtml(html, url, {
            expectedHostname: "hellogcekogood.com",
            source: "hellogecko-imweb-jsonld",
            safeDescription: "헬로게코 공개 크레스티드게코 카테고리·상품 페이지",
          }),
          morphs,
          traits,
        ),
      );
    } catch (error) {
      results.push({
        platform: "헬로게코",
        ok: false,
        pagesChecked: 0,
        stored: 0,
        classified: 0,
        activeComparable: 0,
        sold: 0,
        warnings: 1,
        error: error instanceof Error ? error.message : "헬로게코 discovery failed",
      });
    }
  }

  if (requestedSites.has("zooseyo") && zooseyo) {
    try {
      const targets = await discoverZooseyoTargets(limit);
      const targetByUrl = new Map(targets.map((target) => [target.url, target]));
      results.push(
        await collectSource(
          supabase,
          zooseyo,
          targets.map((target) => target.url),
          (html, url) => parseZooseyoProductHtml(html, url, targetByUrl.get(url)),
          morphs,
          traits,
        ),
      );
    } catch (error) {
      results.push({
        platform: "주세요닷컴",
        ok: false,
        pagesChecked: 0,
        stored: 0,
        classified: 0,
        activeComparable: 0,
        sold: 0,
        warnings: 1,
        error: error instanceof Error ? error.message : "주세요닷컴 discovery failed",
      });
    }
  }

  const successful = results.filter((result) => result.ok).length;
  return jsonResponse(
    {
      ok: successful > 0,
      sourcesSucceeded: successful,
      sourcesFailed: results.length - successful,
      results,
    },
    successful > 0 ? 200 : 502,
  );
});
