import {
  canonicalHostname,
  normalizeSearchCandidate,
  sanitizeSearchTitle,
} from "./parser.ts";

export type OpenAiPriceClaim = {
  sourceUrl: string;
  title: string;
  priceKrw: number;
  status: "ACTIVE" | "SOLD" | "UNKNOWN";
  morph: string | null;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  weightG: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  citedUrls: string[];
};

export type OpenAiPriceResearchOutput = {
  candidates: OpenAiPriceClaim[];
};

export type OpenAiSearchSource = {
  url: string;
  title: string;
};

type UnknownRecord = Record<string, unknown>;

const MAX_PRICE_CANDIDATES = 30;
const MAX_CITED_URLS = 8;

export const OPENAI_PRICE_EVIDENCE_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      maxItems: MAX_PRICE_CANDIDATES,
      items: {
        type: "object",
        properties: {
          sourceUrl: { type: "string" },
          title: { type: "string" },
          priceKrw: { type: "integer", minimum: 1000, maximum: 1_000_000_000 },
          status: { type: "string", enum: ["ACTIVE", "SOLD", "UNKNOWN"] },
          morph: {
            anyOf: [
              { type: "string" },
              { type: "null" },
            ],
          },
          sex: { type: "string", enum: ["MALE", "FEMALE", "UNKNOWN"] },
          weightG: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 10_000 },
              { type: "null" },
            ],
          },
          confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          citedUrls: {
            type: "array",
            maxItems: MAX_CITED_URLS,
            items: { type: "string" },
          },
        },
        required: [
          "sourceUrl",
          "title",
          "priceKrw",
          "status",
          "morph",
          "sex",
          "weightG",
          "confidence",
          "citedUrls",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["candidates"],
  additionalProperties: false,
} as const;

const BLOCKED_WEB_RESEARCH_DOMAINS = [
  "naver.com",
  "daum.net",
  "kakao.com",
  "instagram.com",
  "facebook.com",
  "youtube.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "band.us",
  "daangn.com",
  "bunjang.co.kr",
  "joongna.com",
  "reddit.com",
  "quora.com",
  "wikipedia.org",
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canonicalizeEvidenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|gclid|ref$|source$)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function evidenceUrlIdentity(value: string): string | null {
  const normalized = canonicalizeEvidenceUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  url.hostname = canonicalHostname(url.hostname);
  return url.toString();
}

export function buildOpenAiPriceResearchPrompt(
  knownHosts: readonly string[],
  dateLabel: string,
): string {
  const known = [...new Set(knownHosts)].sort().join(", ");
  return [
    "Research the live Korean public web for individual crested geckos currently offered with an explicit numeric asking price in KRW.",
    "Use agentic web search and open the source pages. Search broadly across Korean reptile shops, breeder storefronts, independent public catalogs, classifieds that do not require login, and long-tail product pages.",
    "Rotate Korean terms and morphs: 크레스티드 게코, 크레스티드게코, 크레 분양, 릴리화이트, 아잔틱, 카푸치노, 세이블, 프라푸치노, 릴리아잔틱, 할리퀸, 달마시안, 트라이컬러, 팬텀.",
    "Return at most 30 high-value candidate animals. Prefer newly found domains or product URLs not covered by the known hosts, but also include overlooked current product pages on known hosts.",
    "Hard evidence rules:",
    "- sourceUrl must be the direct HTTPS page that visibly supports the exact individual animal, numeric price, and sale state; never use a search-result URL or a home/category page when a direct item page exists.",
    "- Never infer a price from a snippet, contact-only offer, installment amount, shipping fee, supply price, bundle total without a per-animal price, auction, giveaway, or old crossed-out price.",
    "- Exclude login/app-only communities, social media, chat/contact-first offers, private APIs, cart/checkout, and pages whose current state cannot be verified.",
    "- One candidate per animal. Include SOLD only when the source explicitly marks that animal sold; otherwise use UNKNOWN rather than guessing.",
    "- citedUrls must include sourceUrl and only URLs actually consulted.",
    "- Do not include seller names, phone numbers, emails, personal addresses, chat handles, or narrative copied from the page.",
    `Audit date: ${dateLabel}. Known hosts: ${known || "none"}.`,
  ].join("\n");
}

export function buildOpenAiResponsesRequest(
  model: string,
  knownHosts: readonly string[],
  dateLabel: string,
): UnknownRecord {
  return {
    model,
    reasoning: { effort: "high" },
    tools: [{
      type: "web_search",
      search_context_size: "high",
      external_web_access: true,
      user_location: {
        type: "approximate",
        country: "KR",
        city: "Seoul",
        region: "Seoul",
      },
      filters: {
        blocked_domains: [...BLOCKED_WEB_RESEARCH_DOMAINS],
      },
    }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    store: false,
    max_output_tokens: 8_000,
    text: {
      format: {
        type: "json_schema",
        name: "donawa_price_evidence",
        strict: true,
        schema: OPENAI_PRICE_EVIDENCE_SCHEMA,
      },
    },
    input: buildOpenAiPriceResearchPrompt(knownHosts, dateLabel),
  };
}

export function extractOpenAiOutputText(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.output)) return null;
  for (const item of payload.output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return null;
}

