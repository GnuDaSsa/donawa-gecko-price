import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";

import {
  analyzePublicShopPage,
  canonicalHostname,
  evaluateRobotsTxt,
  extractFixedKrwPrices,
  findPublicProductCandidateUrl,
  inferPublicListingStatus,
  isEligibleForReview,
  normalizeSearchCandidate,
  sanitizeSearchTitle,
  type PublicShopPageEvidence,
  type PublicListingStatus,
  type SearchCandidate,
} from "./parser.ts";
import {
  buildOpenAiResponsesRequest,
  canonicalizeEvidenceUrl,
  countOpenAiSearchCalls,
  evidenceUrlIdentity,
  extractOpenAiSearchSources,
  extractOpenAiUsage,
  parseOpenAiPriceResearchOutput,
  type OpenAiPriceClaim,
} from "./openai.ts";

const USER_AGENT = "DonawaSourceDiscovery/1.0 (public shop candidate audit)";
const MAX_RESPONSE_BYTES = 512_000;
const MAX_PROBES_PER_RUN = 16;
const MAX_OPENAI_PROBES_PER_RUN = 16;
const PROBE_DELAY_MS = 250;
const QUERY_SEEDS = [
  "크레스티드 게코 분양 샵",
  "크레스티드게코 파충류샵",
  "크레스티드 게코 전문 브리딩샵",
  "크레스티드게코 릴리화이트 분양",
  "크레스티드게코 카푸치노 분양",
  "크레스티드게코 아잔틱 분양",
  "크레스티드게코 세이블 분양",
  "크레스티드게코 온라인 분양몰",
] as const;

type CandidateStatus = "NEW" | "ELIGIBLE_REVIEW" | "REJECTED" | "ONBOARDED";
type RobotsStatus = "ALLOWED" | "BLOCKED" | "UNKNOWN";
type PriceEvidenceStatus = "NEW" | "VALIDATED" | "REJECTED" | "IMPORTED";
// Supabase's ungenerated Edge client needs a broad database generic here; runtime
// access remains constrained to the explicit private operational tables below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = ReturnType<typeof createClient<any>>;

type ExistingCandidate = {
  hostname: string;
  status: CandidateStatus;
  times_seen: number;
};

type PlatformHost = {
  id: string;
  homepage_url: string;
};

type ExistingPriceEvidence = {
  source_url: string;
  verification_status: PriceEvidenceStatus;
  times_seen: number;
};

type NaverSearchItem = {
  title?: unknown;
  link?: unknown;
};

type ProbeResult = {
  robotsStatus: RobotsStatus;
  robotsRule?: string;
  pageHttpStatus?: number;
  evidenceUrl?: string;
  evidence: PublicShopPageEvidence;
  status: CandidateStatus;
  rejectionReason?: string;
};

