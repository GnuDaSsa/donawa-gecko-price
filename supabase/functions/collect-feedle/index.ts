import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";

import {
  matchDictionary,
  matchTraits,
  type DictionaryRow,
} from "../_shared/dictionary.ts";
import {
  decideRecheckAction,
  describeRecheckAction,
  RECHECK_FETCH_TIMEOUT_MS,
  RECHECK_MAX_ITEMS,
  RECHECK_PRODUCT_DELAY_MS,
  type RecheckAction,
  type RecheckFetchOutcome,
} from "../_shared/recheck.ts";
import { parseFeedleProductHtml, parseSitemap } from "./parser.ts";

const SITEMAPS = [1, 2, 3, 4].map(
  (page) => `https://www.feedle.me/pet/sitemap/${page}.xml`,
);
const USER_AGENT = "MorphPickPrivateMVP/0.1 (public-sitemap research)";
const MAX_PAGES = 60;

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
      Accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

/** 재확인은 404/410을 결과로 읽어야 하므로 비정상 응답도 상태 코드와 함께 돌려준다. */
async function fetchForRecheck(url: string): Promise<RecheckFetchOutcome> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(RECHECK_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { kind: "response", statusCode: response.status, html: "" };
    }

    return { kind: "response", statusCode: response.status, html: await response.text() };
  } catch {
    return { kind: "error" };
  }
}

type RecheckTargetRow = {
  id: string;
  external_id: string | null;
  morph_id: string | null;
  original_title: string;
  original_url: string;
  current_price: number | null;
  image_url: string | null;
};

/**
 * 36건짜리 신규 스크롤만으로는 오래된 ACTIVE 매물이 영원히 재확인되지 않으므로,
 * `last_checked_at`이 가장 오래된 행부터 별도로 돌려준다.
 */