export function extractOpenAiSearchSources(payload: unknown): OpenAiSearchSource[] {
  if (!isRecord(payload) || !Array.isArray(payload.output)) return [];
  const sources = new Map<string, OpenAiSearchSource>();
  const addSource = (urlValue: unknown, titleValue: unknown) => {
    if (typeof urlValue !== "string") return;
    const url = canonicalizeEvidenceUrl(urlValue);
    if (!url) return;
    sources.set(url, {
      url,
      title: typeof titleValue === "string"
        ? sanitizeSearchTitle(titleValue).slice(0, 240)
        : "",
    });
  };

  for (const item of payload.output) {
    if (!isRecord(item)) continue;
    if (item.type === "web_search_call" && isRecord(item.action) && Array.isArray(item.action.sources)) {
      for (const source of item.action.sources) {
        if (isRecord(source)) addSource(source.url, source.title);
      }
    }
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (!isRecord(content) || !Array.isArray(content.annotations)) continue;
        for (const annotation of content.annotations) {
          if (isRecord(annotation) && annotation.type === "url_citation") {
            addSource(annotation.url, annotation.title);
          }
        }
      }
    }
  }
  return [...sources.values()];
}

export function countOpenAiSearchCalls(payload: unknown): number {
  if (!isRecord(payload) || !Array.isArray(payload.output)) return 0;
  return payload.output.filter((item) =>
    isRecord(item) && item.type === "web_search_call"
  ).length;
}

export function extractOpenAiUsage(payload: unknown): UnknownRecord {
  if (!isRecord(payload) || !isRecord(payload.usage)) return {};
  const usage: UnknownRecord = {};
  for (const key of ["input_tokens", "output_tokens", "total_tokens"]) {
    const value = payload.usage[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      usage[key] = Math.floor(value);
    }
  }
  return usage;
}

export function parseOpenAiPriceResearchOutput(payload: unknown): OpenAiPriceResearchOutput {
  const text = extractOpenAiOutputText(payload);
  if (!text) throw new Error("OPENAI_RESPONSE_MISSING_STRUCTURED_OUTPUT");
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    throw new Error("OPENAI_RESPONSE_INVALID_JSON");
  }
  if (!isRecord(decoded) || !Array.isArray(decoded.candidates)) {
    throw new Error("OPENAI_RESPONSE_INVALID_SCHEMA");
  }

  const candidates: OpenAiPriceClaim[] = [];
  for (const raw of decoded.candidates.slice(0, MAX_PRICE_CANDIDATES)) {
    if (!isRecord(raw)) continue;
    const sourceUrl = canonicalizeEvidenceUrl(
      typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
    );
    const normalized = normalizeSearchCandidate(
      sourceUrl ?? "",
      typeof raw.title === "string" ? raw.title : "",
      "OpenAI web price research",
      1,
    );
    const price = typeof raw.priceKrw === "number" && Number.isInteger(raw.priceKrw)
      ? raw.priceKrw
      : NaN;
    if (!normalized || price < 1_000 || price > 1_000_000_000) continue;
    if (!new Set(["ACTIVE", "SOLD", "UNKNOWN"]).has(String(raw.status))) continue;
    if (!new Set(["MALE", "FEMALE", "UNKNOWN"]).has(String(raw.sex))) continue;
    if (!new Set(["HIGH", "MEDIUM", "LOW"]).has(String(raw.confidence))) continue;
    const weight = raw.weightG === null
      ? null
      : typeof raw.weightG === "number" && Number.isFinite(raw.weightG) && raw.weightG >= 0 && raw.weightG <= 10_000
      ? raw.weightG
      : null;
    const citedUrls = Array.isArray(raw.citedUrls)
      ? [...new Set(raw.citedUrls
        .filter((value): value is string => typeof value === "string")
        .map(canonicalizeEvidenceUrl)
        .filter((value): value is string => Boolean(value)))]
        .slice(0, MAX_CITED_URLS)
      : [];

    candidates.push({
      sourceUrl: normalized.exampleUrl,
      title: normalized.title.slice(0, 240),
      priceKrw: price,
      status: raw.status as OpenAiPriceClaim["status"],
      morph: typeof raw.morph === "string"
        ? sanitizeSearchTitle(raw.morph).slice(0, 120) || null
        : null,
      sex: raw.sex as OpenAiPriceClaim["sex"],
      weightG: weight,
      confidence: raw.confidence as OpenAiPriceClaim["confidence"],
      citedUrls,
    });
  }
  return { candidates };
}