type PriceEvidenceProbe = {
  attempted: boolean;
  robotsStatus: RobotsStatus;
  robotsRule?: string;
  pageHttpStatus?: number;
  evidence: PublicShopPageEvidence;
  sourceStatus: PublicListingStatus;
  sourceInSearchResults: boolean;
  directUrlCited: boolean;
  exactPricePresent: boolean;
  statusCompatible: boolean;
  priceCount: number;
  verificationStatus: Exclude<PriceEvidenceStatus, "IMPORTED">;
  rejectionReason?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
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

async function fetchLimitedText(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.body) return { status: response.status, text: "" };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < MAX_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_RESPONSE_BYTES - received;
      chunks.push(value.length > remaining ? value.slice(0, remaining) : value);
      received += Math.min(value.length, remaining);
      if (value.length > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { status: response.status, text: new TextDecoder().decode(bytes) };
}

async function fetchNaverResults(
  clientId: string,
  clientSecret: string,
  query: string,
  start: number,
): Promise<NaverSearchItem[]> {
  const url = new URL("https://openapi.naver.com/v1/search/webkr.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "20");
  url.searchParams.set("start", String(start));

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Naver web search returned ${response.status}`);
  const payload = await response.json() as { items?: unknown };
  return Array.isArray(payload.items) ? payload.items as NaverSearchItem[] : [];
}

async function fetchOpenAiPriceResearch(
  apiKey: string,
  model: string,
  knownHosts: readonly string[],
): Promise<unknown> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAiResponsesRequest(
      model,
      knownHosts,
      new Date().toISOString().slice(0, 10),
    )),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new Error(`OPENAI_API_HTTP_${response.status}`);
  const payload: unknown = await response.json();
  if (
    payload && typeof payload === "object" &&
    "status" in payload && payload.status === "incomplete"
  ) throw new Error("OPENAI_RESPONSE_INCOMPLETE");
  return payload;
}

function emptyEvidence(): PublicShopPageEvidence {
  return {
    hasCrestedKeyword: false,
    hasFixedPrice: false,
    hasProductSchema: false,
    hasSaleSignal: false,
    platformHint: "OTHER",
  };
}

async function probeCandidate(candidate: SearchCandidate): Promise<ProbeResult> {
  const targetUrl = new URL(candidate.exampleUrl);
  const robotsUrl = `${targetUrl.origin}/robots.txt`;
  let robotsStatus: RobotsStatus = "UNKNOWN";
  let robotsRule: string | undefined;
  let robotsText: string | undefined;

  try {
    const robots = await fetchLimitedText(robotsUrl, { Accept: "text/plain,*/*;q=0.1" });
    if (robots.status === 404 || robots.status === 410) {
      robotsStatus = "ALLOWED";
      robotsRule = "robots:missing";
    } else if (robots.status === 401 || robots.status === 403) {
      robotsStatus = "BLOCKED";
      robotsRule = `robots:http-${robots.status}`;
    } else if (robots.status >= 200 && robots.status < 300) {
      robotsText = robots.text;
      const decision = evaluateRobotsTxt(robots.text, candidate.exampleUrl);
      robotsStatus = decision.status;
      robotsRule = decision.matchedRule;
    }
  } catch {
    robotsStatus = "UNKNOWN";
    robotsRule = "robots:unreachable";
  }

  if (robotsStatus !== "ALLOWED") {
    return {
      robotsStatus,
      robotsRule,
      evidence: emptyEvidence(),
      status: robotsStatus === "BLOCKED" ? "REJECTED" : "NEW",
      rejectionReason: robotsStatus === "BLOCKED" ? "ROBOTS_BLOCKED" : undefined,
    };
  }

  try {
    const page = await fetchLimitedText(candidate.exampleUrl, {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    });
    let evidence = page.status >= 200 && page.status < 300
      ? analyzePublicShopPage(page.text)
      : emptyEvidence();
    let evidenceUrl = candidate.exampleUrl;

    if (
      page.status >= 200 && page.status < 300 &&
      !isEligibleForReview(evidence) &&
      evidence.hasCrestedKeyword &&
      evidence.hasFixedPrice &&
      evidence.hasSaleSignal &&
      evidence.platformHint !== "OTHER"
    ) {
      const productUrl = findPublicProductCandidateUrl(page.text, candidate.exampleUrl);
      const productAllowed = productUrl && (!robotsText ||
        evaluateRobotsTxt(robotsText, productUrl).status === "ALLOWED");
      if (productUrl && productAllowed) {
        const productPage = await fetchLimitedText(productUrl, {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        });
        if (productPage.status >= 200 && productPage.status < 300) {
          const productEvidence = analyzePublicShopPage(productPage.text);
          if (isEligibleForReview(productEvidence)) {
            evidence = productEvidence;
            evidenceUrl = productUrl;
          }
        }
      }
    }
    return {
      robotsStatus,
      robotsRule,
      pageHttpStatus: page.status,
      evidenceUrl,
      evidence,
      status: isEligibleForReview(evidence) ? "ELIGIBLE_REVIEW" : "NEW",
    };
  } catch {
    return {
      robotsStatus,
      robotsRule,
      evidence: emptyEvidence(),
      status: "NEW",
    };
  }
}

function unprobedPriceEvidence(
  claim: OpenAiPriceClaim,
  sourceIdentities: ReadonlySet<string>,
): PriceEvidenceProbe {
  const identity = evidenceUrlIdentity(claim.sourceUrl);
  const sourceInSearchResults = Boolean(identity && sourceIdentities.has(identity));
  const directUrlCited = Boolean(identity && claim.citedUrls.some((url) =>
    evidenceUrlIdentity(url) === identity
  ));
  const rejectionReason = !sourceInSearchResults
    ? "MODEL_URL_NOT_IN_SEARCH_SOURCES"
    : !directUrlCited
    ? "MODEL_SOURCE_NOT_CITED"
    : "RUN_PROBE_LIMIT";
  return {
    attempted: false,
    robotsStatus: "UNKNOWN",
    evidence: emptyEvidence(),
    sourceStatus: "UNKNOWN",
    sourceInSearchResults,
    directUrlCited,
    exactPricePresent: false,
    statusCompatible: false,
    priceCount: 0,
    verificationStatus: rejectionReason === "RUN_PROBE_LIMIT" ? "NEW" : "REJECTED",
    rejectionReason,
  };
}

async function probePriceEvidence(
  claim: OpenAiPriceClaim,
  sourceIdentities: ReadonlySet<string>,
): Promise<PriceEvidenceProbe> {
  const initial = unprobedPriceEvidence(claim, sourceIdentities);
  if (initial.rejectionReason !== "RUN_PROBE_LIMIT") return initial;

  const targetUrl = new URL(claim.sourceUrl);
  let robotsStatus: RobotsStatus = "UNKNOWN";
  let robotsRule: string | undefined;
  try {
    const robots = await fetchLimitedText(`${targetUrl.origin}/robots.txt`, {
      Accept: "text/plain,*/*;q=0.1",
    });
    if (robots.status === 404 || robots.status === 410) {
      robotsStatus = "ALLOWED";
      robotsRule = "robots:missing";
    } else if (robots.status === 401 || robots.status === 403) {
      robotsStatus = "BLOCKED";
      robotsRule = `robots:http-${robots.status}`;
    } else if (robots.status >= 200 && robots.status < 300) {
      const decision = evaluateRobotsTxt(robots.text, claim.sourceUrl);
      robotsStatus = decision.status;
      robotsRule = decision.matchedRule;
    } else {
      robotsRule = `robots:http-${robots.status}`;
    }
  } catch {
    robotsRule = "robots:unreachable";
  }

  if (robotsStatus !== "ALLOWED") {
    return {
      ...initial,
      attempted: true,
      robotsStatus,
      robotsRule,
      verificationStatus: robotsStatus === "BLOCKED" ? "REJECTED" : "NEW",
      rejectionReason: robotsStatus === "BLOCKED" ? "ROBOTS_BLOCKED" : "ROBOTS_UNREACHABLE",
    };
  }

  try {
    const page = await fetchLimitedText(claim.sourceUrl, {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    });
    if (page.status < 200 || page.status >= 300) {
      return {
        ...initial,
        attempted: true,
        robotsStatus,
        robotsRule,
        pageHttpStatus: page.status,
        verificationStatus: "NEW",
        rejectionReason: "PAGE_NOT_CURRENTLY_READABLE",
      };
    }

    const evidence = analyzePublicShopPage(page.text);
    const prices = extractFixedKrwPrices(page.text);
    const sourceStatus = inferPublicListingStatus(page.text);
    const exactPricePresent = prices.includes(claim.priceKrw);
    const statusCompatible = sourceStatus !== "UNKNOWN" &&
      (claim.status === "UNKNOWN" || claim.status === sourceStatus);
    let rejectionReason: string | undefined;
    if (!evidence.hasCrestedKeyword) rejectionReason = "CRESTED_CONTEXT_MISSING";
    else if (!evidence.hasFixedPrice) rejectionReason = "FIXED_PRICE_MISSING";
    else if (!exactPricePresent) rejectionReason = "CLAIMED_PRICE_NOT_FOUND";
    else if (sourceStatus === "UNKNOWN") rejectionReason = "SALE_STATE_NOT_VERIFIABLE";
    else if (!statusCompatible) rejectionReason = "SALE_STATE_CONFLICT";

    return {
      attempted: true,
      robotsStatus,
      robotsRule,
      pageHttpStatus: page.status,
      evidence,
      sourceStatus,
      sourceInSearchResults: true,
      directUrlCited: true,
      exactPricePresent,
      statusCompatible,
      priceCount: prices.length,
      verificationStatus: rejectionReason ? "REJECTED" : "VALIDATED",
      rejectionReason,
    };
  } catch {
    return {
      ...initial,
      attempted: true,
      robotsStatus,
      robotsRule,
      verificationStatus: "NEW",
      rejectionReason: "PAGE_FETCH_FAILED",
    };
  }
}

async function finishRun(
  supabase: SupabaseAdmin,
  runId: number,
  values: Record<string, unknown>,
) {
  await supabase.from("source_discovery_runs").update({
    ...values,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);
}

async function listCandidates(
  supabase: SupabaseAdmin,
  status: string | undefined,
  limit: number,
) {
  const allowedStatuses = new Set<CandidateStatus>([
    "NEW",
    "ELIGIBLE_REVIEW",
    "REJECTED",
    "ONBOARDED",
  ]);
  let query = supabase
    .from("source_candidates")
    .select(
      "hostname, example_url, discovery_title, discovery_query, provider, robots_status, platform_hint, status, rejection_reason, times_seen, first_seen_at, last_seen_at, last_checked_at, evidence",
    )
    .order("status", { ascending: true })
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (status && allowedStatuses.has(status as CandidateStatus)) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function listPriceEvidence(
  supabase: SupabaseAdmin,
  status: string | undefined,
  limit: number,
) {
  const allowedStatuses = new Set<PriceEvidenceStatus>([
    "NEW",
    "VALIDATED",
    "REJECTED",
    "IMPORTED",
  ]);
  let query = supabase
    .from("price_evidence_candidates")
    .select(
      "source_url, hostname, platform_id, provider, model, response_id, search_query, title, claimed_price_krw, claimed_status, claimed_morph, claimed_sex, claimed_weight_g, model_confidence, verification_status, rejection_reason, robots_status, page_http_status, cited_urls, evidence, times_seen, first_seen_at, last_seen_at, last_checked_at",
    )
    .order("verification_status", { ascending: true })
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (status && allowedStatuses.has(status as PriceEvidenceStatus)) {
    query = query.eq("verification_status", status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function discoverSources(supabase: SupabaseAdmin) {
  const { data: run, error: runError } = await supabase
    .from("source_discovery_runs")
    .insert({ provider: "NAVER_WEB_SEARCH" })
    .select("id")
    .single();
  if (runError) throw runError;

  const clientId = Deno.env.get("NAVER_SEARCH_CLIENT_ID");
  const clientSecret = Deno.env.get("NAVER_SEARCH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    await finishRun(supabase, run.id, {
      status: "SKIPPED",
      error_message: "MISSING_NAVER_SEARCH_CREDENTIALS",
    });
    return {
      ok: true,
      skipped: true,
      reason: "MISSING_NAVER_SEARCH_CREDENTIALS",
      runId: run.id,
    };
  }

  try {
    const [{ data: platformRows, error: platformError }, {
      data: candidateRows,
      error: candidateError,
    }] = await Promise.all([
      supabase.from("platforms").select("homepage_url"),
      supabase.from("source_candidates").select("hostname, status, times_seen"),
    ]);
    if (platformError) throw platformError;
    if (candidateError) throw candidateError;

    const knownHosts = new Set<string>();
    for (const row of platformRows ?? []) {
      try {
        knownHosts.add(canonicalHostname(new URL(row.homepage_url).hostname));
      } catch {
        // Existing malformed platform URLs should not abort candidate discovery.
      }
    }
    const existing = new Map<string, ExistingCandidate>(
      ((candidateRows ?? []) as ExistingCandidate[]).map((row) => [row.hostname, row]),
    );

    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const deepStart = 21 + (dayIndex % 3) * 20;
    const searchPlans = [
      ...QUERY_SEEDS.map((query) => ({ query, start: 1 })),
      ...QUERY_SEEDS.slice(0, 4).map((query) => ({ query, start: deepStart })),
    ];
    const candidates = new Map<string, SearchCandidate>();
    let resultsSeen = 0;
    let queryCount = 0;
    const queryErrors: string[] = [];

    for (const plan of searchPlans) {
      try {
        const items = await fetchNaverResults(
          clientId,
          clientSecret,
          plan.query,
          plan.start,
        );
        queryCount += 1;
        resultsSeen += items.length;
        items.forEach((item, index) => {
          if (typeof item.link !== "string" || typeof item.title !== "string") return;
          const candidate = normalizeSearchCandidate(
            item.link,
            item.title,
            plan.query,
            plan.start + index,
            knownHosts,
          );
          if (!candidate) return;
          const previous = candidates.get(candidate.hostname);
          if (!previous || candidate.rank < previous.rank) {
            candidates.set(candidate.hostname, candidate);
          }
        });
      } catch (error) {
        queryErrors.push(error instanceof Error ? error.message : "search request failed");
      }
    }
    if (queryCount === 0) throw new Error(queryErrors[0] ?? "All discovery queries failed");

    const selected = [...candidates.values()]
      .filter((candidate) => existing.get(candidate.hostname)?.status !== "ONBOARDED")
      .sort((left, right) => {
        const leftKnown = existing.has(left.hostname) ? 1 : 0;
        const rightKnown = existing.has(right.hostname) ? 1 : 0;
        return leftKnown - rightKnown || left.rank - right.rank;
      })
      .slice(0, MAX_PROBES_PER_RUN);

    let eligibleCount = 0;
    let upserted = 0;
    const now = new Date().toISOString();
    for (let offset = 0; offset < selected.length; offset += 4) {
      const batch = selected.slice(offset, offset + 4);
      const probes = await Promise.all(batch.map(probeCandidate));
      for (let index = 0; index < batch.length; index += 1) {
        const candidate = batch[index];
        const probe = probes[index];
        const previous = existing.get(candidate.hostname);
        const finalStatus = previous?.status === "REJECTED"
          ? "REJECTED"
          : probe.status;
        if (finalStatus === "ELIGIBLE_REVIEW") eligibleCount += 1;

        const row: Record<string, unknown> = {
          hostname: candidate.hostname,
          example_url: candidate.exampleUrl,
          discovery_title: candidate.title,
          discovery_query: candidate.discoveryQuery,
          provider: "NAVER_WEB_SEARCH",
          robots_status: probe.robotsStatus,
          platform_hint: probe.evidence.platformHint,
          status: finalStatus,
          times_seen: (previous?.times_seen ?? 0) + 1,
          last_seen_at: now,
          last_checked_at: now,
          evidence: {
            search_rank: candidate.rank,
            robots_rule: probe.robotsRule,
            page_http_status: probe.pageHttpStatus,
            evidence_url: probe.evidenceUrl,
            has_crested_keyword: probe.evidence.hasCrestedKeyword,
            has_fixed_price: probe.evidence.hasFixedPrice,
            has_product_schema: probe.evidence.hasProductSchema,
            has_sale_signal: probe.evidence.hasSaleSignal,
          },
        };
        if (previous?.status !== "REJECTED") {
          row.rejection_reason = probe.rejectionReason ?? null;
        }
        const { error } = await supabase.from("source_candidates").upsert(
          row,
          { onConflict: "hostname" },
        );
        if (error) throw error;
        upserted += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, PROBE_DELAY_MS));
    }

    await finishRun(supabase, run.id, {
      status: "SUCCESS",
      query_count: queryCount,
      results_seen: resultsSeen,
      candidates_upserted: upserted,
      eligible_count: eligibleCount,
      error_message: queryErrors.length > 0
        ? [...new Set(queryErrors)].join("; ").slice(0, 500)
        : null,
    });
    return {
      ok: true,
      runId: run.id,
      queryCount,
      resultsSeen,
      uniqueCandidateHosts: candidates.size,
      probed: selected.length,
      upserted,
      eligibleCount,
      queryWarnings: queryErrors.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source discovery failed";
    await finishRun(supabase, run.id, {
      status: "FAILED",
      error_message: message.slice(0, 500),
    });
    return { ok: false, runId: run.id, error: message };
  }
}

async function discoverOpenAiPriceEvidence(supabase: SupabaseAdmin) {
  const model = (Deno.env.get("OPENAI_DISCOVERY_MODEL") ?? "gpt-5.6-sol").slice(0, 80);
  const { data: run, error: runError } = await supabase
    .from("source_discovery_runs")
    .insert({ provider: "OPENAI_WEB_SEARCH", model })
    .select("id")
    .single();
  if (runError) throw runError;

  // Inserting the run before reading the key makes a missing paid credential an
  // auditable, zero-call outcome rather than a silent scheduler failure.
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    await finishRun(supabase, run.id, {
      status: "SKIPPED",
      error_message: "MISSING_OPENAI_API_KEY",
    });
    return {
      ok: true,
      skipped: true,
      reason: "MISSING_OPENAI_API_KEY",
      runId: run.id,
      model,
    };
  }

  try {
    const [{ data: platformRows, error: platformError }, {
      data: candidateRows,
      error: candidateError,
    }, { data: evidenceRows, error: evidenceError }] = await Promise.all([
      supabase.from("platforms").select("id, homepage_url"),
      supabase.from("source_candidates").select("hostname, status, times_seen"),
      supabase.from("price_evidence_candidates").select(
        "source_url, verification_status, times_seen",
      ),
    ]);
    if (platformError) throw platformError;
    if (candidateError) throw candidateError;
    if (evidenceError) throw evidenceError;

    const platformByHost = new Map<string, string>();
    for (const row of (platformRows ?? []) as PlatformHost[]) {
      try {
        platformByHost.set(canonicalHostname(new URL(row.homepage_url).hostname), row.id);
      } catch {
        // A malformed legacy homepage should not abort research on other hosts.
      }
    }
    const existingCandidates = new Map<string, ExistingCandidate>(
      ((candidateRows ?? []) as ExistingCandidate[]).map((row) => [row.hostname, row]),
    );
    const existingEvidence = new Map<string, ExistingPriceEvidence>();
    for (const row of (evidenceRows ?? []) as ExistingPriceEvidence[]) {
      const identity = evidenceUrlIdentity(row.source_url);
      if (identity) existingEvidence.set(identity, row);
    }

    const payload = await fetchOpenAiPriceResearch(
      apiKey,
      model,
      [...platformByHost.keys()],
    );
    const sources = extractOpenAiSearchSources(payload);
    const sourceIdentities = new Set(
      sources.map((source) => evidenceUrlIdentity(source.url)).filter(
        (value): value is string => Boolean(value),
      ),
    );
    const { candidates } = parseOpenAiPriceResearchOutput(payload);
    const probes = candidates.map((claim) =>
      unprobedPriceEvidence(claim, sourceIdentities)
    );
    const probeIndexes = probes
      .map((probe, index) => ({ probe, index }))
      .filter(({ probe }) => probe.rejectionReason === "RUN_PROBE_LIMIT")
      .slice(0, MAX_OPENAI_PROBES_PER_RUN)
      .map(({ index }) => index);

    for (let offset = 0; offset < probeIndexes.length; offset += 4) {
      const indexes = probeIndexes.slice(offset, offset + 4);
      const batch = await Promise.all(indexes.map((index) =>
        probePriceEvidence(candidates[index], sourceIdentities)
      ));
      batch.forEach((probe, index) => {
        probes[indexes[index]] = probe;
      });
      await new Promise((resolve) => setTimeout(resolve, PROBE_DELAY_MS));
    }

    const payloadRecord = payload && typeof payload === "object"
      ? payload as Record<string, unknown>
      : {};
    const responseId = typeof payloadRecord.id === "string"
      ? payloadRecord.id.slice(0, 160)
      : null;
    const now = new Date().toISOString();
    const discoveryLabel = `OpenAI Korean web price research ${now.slice(0, 10)}`;
    let evidenceUpserted = 0;
    let validatedCount = 0;
    const validatedUnknownHosts = new Map<string, {
      claim: OpenAiPriceClaim;
      probe: PriceEvidenceProbe;
    }>();

    for (let index = 0; index < candidates.length; index += 1) {
      const claim = candidates[index];
      const probe = probes[index];
      const identity = evidenceUrlIdentity(claim.sourceUrl);
      if (!identity) continue;
      const previous = existingEvidence.get(identity);
      const sourceUrl = previous?.source_url ?? canonicalizeEvidenceUrl(claim.sourceUrl);
      if (!sourceUrl) continue;
      const hostname = canonicalHostname(new URL(sourceUrl).hostname);
      const citedUrls = [...new Set(claim.citedUrls.filter((url) => {
        const citedIdentity = evidenceUrlIdentity(url);
        return Boolean(citedIdentity && sourceIdentities.has(citedIdentity));
      }))].slice(0, 8);
      const verificationStatus = previous?.verification_status === "IMPORTED"
        ? "IMPORTED"
        : probe.verificationStatus;

      const { error } = await supabase.from("price_evidence_candidates").upsert({
        source_url: sourceUrl,
        hostname,
        platform_id: platformByHost.get(hostname) ?? null,
        provider: "OPENAI_WEB_SEARCH",
        model,
        response_id: responseId,
        search_query: discoveryLabel,
        title: sanitizeSearchTitle(claim.title).slice(0, 240) || hostname,
        claimed_price_krw: claim.priceKrw,
        claimed_status: claim.status,
        claimed_morph: claim.morph,
        claimed_sex: claim.sex,
        claimed_weight_g: claim.weightG,
        model_confidence: claim.confidence,
        verification_status: verificationStatus,
        rejection_reason: probe.rejectionReason ?? null,
        robots_status: probe.robotsStatus,
        page_http_status: probe.pageHttpStatus ?? null,
        cited_urls: citedUrls,
        evidence: {
          source_in_search_results: probe.sourceInSearchResults,
          direct_url_cited: probe.directUrlCited,
          robots_rule: probe.robotsRule ?? null,
          has_crested_keyword: probe.evidence.hasCrestedKeyword,
          has_fixed_price: probe.evidence.hasFixedPrice,
          has_product_schema: probe.evidence.hasProductSchema,
          has_sale_signal: probe.evidence.hasSaleSignal,
          exact_price_present: probe.exactPricePresent,
          extracted_price_count: probe.priceCount,
          source_status: probe.sourceStatus,
          status_compatible: probe.statusCompatible,
          search_source_count: sources.length,
          probe_attempted: probe.attempted,
        },
        times_seen: (previous?.times_seen ?? 0) + 1,
        last_seen_at: now,
        last_checked_at: probe.attempted ? now : null,
      }, { onConflict: "source_url" });
      if (error) throw error;
      evidenceUpserted += 1;
      if (probe.verificationStatus === "VALIDATED") {
        validatedCount += 1;
        if (!platformByHost.has(hostname) && !validatedUnknownHosts.has(hostname)) {
          validatedUnknownHosts.set(hostname, { claim, probe });
        }
      }
    }

    let sourceCandidatesUpserted = 0;
    for (const [hostname, { claim, probe }] of validatedUnknownHosts) {
      const previous = existingCandidates.get(hostname);
      const status: CandidateStatus = previous?.status === "REJECTED"
        ? "REJECTED"
        : previous?.status === "ONBOARDED"
        ? "ONBOARDED"
        : "ELIGIBLE_REVIEW";
      const { error } = await supabase.from("source_candidates").upsert({
        hostname,
        example_url: claim.sourceUrl,
        discovery_title: sanitizeSearchTitle(claim.title),
        discovery_query: discoveryLabel,
        provider: "OPENAI_WEB_SEARCH",
        robots_status: probe.robotsStatus,
        platform_hint: probe.evidence.platformHint,
        status,
        rejection_reason: previous?.status === "REJECTED" ? undefined : null,
        times_seen: (previous?.times_seen ?? 0) + 1,
        last_seen_at: now,
        last_checked_at: now,
        evidence: {
          evidence_url: claim.sourceUrl,
          has_crested_keyword: probe.evidence.hasCrestedKeyword,
          has_fixed_price: probe.evidence.hasFixedPrice,
          has_product_schema: probe.evidence.hasProductSchema,
          has_sale_signal: probe.evidence.hasSaleSignal,
          exact_price_present: probe.exactPricePresent,
          source_status: probe.sourceStatus,
          discovery_channel: "OPENAI_WEB_SEARCH",
        },
      }, { onConflict: "hostname" });
      if (error) throw error;
      sourceCandidatesUpserted += 1;
    }

    const searchCalls = countOpenAiSearchCalls(payload);
    await finishRun(supabase, run.id, {
      status: "SUCCESS",
      query_count: searchCalls,
      search_calls: searchCalls,
      results_seen: candidates.length,
      source_urls_seen: sources.length,
      candidates_upserted: evidenceUpserted,
      eligible_count: validatedCount,
      usage: extractOpenAiUsage(payload),
      error_message: null,
    });
    return {
      ok: true,
      runId: run.id,
      model,
      searchCalls,
      sourceUrlsSeen: sources.length,
      claimsReturned: candidates.length,
      probed: probeIndexes.length,
      evidenceUpserted,
      validatedCount,
      sourceCandidatesUpserted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI price discovery failed";
    await finishRun(supabase, run.id, {
      status: "FAILED",
      error_message: message.slice(0, 500),
    });
    return { ok: false, runId: run.id, model, error: message };
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
    mode?: "discover" | "discover-openai" | "list" | "list-price-evidence";
    status?: string;
    limit?: number;
  };
  if (body.mode === "list") {
    const limit = Math.max(1, Math.min(Math.floor(body.limit ?? 50), 100));
    try {
      return jsonResponse({
        ok: true,
        candidates: await listCandidates(supabase, body.status, limit),
      });
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Candidate listing failed",
      }, 500);
    }
  }

  if (body.mode === "list-price-evidence") {
    const limit = Math.max(1, Math.min(Math.floor(body.limit ?? 50), 100));
    try {
      return jsonResponse({
        ok: true,
        candidates: await listPriceEvidence(supabase, body.status, limit),
      });
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Price-evidence listing failed",
      }, 500);
    }
  }

  if (body.mode === "discover-openai") {
    const result = await discoverOpenAiPriceEvidence(supabase);
    return jsonResponse(result, result.ok ? 200 : 500);
  }

  const result = await discoverSources(supabase);
  return jsonResponse(result, result.ok ? 200 : 500);
});
