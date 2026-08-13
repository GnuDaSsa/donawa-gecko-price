import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";

import {
  matchDictionary,
  matchTraits,
  type DictionaryRow,
} from "../_shared/dictionary.ts";
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

  const body = await request.json().catch(() => ({})) as { limit?: number };
  const requestedLimit = Number.isFinite(body.limit) ? Math.floor(body.limit!) : 36;
  const limit = Math.max(1, Math.min(requestedLimit, MAX_PAGES));

  const { data: platform, error: platformError } = await supabase
    .from("platforms")
    .select("id")
    .eq("name", "피들")
    .single();
  if (platformError) return jsonResponse({ ok: false, error: platformError.message }, 500);

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
