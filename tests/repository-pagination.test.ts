import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A deliberately small PostgREST stand-in: it stores rows per table, honours
 * `range()` the way Supabase's 1,000-row server default does (a caller that
 * forgets to page gets one capped page), and records every request so the
 * repository's paging can be asserted.
 */
type RangeCall = { table: string; from: number; to: number; filters: string[][] };

function createFakeSupabase(tables: Record<string, unknown[]>) {
  const rangeCalls: RangeCall[] = [];

  function builder(table: string) {
    const filters: string[][] = [];
    const predicates: Array<(row: Record<string, unknown>) => boolean> = [];
    const source = () =>
      ((tables[table] ?? []) as unknown[]).filter((row) =>
        predicates.every((predicate) => predicate(row as Record<string, unknown>)),
      );

    const api = {
      select: () => api,
      eq: (column: string, value: unknown) => {
        filters.push([column, String(value)]);
        predicates.push((row) => row[column] === value);
        return api;
      },
      neq: () => api,
      not: () => api,
      in: (column: string, values: unknown[]) => {
        filters.push([column, `in:${values.length}`]);
        const allowed = new Set(values);
        predicates.push((row) => allowed.has(row[column]));
        return api;
      },
      order: () => api,
      maybeSingle: () => Promise.resolve({ data: source()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: source()[0] ?? null, error: null }),
      range: (from: number, to: number) => {
        rangeCalls.push({ table, from, to, filters: [...filters] });
        return Promise.resolve({ data: source().slice(from, to + 1), error: null });
      },
    };

    return api;
  }

  return { client: { from: builder }, rangeCalls };
}

const fake = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => fake.current,
}));

const MORPH_ID = "11111111-1111-4111-8111-111111111111";

function morphRows() {
  return [
    {
      id: MORPH_ID,
      slug: "lilly-white",
      name_ko: "릴리화이트",
      name_en: "Lilly White",
      aliases: [],
      representative_image: null,
      visible_on_home: true,
      display_order: 1,
    },
  ];
}

function marketListingRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `listing-${String(index).padStart(5, "0")}`,
    morph_id: MORPH_ID,
    status: "ACTIVE",
    price_type: "FIXED",
    current_price: 100_000 + index,
    image_url: null,
    original_title: `릴리화이트 ${index}`,
    platform: { id: "platform-1", is_active: true },
    listing_traits: [],
  }));
}

afterEach(() => {
  fake.current = null;
  vi.resetModules();
});

