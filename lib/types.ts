export type CollectorType = "AUTO_WEB" | "MANUAL" | "BROWSER_HELPER" | "CSV_IMPORT";
export type PriceType = "FIXED" | "CONTACT" | "BUNDLE" | "AUCTION" | "UNKNOWN";
export type ListingStatus = "NEW" | "ACTIVE" | "SOLD" | "DELETED" | "STALE" | "UNKNOWN";
export type Sex = "MALE" | "FEMALE" | "UNKNOWN";

export interface Morph {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  aliases: string[];
  representativeImage: string;
  imagePosition: string;
  visibleOnHome: boolean;
  displayOrder: number;
  priority: number;
}

export interface Trait {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  traitType: "PATTERN_DETAIL" | "EXPRESSION" | "COLOR" | "SPOT_DETAIL" | "OTHER";
  aliases: string[];
  isFilterable: boolean;
}

export interface Platform {
  id: string;
  name: string;
  homepageUrl: string;
  collectorType: CollectorType;
  isActive: boolean;
}

export interface Listing {
  id: string;
  platform: Platform;
  externalId?: string;
  morphId?: string;
  originalTitle: string;
  originalDescription?: string;
  originalUrl: string;
  imageUrl?: string;
  imagePosition?: string;
  traits: Trait[];
  currentPrice?: number;
  priceType: PriceType;
  currency: "KRW";
  sex: Sex;
  weightG?: number;
  bundleCount?: number;
  status: ListingStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  lastCheckedAt: string;
  soldDetectedAt?: string;
  classificationSource: "AUTO_KEYWORD" | "MANUAL";
  rawData: unknown;
}

export interface PlatformComparison {
  platform: Platform;
  listing: Listing | null;
}

export interface MorphMarketSummary {
  morph: Morph;
  href: string;
  listingCount: number;
  platformCount: number;
  minPrice?: number;
  lowestListingImageUrl?: string;
  lowestListingTitle?: string;
}

export interface HomeMarketSnapshot {
  morphs: MorphMarketSummary[];
  totalListings: number;
  platformCount: number;
}

export type ShopLocationType = "STORE" | "SHOWROOM" | "PICKUP_POINT" | "BUSINESS_ADDRESS";
export type CoordinateAccuracy = "ROOFTOP" | "STREET" | "DISTRICT" | "UNVERIFIED";
export type VisitPolicy = "WALK_IN" | "APPOINTMENT" | "CONFIRM_REQUIRED";
export type InventoryScope = "PLATFORM_ONLINE" | "LOCATION_CONFIRMED";
export type FulfillmentMode =
  | "STORE_PICKUP"
  | "PARCEL"
  | "REGISTERED_MAIL"
  | "EXPRESS_BUS"
  | "QUICK"
  | "SPECIALIZED_COURIER";
export type FulfillmentAvailability = "AVAILABLE" | "NOT_AVAILABLE" | "CONFIRM_REQUIRED";
export type FulfillmentAppliesTo = "LIVE_ANIMAL" | "ALL_PRODUCTS" | "SUPPLIES_ONLY";

export interface FulfillmentOption {
  id: string;
  mode: FulfillmentMode;
  availability: FulfillmentAvailability;
  appliesTo: FulfillmentAppliesTo;
  summary: string;
  evidenceUrl: string;
  verifiedAt: string;
}

export interface NearbyInventoryPreview {
  id: string;
  title: string;
  price: number;
  originalUrl: string;
  morphName?: string;
  checkedAt: string;
}

export interface NearbyMorphCount {
  name: string;
  count: number;
}

export interface NearbyShopLocation {
  id: string;
  platform: Platform;
  name: string;
  locationType: ShopLocationType;
  roadAddress: string;
  regionLabel: string;
  latitude?: number;
  longitude?: number;
  coordinateAccuracy: CoordinateAccuracy;
  visitPolicy: VisitPolicy;
  inventoryScope: InventoryScope;
  evidenceUrl: string;
  verifiedAt: string;
  fulfillmentOptions: FulfillmentOption[];
  activeListingCount: number;
  minPrice?: number;
  morphCounts: NearbyMorphCount[];
  previewListings: NearbyInventoryPreview[];
}

export interface RawListingInput {
  title: string;
  description?: string;
  priceText?: string;
  platformId?: string;
}

export interface ParsedListing {
  normalizedText: string;
  morph?: Morph;
  traits: Trait[];
  sex: Sex;
  weightG?: number;
  price?: number;
  priceType: PriceType;
  bundleCount?: number;
}
