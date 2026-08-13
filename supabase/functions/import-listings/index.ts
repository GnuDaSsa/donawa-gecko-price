import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";

import {
  matchDictionary,
  matchTraits,
  type DictionaryRow,
} from "../_shared/dictionary.ts";

const ALLOWED_PLATFORM_HOSTS: Record<string, RegExp> = {
  "파사모": /(^|\.)cafe\.naver\.com$/i,
  "동물다락": /(^|\.)dongda\.co\.kr$/i,
};
const MAX_IMPORT_ROWS = 200;

type ImportRow = {
  title?: string;
  url?: string;
  price?: number;
  priceType?: "FIXED" | "CONTACT" | "BUNDLE" | "AUCTION" | "UNKNOWN";
  status?: "ACTIVE" | "SOLD" | "DELETED" | "STALE" | "UNKNOWN";
  morph?: string;
  traits?: string[];
  sex?: "MALE" | "FEMALE" | "UNKNOWN";
  weightG?: number;
  imageUrl?: string;
  classificationMode?: "AUTO" | "EXPLICIT" | "UNCLASSIFIED";
  statusEvidence?:
    | "VISIBLE_OFFER_NO_COMPLETION"
    | "EXPLICIT_ITEM_SOLD"
    | "EXPLICIT_ARTICLE_SOLD"
    | "EXPLICIT_RESERVATION"
    | "ARTICLE_NOT_FOUND"
    | "AGED_UNREVIEWED"
    | "ACCESS_UNCONFIRMED"
    | "LEGACY_REVIEWED_IMPORT";
};

const REVIEWED_STATUSES = new Set(["ACTIVE", "SOLD", "DELETED", "STALE", "UNKNOWN"]);
const PRICE_TYPES = new Set(["FIXED", "CONTACT", "BUNDLE", "AUCTION", "UNKNOWN"]);
const STATUS_EVIDENCE = new Set([
  "VISIBLE_OFFER_NO_COMPLETION",
  "EXPLICIT_ITEM_SOLD",
  "EXPLICIT_ARTICLE_SOLD",
  "EXPLICIT_RESERVATION",
  "ARTICLE_NOT_FOUND",
  "AGED_UNREVIEWED",
  "ACCESS_UNCONFIRMED",
  "LEGACY_REVIEWED_IMPORT",
]);

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

function validatedUrl(value: string, platform: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Only HTTPS source URLs are accepted");
  const allowedHost = ALLOWED_PLATFORM_HOSTS[platform];
  if (!allowedHost?.test(url.hostname)) {
    throw new Error(`${platform} source URL host is not allowed: ${url.hostname}`);
  }
  return url.toString();
}

