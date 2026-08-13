import { cache } from "react";

import type { Database, Json } from "@/lib/database.types";
import { buildTraitSubject } from "@/lib/data/catalog-traits";
import { selectMidMarketHomeImage } from "@/lib/data/home-market";
import { listings as mockListings } from "@/lib/data/listings";
import { morphs as mockMorphs } from "@/lib/data/morphs";
import { platforms as mockPlatforms } from "@/lib/data/platforms";
import { traits as mockTraits } from "@/lib/data/traits";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  CollectorType,
  Listing,
  ListingStatus,
  Morph,
  HomeMarketSnapshot,
  CoordinateAccuracy,
  FulfillmentAppliesTo,
  FulfillmentAvailability,
  FulfillmentMode,
  FulfillmentOption,
  InventoryScope,
  Platform,
  PlatformComparison,
  PriceType,
  NearbyShopLocation,
  Sex,
  ShopLocationType,
  Trait,
  VisitPolicy,
} from "@/lib/types";

type MorphRow = Database["public"]["Tables"]["morphs"]["Row"];
type PlatformRow = Database["public"]["Tables"]["platforms"]["Row"];
type TraitRow = Database["public"]["Tables"]["traits"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ShopLocationRow = Database["public"]["Tables"]["shop_locations"]["Row"];
type FulfillmentRow = Database["public"]["Tables"]["platform_fulfillment_options"]["Row"];
type ListingJoinRow = ListingRow & {
  platform: PlatformRow;
  listing_traits: Array<{ source_text: string | null; trait: TraitRow }>;
};
type ShopLocationJoinRow = ShopLocationRow & { platform: PlatformRow };
type NearbyListingRow = {
  id: string;
  platform_id: string;
  original_title: string;
  original_url: string;
  current_price: number;
  last_checked_at: string;
  morph: { name_ko: string } | null;
};
type MarketListingRow = {
  id: string;
  morph_id: string | null;
  current_price: number | null;
  image_url: string | null;
  original_title: string;
  platform: { id: string; is_active: boolean } | null;
  listing_traits: Array<{ trait: { slug: string } | null }>;
};

const fallbackMorphBySlug = new Map(mockMorphs.map((morph) => [morph.slug, morph]));

function aliases(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapMorph(row: MorphRow): Morph {
  const fallback = fallbackMorphBySlug.get(row.slug);

  return {
    id: row.id,
    slug: row.slug,
    nameKo: row.name_ko,
    nameEn: row.name_en ?? row.name_ko,
    aliases: aliases(row.aliases),
    // Curated local assets are reviewed and versioned with the UI. Keep them ahead
    // of stale seed values that may still exist in a connected Supabase project.
    representativeImage:
      fallback?.representativeImage ?? row.representative_image ?? "/geckos/gecko-1.jpg",
    imagePosition: fallback?.imagePosition ?? "center",
    visibleOnHome: row.visible_on_home,
    displayOrder: row.display_order,
    priority: row.display_order,
  };
}

function mapPlatform(row: PlatformRow): Platform {
  return {
    id: row.id,
    name: row.name,
    homepageUrl: row.homepage_url,
    collectorType: row.collector_type as CollectorType,
    isActive: row.is_active,
  };
}

function mapTrait(row: TraitRow): Trait {
  return {
    id: row.id,
    slug: row.slug,
    nameKo: row.name_ko,
    nameEn: row.name_en ?? row.name_ko,
    traitType: row.trait_type as Trait["traitType"],
    aliases: aliases(row.aliases),
    isFilterable: row.is_filterable,
  };
}

function mapListing(row: ListingJoinRow): Listing {
  return {
    id: row.id,
    platform: mapPlatform(row.platform),
    externalId: row.external_id ?? undefined,
    morphId: row.morph_id ?? undefined,
    originalTitle: row.original_title,
    originalDescription: row.original_description ?? undefined,
    originalUrl: row.original_url,
    imageUrl: row.image_url ?? undefined,
    traits: row.listing_traits.map(({ trait }) => mapTrait(trait)),
    currentPrice: row.current_price ?? undefined,
    priceType: row.price_type as PriceType,
    currency: "KRW",
    sex: row.sex as Sex,
    weightG: row.weight_g ?? undefined,
    bundleCount: row.bundle_count ?? undefined,
    status: row.status as ListingStatus,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastCheckedAt: row.last_checked_at,
    soldDetectedAt: row.sold_detected_at ?? undefined,
    classificationSource: row.classification_source as Listing["classificationSource"],
    rawData: row.raw_data,
  };
}

export function filterComparableListings(
  source: Listing[],
  morphId: string,
): Listing[] {
  return source
    .filter(
      (listing) =>
        listing.morphId === morphId &&
        listing.status === "ACTIVE" &&
        listing.priceType === "FIXED" &&
        listing.currentPrice !== undefined,
    )
    .sort((a, b) => a.currentPrice! - b.currentPrice!);
}

export function buildPlatformComparisons(
  sourcePlatforms: Platform[],
  sourceListings: Listing[],
  morphId: string,
): PlatformComparison[] {
  const comparable = filterComparableListings(sourceListings, morphId);

  return buildPopulationPlatformComparisons(sourcePlatforms, comparable);
}

export function buildPopulationPlatformComparisons(
  sourcePlatforms: Platform[],
  comparable: Listing[],
): PlatformComparison[] {
  return sourcePlatforms
    .filter((platform) => platform.isActive)
    .map((platform) => ({
      platform,
      listing:
        comparable.find((listing) => listing.platform.id === platform.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.listing && b.listing) {
        return (
          a.listing.currentPrice! - b.listing.currentPrice! ||
          a.platform.name.localeCompare(b.platform.name, "ko")
        );
      }

      if (a.listing) return -1;
      if (b.listing) return 1;
      return a.platform.name.localeCompare(b.platform.name, "ko");
    });
}

export const getVisibleMorphs = cache(async (): Promise<Morph[]> => {
  const client = getSupabaseClient();
  if (!client) {
    return mockMorphs
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const { data, error } = await client
    .from("morphs")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw new Error(`모프 목록을 불러오지 못했습니다: ${error.message}`);
  return data.map(mapMorph);
});

export const getFilterableTraits = cache(async (): Promise<Trait[]> => {
  const client = getSupabaseClient();
  if (!client) {
    return mockTraits
      .filter((trait) => trait.isFilterable)
      .sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));
  }

  const { data, error } = await client
    .from("traits")
    .select("*")
    .eq("is_filterable", true)
    .order("name_ko", { ascending: true });

  if (error) throw new Error(`모프 키워드를 불러오지 못했습니다: ${error.message}`);
  return data.map(mapTrait);
});

export const getHomeMarketSnapshot = cache(async (): Promise<HomeMarketSnapshot> => {
  const [morphs, keywordTraits] = await Promise.all([
    getVisibleMorphs(),
    getFilterableTraits(),
  ]);
  const client = getSupabaseClient();
  const keywordTraitSlugs = new Set(keywordTraits.map(({ slug }) => slug));
  const morphIds = new Set(morphs.map(({ id }) => id));

  const source = client
    ? await (async () => {
        const { data, error } = await client
          .from("listings")
          .select(`
            id,
            morph_id,
            current_price,
            image_url,
            original_title,
            platform:platforms!listings_platform_id_fkey(id, is_active),
            listing_traits(
              trait:traits!listing_traits_trait_id_fkey(slug)
            )
          `)
          .eq("status", "ACTIVE")
          .eq("price_type", "FIXED")
          .not("current_price", "is", null);

        if (error) {
          throw new Error(`홈 가격 요약을 불러오지 못했습니다: ${error.message}`);
        }

        return data as unknown as MarketListingRow[];
      })()
    : mockListings
        .filter(
          (listing) =>
            listing.status === "ACTIVE" &&
            listing.priceType === "FIXED" &&
            listing.currentPrice !== undefined,
        )
        .map((listing) => ({
          id: listing.id,
          morph_id: listing.morphId ?? null,
          current_price: listing.currentPrice ?? null,
          image_url: listing.imageUrl ?? null,
          original_title: listing.originalTitle,
          platform: {
            id: listing.platform.id,
            is_active: listing.platform.isActive,
          },
          listing_traits: listing.traits.map((trait) => ({
            trait: { slug: trait.slug },
          })),
        }));

  const comparable = source.filter(
    (row) =>
      row.current_price !== null &&
      row.platform?.is_active &&
      (
        (row.morph_id !== null && morphIds.has(row.morph_id)) ||
        row.listing_traits.some(({ trait }) =>
          trait ? keywordTraitSlugs.has(trait.slug) : false,
        )
      ),
  );
  const platformIds = new Set(comparable.map((row) => row.platform!.id));
  const categoryPools = [
    ...morphs.map((morph) => {
      const listings = comparable.filter((row) => row.morph_id === morph.id);

      return {
        morph,
        trait: undefined as Trait | undefined,
        href: `/morph/${morph.slug}`,
        listings,
      };
    }),
    ...keywordTraits.map((trait) => {
      const listings = comparable.filter((row) =>
        row.listing_traits.some(
          ({ trait: listingTrait }) => listingTrait?.slug === trait.slug,
        ),
      );
      const fallbackMorph = morphs.find(({ id }) => id === listings[0]?.morph_id);

      return {
        morph: buildTraitSubject(trait, fallbackMorph?.representativeImage),
        trait,
        href: `/trait/${trait.slug}`,
        listings,
      };
    }),
  ].sort(
    (a, b) =>
      b.listings.length - a.listings.length ||
      a.morph.nameKo.localeCompare(b.morph.nameKo, "ko"),
  );
  const usedRepresentativeListingIds = new Set<string>();
  const usedRepresentativeImageUrls = new Set<string>();
  const summaries = categoryPools.map((pool) => {
    const candidates = pool.listings.map((row) => ({
      id: row.id,
      currentPrice: row.current_price!,
      imageUrl: row.image_url,
      originalTitle: row.original_title,
      morphId: row.morph_id,
    }));
    const representativeListing = selectMidMarketHomeImage(
      candidates,
      usedRepresentativeListingIds,
      usedRepresentativeImageUrls,
    );

    if (representativeListing) {
      usedRepresentativeListingIds.add(representativeListing.id);
      usedRepresentativeImageUrls.add(representativeListing.imageUrl!.trim());
    }

    const representativeMorph = morphs.find(
      ({ id }) => id === representativeListing?.morphId,
    );
    const morph = pool.trait
      ? buildTraitSubject(pool.trait, representativeMorph?.representativeImage)
      : pool.morph;
    const minPrice = candidates.length
      ? Math.min(...candidates.map(({ currentPrice }) => currentPrice))
      : undefined;

    return {
      morph,
      href: pool.href,
      listingCount: pool.listings.length,
      platformCount: new Set(pool.listings.map((row) => row.platform!.id)).size,
      minPrice,
      representativeListingImageUrl:
        representativeListing?.imageUrl?.trim() || undefined,
      representativeListingTitle: representativeListing?.originalTitle,
      representativeListingPrice: representativeListing?.currentPrice,
    };
  });

  return {
    morphs: summaries,
    totalListings: comparable.length,
    platformCount: platformIds.size,
  };
});

export const getMorphBySlug = cache(async (slug: string): Promise<Morph | undefined> => {
  const client = getSupabaseClient();
  if (!client) return mockMorphs.find((morph) => morph.slug === slug);

  const { data, error } = await client
    .from("morphs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`모프를 불러오지 못했습니다: ${error.message}`);
  return data ? mapMorph(data) : undefined;
});

export const getMorphById = cache(async (id: string): Promise<Morph | undefined> => {
  const client = getSupabaseClient();
  if (!client) return mockMorphs.find((morph) => morph.id === id);

  const { data, error } = await client
    .from("morphs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`모프를 불러오지 못했습니다: ${error.message}`);
  return data ? mapMorph(data) : undefined;
});

export const getComparableListings = cache(async (morphId: string): Promise<Listing[]> => {
  const client = getSupabaseClient();
  if (!client) return filterComparableListings(mockListings, morphId);

  const { data, error } = await client
    .from("listings")
    .select(`
      *,
      platform:platforms!listings_platform_id_fkey(*),
      listing_traits(
        source_text,
        trait:traits!listing_traits_trait_id_fkey(*)
      )
    `)
    .eq("morph_id", morphId)
    .eq("status", "ACTIVE")
    .eq("price_type", "FIXED")
    .not("current_price", "is", null)
    .order("current_price", { ascending: true });

  if (error) throw new Error(`현재 매물을 불러오지 못했습니다: ${error.message}`);
  return (data as unknown as ListingJoinRow[]).map(mapListing);
});

export const getTraitBySlug = cache(async (slug: string): Promise<Trait | undefined> => {
  const client = getSupabaseClient();
  if (!client) return mockTraits.find((trait) => trait.slug === slug);

  const { data, error } = await client
    .from("traits")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`특성을 불러오지 못했습니다: ${error.message}`);
  return data ? mapTrait(data) : undefined;
});

export const getComparableListingsByTraitSlug = cache(
  async (traitSlug: string): Promise<Listing[]> => {
    const client = getSupabaseClient();
    if (!client) {
      return mockListings
        .filter(
          (listing) =>
            listing.traits.some((trait) => trait.slug === traitSlug) &&
            listing.status === "ACTIVE" &&
            listing.priceType === "FIXED" &&
            listing.currentPrice !== undefined,
        )
        .sort((a, b) => a.currentPrice! - b.currentPrice!);
    }

    const trait = await getTraitBySlug(traitSlug);
    if (!trait) return [];

    const { data: links, error: linksError } = await client
      .from("listing_traits")
      .select("listing_id")
      .eq("trait_id", trait.id);

    if (linksError) {
      throw new Error(`특성 매물 연결을 불러오지 못했습니다: ${linksError.message}`);
    }

    const listingIds = [...new Set(links.map(({ listing_id }) => listing_id))];
    if (listingIds.length === 0) return [];

    const { data, error } = await client
      .from("listings")
      .select(`
        *,
        platform:platforms!listings_platform_id_fkey(*),
        listing_traits(
          source_text,
          trait:traits!listing_traits_trait_id_fkey(*)
        )
      `)
      .in("id", listingIds)
      .eq("status", "ACTIVE")
      .eq("price_type", "FIXED")
      .not("current_price", "is", null)
      .order("current_price", { ascending: true });

    if (error) throw new Error(`특성별 현재 매물을 불러오지 못했습니다: ${error.message}`);
    return (data as unknown as ListingJoinRow[]).map(mapListing);
  },
);

export const getAllPlatforms = cache(async (): Promise<Platform[]> => {
  const client = getSupabaseClient();
  if (!client) return mockPlatforms;

  const { data, error } = await client
    .from("platforms")
    .select("*")
    .neq("name", "모프하우스")
    .order("name", { ascending: true });

  if (error) throw new Error(`플랫폼을 불러오지 못했습니다: ${error.message}`);
  return data.map(mapPlatform);
});

const getActivePlatforms = cache(async (): Promise<Platform[]> =>
  (await getAllPlatforms()).filter((platform) => platform.isActive));

export const getPlatformComparisons = cache(
  async (morphId: string): Promise<PlatformComparison[]> => {
    const [sourcePlatforms, sourceListings] = await Promise.all([
      getActivePlatforms(),
      getComparableListings(morphId),
    ]);

    return buildPlatformComparisons(sourcePlatforms, sourceListings, morphId);
  },
);

export const getPlatformComparisonsByTraitSlug = cache(
  async (traitSlug: string): Promise<PlatformComparison[]> => {
    const [sourcePlatforms, sourceListings] = await Promise.all([
      getActivePlatforms(),
      getComparableListingsByTraitSlug(traitSlug),
    ]);

    return buildPopulationPlatformComparisons(sourcePlatforms, sourceListings);
  },
);

function mapFulfillmentOption(row: FulfillmentRow): FulfillmentOption {
  return {
    id: row.id,
    mode: row.mode as FulfillmentMode,
    availability: row.availability as FulfillmentAvailability,
    appliesTo: row.applies_to as FulfillmentAppliesTo,
    summary: row.summary,
    evidenceUrl: row.evidence_url,
    verifiedAt: row.verified_at,
  };
}

export const getNearbyShopLocations = cache(async (): Promise<NearbyShopLocation[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: locationData, error: locationError } = await client
    .from("shop_locations")
    .select(`
      *,
      platform:platforms!shop_locations_platform_id_fkey(*)
    `)
    .eq("is_active", true)
    .order("region_label", { ascending: true })
    .order("name", { ascending: true });

  if (locationError) {
    throw new Error(`매장 위치를 불러오지 못했습니다: ${locationError.message}`);
  }
  const locations = locationData as unknown as ShopLocationJoinRow[];
  const platformIds = [...new Set(locations.map(({ platform_id }) => platform_id))];
  if (platformIds.length === 0) return [];

  const [{ data: fulfillmentData, error: fulfillmentError }, {
    data: listingData,
    error: listingError,
  }] = await Promise.all([
    client
      .from("platform_fulfillment_options")
      .select("*")
      .in("platform_id", platformIds),
    client
      .from("listings")
      .select(`
        id,
        platform_id,
        original_title,
        original_url,
        current_price,
        last_checked_at,
        morph:morphs!listings_morph_id_fkey(name_ko)
      `)
      .in("platform_id", platformIds)
      .eq("status", "ACTIVE")
      .eq("price_type", "FIXED")
      .not("current_price", "is", null)
      .order("current_price", { ascending: true }),
  ]);
  if (fulfillmentError) {
    throw new Error(`배송 정책을 불러오지 못했습니다: ${fulfillmentError.message}`);
  }
  if (listingError) {
    throw new Error(`매장별 현재 매물을 불러오지 못했습니다: ${listingError.message}`);
  }

  const fulfillmentByPlatform = new Map<string, FulfillmentOption[]>();
  for (const row of fulfillmentData as FulfillmentRow[]) {
    const options = fulfillmentByPlatform.get(row.platform_id) ?? [];
    options.push(mapFulfillmentOption(row));
    fulfillmentByPlatform.set(row.platform_id, options);
  }
  const fulfillmentOrder: Record<FulfillmentAvailability, number> = {
    AVAILABLE: 0,
    CONFIRM_REQUIRED: 1,
    NOT_AVAILABLE: 2,
  };
  for (const options of fulfillmentByPlatform.values()) {
    options.sort((left, right) =>
      fulfillmentOrder[left.availability] - fulfillmentOrder[right.availability] ||
      left.mode.localeCompare(right.mode));
  }

  const listingsByPlatform = new Map<string, NearbyListingRow[]>();
  for (const row of listingData as unknown as NearbyListingRow[]) {
    const listings = listingsByPlatform.get(row.platform_id) ?? [];
    listings.push(row);
    listingsByPlatform.set(row.platform_id, listings);
  }

  return locations.map((row) => {
    const listings = listingsByPlatform.get(row.platform_id) ?? [];
    const morphCountMap = new Map<string, number>();
    for (const listing of listings) {
      const name = listing.morph?.name_ko ?? "분류 검토 중";
      morphCountMap.set(name, (morphCountMap.get(name) ?? 0) + 1);
    }

    return {
      id: row.id,
      platform: mapPlatform(row.platform),
      name: row.name,
      locationType: row.location_type as ShopLocationType,
      roadAddress: row.road_address,
      regionLabel: row.region_label,
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined,
      coordinateAccuracy: row.coordinate_accuracy as CoordinateAccuracy,
      visitPolicy: row.visit_policy as VisitPolicy,
      inventoryScope: row.inventory_scope as InventoryScope,
      evidenceUrl: row.evidence_url,
      verifiedAt: row.verified_at,
      fulfillmentOptions: fulfillmentByPlatform.get(row.platform_id) ?? [],
      activeListingCount: listings.length,
      minPrice: listings[0]?.current_price,
      morphCounts: [...morphCountMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ko"))
        .slice(0, 6),
      previewListings: listings.slice(0, 3).map((listing) => ({
        id: listing.id,
        title: listing.original_title,
        price: listing.current_price,
        originalUrl: listing.original_url,
        morphName: listing.morph?.name_ko,
        checkedAt: listing.last_checked_at,
      })),
    } satisfies NearbyShopLocation;
  }).sort((left, right) =>
    right.activeListingCount - left.activeListingCount ||
    left.name.localeCompare(right.name, "ko"));
});
