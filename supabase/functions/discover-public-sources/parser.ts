export type RobotsDecision = {
  status: "ALLOWED" | "BLOCKED";
  matchedRule?: string;
};

export type PublicShopPageEvidence = {
  hasCrestedKeyword: boolean;
  hasFixedPrice: boolean;
  hasProductSchema: boolean;
  hasSaleSignal: boolean;
  platformHint: "CAFE24" | "IMWEB" | "OTHER";
};

export type SearchCandidate = {
  hostname: string;
  exampleUrl: string;
  title: string;
  discoveryQuery: string;
  rank: number;
};

export type PublicListingStatus = "ACTIVE" | "SOLD" | "UNKNOWN";

const BLOCKED_HOSTS = new Set([
  "naver.com",
  "blog.naver.com",
  "m.blog.naver.com",
  "cafe.naver.com",
  "smartstore.naver.com",
  "shopping.naver.com",
  "map.naver.com",
  "daum.net",
  "cafe.daum.net",
  "kakao.com",
  "instagram.com",
  "facebook.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "band.us",
  "daangn.com",
  "bunjang.co.kr",
  "joongna.com",
  "reddit.com",
  "quora.com",
  "namu.wiki",
  "wikipedia.org",
]);

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function sanitizeSearchTitle(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[연락처 생략]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[이메일 생략]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function canonicalHostname(value: string): string {
  const hostname = value.toLowerCase().replace(/\.$/, "");
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function isBlockedHost(hostname: string): boolean {
  const canonical = canonicalHostname(hostname);
  if (
    canonical === "localhost" ||
    canonical.endsWith(".localhost") ||
    canonical.endsWith(".local") ||
    canonical.endsWith(".internal") ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(canonical) ||
    canonical.includes(":")
  ) return true;
  for (const blocked of BLOCKED_HOSTS) {
    if (canonical === blocked || canonical.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export function normalizeSearchCandidate(
  link: string,
  title: string,
  discoveryQuery: string,
  rank: number,
  knownHosts: ReadonlySet<string> = new Set(),
): SearchCandidate | null {
  try {
    const url = new URL(decodeHtml(link));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) return null;

    const hostname = canonicalHostname(url.hostname);
    if (!hostname.includes(".") || isBlockedHost(hostname) || knownHosts.has(hostname)) {
      return null;
    }
    if (/\.(?:jpe?g|png|gif|webp|svg|pdf|zip)$/i.test(url.pathname)) return null;

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key);
    }

    return {
      hostname,
      exampleUrl: url.toString(),
      title: sanitizeSearchTitle(title),
      discoveryQuery: discoveryQuery.slice(0, 120),
      rank: Math.max(1, Math.floor(rank)),
    };
  } catch {
    return null;
  }
}

function robotsPattern(rule: string): RegExp | null {
  if (!rule) return null;
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  const escaped = body
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

export function evaluateRobotsTxt(
  robotsText: string,
  targetUrl: string,
  userAgent = "DonawaSourceDiscovery",
): RobotsDecision {
  const groups: Array<{
    agents: string[];
    rules: Array<{ type: "allow" | "disallow"; value: string }>;
  }> = [];
  let current: typeof groups[number] | undefined;
  let hasRules = false;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || hasRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if ((field === "allow" || field === "disallow") && current) {
      current.rules.push({ type: field, value });
      hasRules = true;
    }
  }

  const agent = userAgent.toLowerCase();
  const exactGroups = groups.filter((group) =>
    group.agents.some((entry) => entry !== "*" && agent.includes(entry))
  );
  const selected = exactGroups.length > 0
    ? exactGroups
    : groups.filter((group) => group.agents.includes("*"));
  if (selected.length === 0) return { status: "ALLOWED" };

  const url = new URL(targetUrl);
  const target = `${url.pathname}${url.search}`;
  const matches: Array<{ type: "allow" | "disallow"; value: string }> = [];
  for (const group of selected) {
    for (const rule of group.rules) {
      const pattern = robotsPattern(rule.value);
      if (pattern?.test(target)) matches.push(rule);
    }
  }
  if (matches.length === 0) return { status: "ALLOWED" };

  matches.sort((left, right) =>
    right.value.length - left.value.length ||
    (left.type === "allow" ? -1 : 1)
  );
  const winner = matches[0];
  return {
    status: winner.type === "allow" ? "ALLOWED" : "BLOCKED",
    matchedRule: `${winner.type}:${winner.value}`,
  };
}

export function analyzePublicShopPage(html: string): PublicShopPageEvidence {
  const hasCrestedKeyword = /크레스티드\s*게코|크레\s*분양|crested\s*gecko/i.test(html);
  const hasFixedPrice = extractFixedKrwPrices(html).length > 0;
  const hasProductSchema = /application\/ld\+json/i.test(html) &&
    /["']@type["']\s*:\s*["']Product["']/i.test(html);
  const hasSaleSignal = inferPublicListingStatus(html) !== "UNKNOWN";

  let platformHint: PublicShopPageEvidence["platformHint"] = "OTHER";
  if (/cafe24|EC_FRONT|product_no/i.test(html)) platformHint = "CAFE24";
  else if (/imweb|SITE_SHOP_DETAIL|\/shop_view\//i.test(html)) platformHint = "IMWEB";

  return {
    hasCrestedKeyword,
    hasFixedPrice,
    hasProductSchema,
    hasSaleSignal,
    platformHint,
  };
}

function addPrice(prices: Set<number>, value: number) {
  const rounded = Math.round(value);
  if (Number.isFinite(rounded) && rounded >= 1_000 && rounded <= 1_000_000_000) {
    prices.add(rounded);
  }
}

/**
 * Extracts only fixed KRW amounts that are visible in the document or encoded
 * as common structured product prices. The caller must still prove that the
 * amount belongs to the candidate animal rather than shipping or another item.
 */
export function extractFixedKrwPrices(html: string): number[] {
  const prices = new Set<number>();
  const decoded = decodeHtml(html);

  for (const match of decoded.matchAll(/(?:₩|KRW\s*)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,10})\s*원/gi)) {
    addPrice(prices, Number(match[1].replaceAll(",", "")));
  }
  for (const match of decoded.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*만\s*원/gi)) {
    addPrice(prices, Number(match[1]) * 10_000);
  }
  for (const match of decoded.matchAll(
    /["'](?:price|lowPrice|highPrice|salePrice|sellingPrice)["']\s*:\s*["']?([0-9]{4,10})/gi,
  )) {
    addPrice(prices, Number(match[1]));
  }

  return [...prices].sort((left, right) => left - right);
}

/**
 * Conservative sale-state inference. Conflicting signals deliberately resolve
 * to UNKNOWN because storefront bundles often contain both values in scripts.
 */
export function inferPublicListingStatus(html: string): PublicListingStatus {
  const decoded = decodeHtml(html);
  const hasSold = /SOLD\s*OUT|SOLDOUT|OutOfStock|품절|판매\s*완료|분양\s*완료|거래\s*완료/i.test(decoded);
  const hasActive = /InStock|판매\s*중|분양\s*중|구매\s*가능/i.test(decoded);
  if (hasSold === hasActive) return "UNKNOWN";
  return hasSold ? "SOLD" : "ACTIVE";
}

export function findPublicProductCandidateUrl(
  html: string,
  baseUrl: string,
): string | null {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(decodeHtml(match[1]), base);
      if (url.protocol !== "https:" || url.hostname !== base.hostname) continue;
      const isCafe24Product = /^\/product\/(?:[^/]+\/)?\d+(?:\/|$)/i.test(url.pathname) ||
        (url.pathname === "/product/detail.html" && /^\d+$/.test(url.searchParams.get("product_no") ?? ""));
      const isImwebProduct = /^\/shop_view\/?$/i.test(url.pathname) &&
        /^\d+$/.test(url.searchParams.get("idx") ?? "");
      if (!isCafe24Product && !isImwebProduct) continue;

      url.hash = "";
      return url.toString();
    } catch {
      // Ignore malformed and non-public product links.
    }
  }
  return null;
}

export function isEligibleForReview(evidence: PublicShopPageEvidence): boolean {
  return evidence.hasCrestedKeyword &&
    evidence.hasFixedPrice &&
    evidence.hasProductSchema &&
    evidence.hasSaleSignal;
}