function optionalImageUrl(value?: string): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Only HTTPS image URLs are accepted");
  return url.toString();
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

  const body = await request.json().catch(() => null) as {
    platform?: string;
    listings?: ImportRow[];
  } | null;
  const platformName = body?.platform ?? "";
  const rows = body?.listings;
  if (!(platformName in ALLOWED_PLATFORM_HOSTS)) {
    return jsonResponse({ ok: false, error: "Unsupported manual-import platform" }, 400);
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_IMPORT_ROWS) {
    return jsonResponse({ ok: false, error: "listings must contain 1-200 rows" }, 400);
  }

  const [
    { data: platform, error: platformError },
    { data: morphRows, error: morphError },
    { data: traitRows, error: traitError },
  ] = await Promise.all([
    supabase.from("platforms").select("id").eq("name", platformName).single(),
    supabase.from("morphs").select("id, slug, aliases, name_ko"),
    supabase.from("traits").select("id, slug, aliases, name_ko"),
  ]);
  if (platformError) return jsonResponse({ ok: false, error: platformError.message }, 500);
  if (morphError) return jsonResponse({ ok: false, error: morphError.message }, 500);
  if (traitError) return jsonResponse({ ok: false, error: traitError.message }, 500);

  const morphs = morphRows as DictionaryRow[];
  const traits = traitRows as DictionaryRow[];
  let stored = 0;
  let activeComparable = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (const [index, row] of rows.entries()) {
    try {
      const title = row.title?.trim();
      if (!title || title.length > 300) throw new Error("title is required and must be <= 300 chars");
      const originalUrl = validatedUrl(row.url ?? "", platformName);
      const status = REVIEWED_STATUSES.has(row.status ?? "") ? row.status! : "ACTIVE";
      const statusEvidence = STATUS_EVIDENCE.has(row.statusEvidence ?? "")
        ? row.statusEvidence!
        : "LEGACY_REVIEWED_IMPORT";
      if (
        status === "SOLD" &&
        statusEvidence !== "EXPLICIT_ITEM_SOLD" &&
        statusEvidence !== "EXPLICIT_ARTICLE_SOLD"
      ) {
        throw new Error("SOLD rows require explicit item/article completion evidence");
      }
      if (status === "DELETED" && statusEvidence !== "ARTICLE_NOT_FOUND") {
        throw new Error("DELETED rows require ARTICLE_NOT_FOUND evidence");
      }
      if (status === "STALE" && statusEvidence !== "AGED_UNREVIEWED") {
        throw new Error("STALE rows require AGED_UNREVIEWED evidence");
      }
      const price = Number.isFinite(row.price) && row.price! > 0
        ? Math.round(row.price!)
        : null;
      const requestedPriceType = PRICE_TYPES.has(row.priceType ?? "")
        ? row.priceType!
        : "UNKNOWN";
      const priceType = price
        ? requestedPriceType === "BUNDLE" || requestedPriceType === "AUCTION"
          ? requestedPriceType
          : "FIXED"
        : requestedPriceType === "CONTACT" ||
            requestedPriceType === "BUNDLE" ||
            requestedPriceType === "AUCTION"
          ? requestedPriceType
          : "UNKNOWN";
      const classificationMode = row.classificationMode === "EXPLICIT" ||
          row.classificationMode === "UNCLASSIFIED"
        ? row.classificationMode
        : "AUTO";
      const classificationText = classificationMode === "EXPLICIT"
        ? row.morph ?? ""
        : `${row.morph ?? ""} ${title}`;
      const morph = classificationMode === "UNCLASSIFIED"
        ? undefined
        : matchDictionary(classificationText, morphs);
      const traitText = `${title} ${(row.traits ?? []).join(" ")}`;
      const matchedTraits = matchTraits(traitText, traits);
      const externalId = `${platformName}:${await sha256(originalUrl)}`;

      const { data: listingId, error: observationError } = await supabase.rpc(
        "apply_listing_observation",
        {
          p_platform_id: platform.id,
          p_external_id: externalId,
          p_morph_id: morph?.id ?? null,
          p_original_title: title,
          p_original_description: null,
          p_original_url: originalUrl,
          p_image_url: optionalImageUrl(row.imageUrl),
          p_current_price: price,
          p_price_type: priceType,
          p_sex: ["MALE", "FEMALE"].includes(row.sex ?? "") ? row.sex : "UNKNOWN",
          p_weight_g: Number.isFinite(row.weightG) && row.weightG! >= 0 ? row.weightG : null,
          p_bundle_count: null,
          p_status: status,
          p_classification_source: "MANUAL",
          p_raw_data: {
            source: "reviewed-manual-import",
            imported_platform: platformName,
            classification_mode: classificationMode,
            status_evidence: statusEvidence,
          },
        },
      );
      if (observationError) throw observationError;

      const { error: deleteError } = await supabase
        .from("listing_traits")
        .delete()
        .eq("listing_id", listingId);
      if (deleteError) throw deleteError;

      if (matchedTraits.length > 0) {
        const { error: insertError } = await supabase
          .from("listing_traits")
          .insert(
            matchedTraits.map((trait) => ({
              listing_id: listingId,
              trait_id: trait.id,
              source_text: traitText.slice(0, 240),
            })),
          );
        if (insertError) throw insertError;
      }

      stored += 1;
      if (morph && status === "ACTIVE" && priceType === "FIXED" && price) {
        activeComparable += 1;
      }
    } catch (error) {
      errors.push({
        row: index + 1,
        error: error instanceof Error ? error.message.slice(0, 240) : "import error",
      });
    }
  }

  if (activeComparable > 0) {
    await supabase.from("platforms").update({ is_active: true }).eq("id", platform.id);
  }

  return jsonResponse({
    ok: stored > 0,
    platform: platformName,
    received: rows.length,
    stored,
    activeComparable,
    errors,
  }, stored > 0 ? 200 : 422);
});