async function recheckStaleFeedleListings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
  platformId: string,
  morphs: DictionaryRow[],
  traits: DictionaryRow[],
  limit: number,
) {
  const summary = {
    mode: "recheck_stale" as const,
    ok: true,
    checked: 0,
    deleted: 0,
    sold: 0,
    reobserved: 0,
    kept: 0,
    skipped: 0,
    warnings: 0,
    reason: undefined as string | undefined,
    error: undefined as string | undefined,
  };

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, external_id, morph_id, original_title, original_url, current_price, image_url",
    )
    .eq("platform_id", platformId)
    .eq("status", "ACTIVE")
    .order("last_checked_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) return { ...summary, ok: false, error: error.message };

  const warnings: string[] = [];
  let missingRecheckRpc = false;

  for (const row of (data ?? []) as RecheckTargetRow[]) {
    let url: URL;
    try {
      url = new URL(row.original_url);
    } catch {
      summary.skipped += 1;
      continue;
    }

    if (url.protocol !== "https:" || url.hostname !== "www.feedle.me") {
      summary.skipped += 1;
      continue;
    }

    const outcome = await fetchForRecheck(row.original_url);
    const listing =
      outcome.kind === "response" && outcome.html
        ? parseFeedleProductHtml(outcome.html, row.original_url)
        : null;
    const action: RecheckAction = decideRecheckAction(
      outcome,
      listing ? { status: listing.status } : null,
    );
    const reason = describeRecheckAction(action, outcome);
    summary.checked += 1;

    try {
      if (action === "DELETED") {
        const { error: markError } = await supabase.rpc("mark_listing_status", {
          p_listing_id: row.id,
          p_status: "DELETED",
          p_reason: reason,
        });
        if (markError) throw markError;
        summary.deleted += 1;
      } else if (listing && action !== "KEEP") {
        const morph = matchDictionary(listing.morphText, morphs);
        const { data: listingId, error: observationError } = await supabase.rpc(
          "apply_listing_observation",
          {
            p_platform_id: platformId,
            p_external_id: row.external_id ?? listing.externalId,
            p_morph_id: morph?.id ?? row.morph_id,
            p_original_title: listing.originalTitle || row.original_title,
            p_original_description: listing.safeDescription || null,
            p_original_url: listing.originalUrl,
            p_image_url: listing.imageUrl ?? row.image_url,
            p_current_price: listing.currentPrice ?? row.current_price,
            p_price_type: listing.priceType,
            p_sex: listing.sex,
            p_weight_g: listing.weightG ?? null,
            p_bundle_count: null,
            p_status: action === "SOLD" ? "SOLD" : "ACTIVE",
            p_classification_source: "AUTO_KEYWORD",
            p_raw_data: { ...listing.rawData, recheck_reason: reason },
          },
        );
        if (observationError) throw observationError;

        const { error: deleteTraitError } = await supabase
          .from("listing_traits")
          .delete()
          .eq("listing_id", listingId);
        if (deleteTraitError) throw deleteTraitError;

        const matchedTraits = matchTraits(listing.traitText, traits);
        if (matchedTraits.length > 0) {
          const { error: insertTraitError } = await supabase
            .from("listing_traits")
            .insert(
              matchedTraits.map((trait) => ({
                listing_id: listingId,
                trait_id: trait.id,
                source_text: listing.traitText.slice(0, 240),
              })),
            );
          if (insertTraitError) throw insertTraitError;
        }

        if (action === "SOLD") summary.sold += 1;
        else summary.reobserved += 1;
      } else {
        const { error: touchError } = await supabase.rpc("mark_listing_status", {
          p_listing_id: row.id,
          p_status: "ACTIVE",
          p_reason: reason,
        });
        if (touchError) throw touchError;
        summary.kept += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "recheck error";
      warnings.push(message.slice(0, 180));

      if (
        message.includes("mark_listing_status") &&
        /does not exist|find the function|schema cache/i.test(message)
      ) {
        missingRecheckRpc = true;
        break;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, RECHECK_PRODUCT_DELAY_MS));
  }

  summary.warnings = warnings.length;
  if (warnings.length > 0) summary.reason = warnings.slice(0, 8).join(" | ");

  if (missingRecheckRpc) {
    summary.ok = false;
    summary.error =
      "mark_listing_status RPC가 없습니다. supabase/migrations/20261114121000_add_stale_listing_reaper.sql을 먼저 적용하세요.";
  }

  return summary;
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
    mode?: string;
    limit?: number;
  };
  const requestedLimit = Number.isFinite(body.limit) ? Math.floor(body.limit!) : 36;
  const limit = Math.max(1, Math.min(requestedLimit, MAX_PAGES));

  const { data: platform, error: platformError } = await supabase
    .from("platforms")
    .select("id")
    .eq("name", "피들")
    .single();
  if (platformError) return jsonResponse({ ok: false, error: platformError.message }, 500);

  if (body.mode === "recheck_stale") {
    const [{ data: morphs, error: morphError }, { data: traits, error: traitError }] =
      await Promise.all([
        supabase.from("morphs").select("id, slug, aliases, name_ko"),
        supabase.from("traits").select("id, slug, aliases, name_ko"),
      ]);
    if (morphError) return jsonResponse({ ok: false, error: morphError.message }, 500);
    if (traitError) return jsonResponse({ ok: false, error: traitError.message }, 500);

    const recheckLimit = Math.max(1, Math.min(limit, RECHECK_MAX_ITEMS));
    const summary = await recheckStaleFeedleListings(
      supabase,
      platform.id,
      morphs as DictionaryRow[],
      traits as DictionaryRow[],
      recheckLimit,
    );

    return jsonResponse(summary, summary.ok ? 200 : 500);
  }

  const { data: run, error: runError } = await supabase
    .from("collector_runs")
    .insert({ platform_id: platform.id })
    .select("id")
    .single();
  if (runError) return jsonResponse({ ok: false, error: runError.message }, 500);

  try {
    const [{ data: morphs, error: morphError }, { data: traits, error: traitError }] =
      await Promise.all([
        supabase.from("morphs").select("id, slug, aliases, name_ko"),
        supabase.from("traits").select("id, slug, aliases, name_ko"),
      ]);
    if (morphError) throw morphError;
    if (traitError) throw traitError;

    const sitemapXml = await Promise.all(SITEMAPS.map(fetchText));
    const candidates = sitemapXml
      .flatMap(parseSitemap)
      .filter((entry) => entry.url.startsWith("https://www.feedle.me/pet/"))
      .sort((left, right) =>
        (right.lastModified ?? "").localeCompare(left.lastModified ?? ""),
      )
      .slice(0, limit);

    let crestedFound = 0;
    let classified = 0;
    let active = 0;
    let sold = 0;
    const warnings: string[] = [];

    for (const candidate of candidates) {
      try {
        const html = await fetchText(candidate.url);
        const listing = parseFeedleProductHtml(html, candidate.url);
        if (!listing) continue;
        crestedFound += 1;

        const morph = matchDictionary(listing.morphText, morphs as DictionaryRow[]);
        if (!morph) {
          warnings.push(`unmatched morph: ${listing.morphText.slice(0, 60)}`);
          continue;
        }

        const matchedTraits = matchTraits(listing.traitText, traits as DictionaryRow[]);
        const { data: listingId, error: observationError } = await supabase.rpc(
          "apply_listing_observation",
          {
            p_platform_id: platform.id,
            p_external_id: listing.externalId,
            p_morph_id: morph.id,
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
            p_raw_data: { ...listing.rawData, sitemap_lastmod: candidate.lastModified },
          },
        );
        if (observationError) throw observationError;

        const { error: deleteTraitError } = await supabase
          .from("listing_traits")
          .delete()
          .eq("listing_id", listingId);
        if (deleteTraitError) throw deleteTraitError;

        if (matchedTraits.length > 0) {
          const { error: insertTraitError } = await supabase
            .from("listing_traits")
            .insert(
              matchedTraits.map((trait) => ({
                listing_id: listingId,
                trait_id: trait.id,
                source_text: listing.traitText.slice(0, 240),
              })),
            );
          if (insertTraitError) throw insertTraitError;
        }

        classified += 1;
        if (listing.status === "ACTIVE") active += 1;
        if (listing.status === "SOLD") sold += 1;
      } catch (error) {
        warnings.push(error instanceof Error ? error.message.slice(0, 180) : "page error");
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    await supabase
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "SUCCESS",
        listings_seen: classified,
        error_message: warnings.length ? warnings.slice(0, 8).join(" | ") : null,
      })
      .eq("id", run.id);

    return jsonResponse({
      ok: true,
      runId: run.id,
      pagesChecked: candidates.length,
      crestedFound,
      classified,
      active,
      sold,
      warnings: warnings.length,
    });
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

    return jsonResponse({ ok: false, runId: run.id, error: message }, 500);
  }
});