describe("repository pagination", () => {
  it("counts every home market listing instead of stopping at 1,000 rows", async () => {
    const { getHomeMarketSnapshot } = await import("@/lib/data/repository");
    const supabase = createFakeSupabase({
      morphs: morphRows(),
      traits: [],
      listings: marketListingRows(2_347),
    });
    fake.current = supabase.client;

    const snapshot = await getHomeMarketSnapshot();

    expect(snapshot.totalListings).toBe(2_347);
    expect(snapshot.morphs[0]?.listingCount).toBe(2_347);
    expect(snapshot.morphs[0]?.minPrice).toBe(100_000);

    const listingRanges = supabase.rangeCalls.filter((call) => call.table === "listings");
    expect(listingRanges.map(({ from, to }) => [from, to])).toEqual([
      [0, 999],
      [1_000, 1_999],
      [2_000, 2_999],
    ]);
  });

  it("reads a whole morph price pool in deterministic price order", async () => {
    const { getComparableListings } = await import("@/lib/data/repository");
    const supabase = createFakeSupabase({
      listings: Array.from({ length: 1_500 }, (_, index) => ({
        id: `listing-${String(index).padStart(5, "0")}`,
        platform_id: "platform-1",
        morph_id: MORPH_ID,
        original_title: `릴리화이트 ${index}`,
        original_url: `https://example.com/product/${index}`,
        image_url: null,
        current_price: 300_000 - index,
        price_type: "FIXED",
        currency: "KRW",
        sex: "UNKNOWN",
        weight_g: null,
        bundle_count: null,
        status: "ACTIVE",
        classification_source: "AUTO_KEYWORD",
        first_seen_at: "2026-11-01T00:00:00Z",
        last_seen_at: "2026-11-13T00:00:00Z",
        last_checked_at: "2026-11-13T00:00:00Z",
        sold_detected_at: null,
        raw_data: {},
        platform: {
          id: "platform-1",
          name: "키워",
          homepage_url: "https://kiwo.kr",
          collector_type: "AUTO_WEB",
          is_active: true,
        },
        listing_traits: [],
      })),
    });
    fake.current = supabase.client;

    const listings = await getComparableListings(MORPH_ID);

    expect(listings).toHaveLength(1_500);
    expect(listings[0]?.currentPrice).toBe(300_000 - 1_499);
    expect(listings.at(-1)?.currentPrice).toBe(300_000);

    const listingRanges = supabase.rangeCalls.filter((call) => call.table === "listings");
    expect(listingRanges.map(({ from, to }) => [from, to])).toEqual([
      [0, 999],
      [1_000, 1_999],
    ]);
  });

  it("chunks a keyword's listing-id lookup so no batch is truncated", async () => {
    const { getComparableListingsByTraitSlug } = await import("@/lib/data/repository");
    const TRAIT_ID = "22222222-2222-4222-8222-222222222222";
    const links = Array.from({ length: 1_450 }, (_, index) => ({
      listing_id: `listing-${String(index).padStart(5, "0")}`,
      trait_id: TRAIT_ID,
    }));
    const supabase = createFakeSupabase({
      traits: [
        {
          id: TRAIT_ID,
          slug: "lilly-white",
          name_ko: "릴리화이트",
          name_en: "Lilly White",
          trait_type: "COLOR",
          aliases: [],
          is_filterable: true,
        },
      ],
      listing_traits: links,
      listings: Array.from({ length: 1_450 }, (_, index) => ({
        id: `listing-${String(index).padStart(5, "0")}`,
        platform_id: "platform-1",
        morph_id: MORPH_ID,
        original_title: `릴리화이트 ${index}`,
        original_url: `https://example.com/product/${index}`,
        image_url: null,
        current_price: 200_000 + index,
        price_type: "FIXED",
        currency: "KRW",
        sex: "UNKNOWN",
        weight_g: null,
        bundle_count: null,
        status: "ACTIVE",
        classification_source: "AUTO_KEYWORD",
        first_seen_at: "2026-11-01T00:00:00Z",
        last_seen_at: "2026-11-13T00:00:00Z",
        last_checked_at: "2026-11-13T00:00:00Z",
        sold_detected_at: null,
        raw_data: {},
        platform: {
          id: "platform-1",
          name: "키워",
          homepage_url: "https://kiwo.kr",
          collector_type: "AUTO_WEB",
          is_active: true,
        },
        listing_traits: [],
      })),
    });
    fake.current = supabase.client;

    const listings = await getComparableListingsByTraitSlug("lilly-white");

    expect(listings).toHaveLength(1_450);
    const linkRanges = supabase.rangeCalls.filter((call) => call.table === "listing_traits");
    expect(linkRanges.map(({ from, to }) => [from, to])).toEqual([
      [0, 999],
      [1_000, 1_999],
    ]);
    // 1,450 ids → 8 batches of 200 ids; filtering the fake by id keeps one
    // page (200 rows) per batch, so exactly 8 listing requests are needed.
    const listingRanges = supabase.rangeCalls.filter((call) => call.table === "listings");
    expect(listingRanges).toHaveLength(8);
    expect(listingRanges.every(({ from, to }) => from === 0 && to === 999)).toBe(true);
  });
});

describe("repository falls back to bundled mock data without credentials", () => {
  it("returns mock morphs when Supabase is not configured", async () => {
    const { getVisibleMorphs } = await import("@/lib/data/repository");
    fake.current = null;

    const morphs = await getVisibleMorphs();

    expect(morphs.length).toBeGreaterThan(0);
  });
});
