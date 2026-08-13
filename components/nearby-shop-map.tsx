"use client";

import { ExternalLink, LocateFixed, MapPin, Navigation, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CustomOverlayMap,
  Map,
  MarkerClusterer,
  MapTypeControl,
  ZoomControl,
  useKakaoLoader,
} from "react-kakao-maps-sdk";

import { formatKRW } from "@/lib/format";
import {
  dedupeKakaoPlaces,
  KAKAO_DISCOVERY_AREAS,
  KAKAO_PLACE_CACHE_KEY,
  KAKAO_PLACE_CACHE_TTL_MS,
  normalizeKakaoPlace,
  normalizeKakaoReferencePlace,
  type KakaoPlaceLocation,
  type KakaoReferenceLocation,
} from "@/lib/kakao-place-discovery";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
const KOREA_CENTER = { lat: 36.2, lng: 127.8 };
const REFERENCE_FOCUS_LEVEL = 4;
const KOREA_LIMITS = {
  south: 33,
  west: 124.8,
  north: 38.2,
  east: 130.2,
};
const GEOCODE_CACHE_KEY = "donawa:kakao-geocodes:v1";
const DISCOVERY_PAGE_LIMIT = 2;

interface MapPosition {
  lat: number;
  lng: number;
}

interface CachedPosition extends MapPosition {
  address: string;
}

export interface NearbyMapShop {
  id: string;
  name: string;
  platformName: string;
  homepageUrl?: string;
  roadAddress: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  activeListingCount: number;
  minPrice?: number;
  kakaoMapUrl: string;
  source: "VERIFIED" | "KAKAO";
}

export type KakaoPlaceSearchStatus = "idle" | "loading" | "ready" | "error";
export type KakaoLocationSearchStatus = "idle" | "loading" | "ready" | "not_found" | "error";

export interface NearbyMapReference extends KakaoReferenceLocation {
  kind: "GPS" | "SEARCH";
}

export interface NearbyLocationSearchRequest {
  id: number;
  query: string;
}

interface PositionedShop extends NearbyMapShop {
  position: MapPosition;
}

function readGeocodeCache(): Record<string, CachedPosition> {
  try {
    const raw = window.localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CachedPosition>;
  } catch {
    return {};
  }
}

function writeGeocodeCache(cache: Record<string, CachedPosition>) {
  try {
    window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // The map still works when storage is unavailable.
  }
}

function clampToKorea(map: kakao.maps.Map) {
  const center = map.getCenter();
  const lat = Math.min(KOREA_LIMITS.north, Math.max(KOREA_LIMITS.south, center.getLat()));
  const lng = Math.min(KOREA_LIMITS.east, Math.max(KOREA_LIMITS.west, center.getLng()));
  if (lat !== center.getLat() || lng !== center.getLng()) {
    map.panTo(new kakao.maps.LatLng(lat, lng));
  }
}

function fitShops(map: kakao.maps.Map, shops: PositionedShop[]) {
  const bounds = new kakao.maps.LatLngBounds();
  shops.forEach(({ position }) => {
    bounds.extend(new kakao.maps.LatLng(position.lat, position.lng));
  });
  map.setBounds(bounds, 72, 72, 170, 72);
  if (map.getLevel() > 12) map.setLevel(12);
}

interface PlaceCachePayload {
  checkedAt: number;
  places: KakaoPlaceLocation[];
}

function readPlaceCache(): KakaoPlaceLocation[] | undefined {
  try {
    const raw = window.localStorage.getItem(KAKAO_PLACE_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PlaceCachePayload;
    if (
      !Number.isFinite(parsed.checkedAt)
      || Date.now() - parsed.checkedAt > KAKAO_PLACE_CACHE_TTL_MS
      || !Array.isArray(parsed.places)
    ) return undefined;
    return parsed.places;
  } catch {
    return undefined;
  }
}

function writePlaceCache(places: KakaoPlaceLocation[]) {
  try {
    window.localStorage.setItem(KAKAO_PLACE_CACHE_KEY, JSON.stringify({
      checkedAt: Date.now(),
      places,
    } satisfies PlaceCachePayload));
  } catch {
    // Search results remain available in memory when storage is unavailable.
  }
}

function searchPlacePage(
  places: kakao.maps.services.Places,
  keyword: string,
  page: number,
): Promise<{ places: KakaoPlaceLocation[]; hasNextPage: boolean }> {
  return new Promise((resolve) => {
    places.keywordSearch(keyword, (results, status, pagination) => {
      if (status !== kakao.maps.services.Status.OK) {
        resolve({ places: [], hasNextPage: false });
        return;
      }
      resolve({
        places: results.flatMap((result) => {
          const normalized = normalizeKakaoPlace(result);
          return normalized ? [normalized] : [];
        }),
        hasNextPage: pagination.hasNextPage,
      });
    }, { size: 15, page });
  });
}

async function searchDiscoveryArea(
  places: kakao.maps.services.Places,
  area: string,
): Promise<KakaoPlaceLocation[]> {
  const keyword = `${area} 파충류샵`;
  const first = await searchPlacePage(places, keyword, 1);
  if (!first.hasNextPage || DISCOVERY_PAGE_LIMIT < 2) return first.places;
  const second = await searchPlacePage(places, keyword, 2);
  return [...first.places, ...second.places];
}

function geocodeAddress(
  geocoder: kakao.maps.services.Geocoder,
  address: string,
): Promise<MapPosition | undefined> {
  return new Promise((resolve) => {
    geocoder.addressSearch(address, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || result.length === 0) {
        resolve(undefined);
        return;
      }
      const lat = Number(result[0].y);
      const lng = Number(result[0].x);
      if (
        !Number.isFinite(lat)
        || !Number.isFinite(lng)
        || lat < KOREA_LIMITS.south
        || lat > KOREA_LIMITS.north
        || lng < KOREA_LIMITS.west
        || lng > KOREA_LIMITS.east
      ) {
        resolve(undefined);
        return;
      }
      resolve({ lat, lng });
    });
  });
}

function searchMapReference(
  places: kakao.maps.services.Places,
  geocoder: kakao.maps.services.Geocoder,
  query: string,
): Promise<KakaoReferenceLocation | undefined> {
  return new Promise((resolve) => {
    places.keywordSearch(query, (results, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const matched = results
          .map((result) => normalizeKakaoReferencePlace(result, query))
          .find((result) => result !== undefined);
        if (matched) {
          resolve(matched);
          return;
        }
      }

      geocoder.addressSearch(query, (results, addressStatus) => {
        if (addressStatus !== kakao.maps.services.Status.OK || results.length === 0) {
          resolve(undefined);
          return;
        }
        const result = results[0];
        resolve(normalizeKakaoReferencePlace({
          id: "",
          place_name: query,
          category_name: "",
          address_name: result.address_name,
          road_address_name: result.road_address?.address_name ?? "",
          x: result.x,
          y: result.y,
          place_url: "",
        }, query));
      });
    }, { size: 10 });
  });
}

function KakaoShopMap({
  shops,
  referenceLocation,
  locationSearchRequest,
  selectedShopId,
  onSelectShop,
  onPlacesDiscovered,
  onPlaceSearchStatusChange,
  onLocationSearchResolved,
  onLocationSearchStatusChange,
}: {
  shops: NearbyMapShop[];
  referenceLocation?: NearbyMapReference;
  locationSearchRequest?: NearbyLocationSearchRequest;
  selectedShopId?: string;
  onSelectShop: (shopId: string) => void;
  onPlacesDiscovered: (places: KakaoPlaceLocation[]) => void;
  onPlaceSearchStatusChange: (status: KakaoPlaceSearchStatus) => void;
  onLocationSearchResolved: (location: KakaoReferenceLocation) => void;
  onLocationSearchStatusChange: (status: KakaoLocationSearchStatus) => void;
}) {
  const [loading, loadError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY!,
    libraries: ["services", "clusterer"],
  });
  const [map, setMap] = useState<kakao.maps.Map>();
  const [geocoded, setGeocoded] = useState<Record<string, MapPosition>>({});
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (loading || loadError || !window.kakao?.maps?.services) return;
    let cancelled = false;

    async function discoverPlaces() {
      const cached = readPlaceCache();
      if (cached) {
        onPlacesDiscovered(cached);
        onPlaceSearchStatusChange("ready");
        return;
      }

      onPlaceSearchStatusChange("loading");
      try {
        const searcher = new kakao.maps.services.Places();
        const discovered: KakaoPlaceLocation[] = [];
        for (let index = 0; index < KAKAO_DISCOVERY_AREAS.length; index += 5) {
          const batch = await Promise.all(
            KAKAO_DISCOVERY_AREAS.slice(index, index + 5)
              .map((area) => searchDiscoveryArea(searcher, area)),
          );
          if (cancelled) return;
          batch.forEach((items) => discovered.push(...items));
        }
        const unique = dedupeKakaoPlaces(discovered);
        writePlaceCache(unique);
        onPlacesDiscovered(unique);
        onPlaceSearchStatusChange("ready");
      } catch {
        if (!cancelled) onPlaceSearchStatusChange("error");
      }
    }

    void discoverPlaces();
    return () => {
      cancelled = true;
    };
  }, [loadError, loading, onPlaceSearchStatusChange, onPlacesDiscovered]);

  useEffect(() => {
    if (
      !locationSearchRequest
      || loading
      || loadError
      || !window.kakao?.maps?.services
    ) return;
    let cancelled = false;

    async function findLocation() {
      onLocationSearchStatusChange("loading");
      try {
        const matched = await searchMapReference(
          new kakao.maps.services.Places(),
          new kakao.maps.services.Geocoder(),
          locationSearchRequest!.query,
        );
        if (cancelled) return;
        if (!matched) {
          onLocationSearchStatusChange("not_found");
          return;
        }
        onLocationSearchResolved(matched);
        onLocationSearchStatusChange("ready");
      } catch {
        if (!cancelled) onLocationSearchStatusChange("error");
      }
    }

    void findLocation();
    return () => {
      cancelled = true;
    };
  }, [
    loadError,
    loading,
    locationSearchRequest,
    onLocationSearchResolved,
    onLocationSearchStatusChange,
  ]);

  useEffect(() => {
    if (loading || loadError || !window.kakao?.maps?.services) return;
    let cancelled = false;

    async function resolveMissingCoordinates() {
      const cache = readGeocodeCache();
      const resolved: Record<string, MapPosition> = {};
      const missing: NearbyMapShop[] = [];

      shops.forEach((shop) => {
        if (shop.latitude !== undefined && shop.longitude !== undefined) return;
        const cached = cache[shop.id];
        if (cached?.address === shop.roadAddress) {
          resolved[shop.id] = { lat: cached.lat, lng: cached.lng };
        } else {
          missing.push(shop);
        }
      });

      if (missing.length > 0) setGeocoding(true);
      const geocoder = new kakao.maps.services.Geocoder();
      for (const shop of missing) {
        if (cancelled) return;
        const position = await geocodeAddress(geocoder, shop.roadAddress);
        if (!position) continue;
        resolved[shop.id] = position;
        cache[shop.id] = { ...position, address: shop.roadAddress };
      }

      if (cancelled) return;
      writeGeocodeCache(cache);
      setGeocoded((current) => ({ ...current, ...resolved }));
      setGeocoding(false);
    }

    void resolveMissingCoordinates();
    return () => {
      cancelled = true;
    };
  }, [loadError, loading, shops]);

  const positionedShops = useMemo<PositionedShop[]>(
    () => shops.flatMap((shop) => {
      const position = shop.latitude !== undefined && shop.longitude !== undefined
        ? { lat: shop.latitude, lng: shop.longitude }
        : geocoded[shop.id];
      return position ? [{ ...shop, position }] : [];
    }),
    [geocoded, shops],
  );

  const selectedShop = useMemo(
    () => shops.find(({ id }) => id === selectedShopId),
    [selectedShopId, shops],
  );
  const selectedPosition = useMemo(
    () => positionedShops.find(({ id }) => id === selectedShopId)?.position,
    [positionedShops, selectedShopId],
  );

  const resetMap = useCallback(() => {
    if (!map) return;
    if (positionedShops.length > 0 && positionedShops.length < 100) {
      fitShops(map, positionedShops);
    } else {
      map.setCenter(new kakao.maps.LatLng(KOREA_CENTER.lat, KOREA_CENTER.lng));
      map.setLevel(12);
    }
  }, [map, positionedShops]);

  useEffect(() => {
    if (!map || referenceLocation) return;
    resetMap();
  }, [map, positionedShops.length, referenceLocation, resetMap]);

  useEffect(() => {
    if (!map || !selectedPosition) return;
    map.panTo(new kakao.maps.LatLng(selectedPosition.lat, selectedPosition.lng));
    if (map.getLevel() > 6) map.setLevel(6, { animate: true });
  }, [map, selectedPosition]);

  useEffect(() => {
    if (!map || !referenceLocation) return;
    const focus = new kakao.maps.LatLng(
      referenceLocation.point.latitude,
      referenceLocation.point.longitude,
    );
    map.setCenter(focus);
    map.setLevel(REFERENCE_FOCUS_LEVEL, { anchor: focus });
  }, [map, referenceLocation]);

  if (loadError) {
    return (
      <div className="nearby-map-loading nearby-map-loading--error" role="status">
        <MapPin size={22} aria-hidden="true" />
        <strong>카카오 지도를 불러오지 못했습니다</strong>
        <small>키와 JavaScript SDK 도메인을 확인해 주세요</small>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nearby-map-loading" role="status">
        <MapPin size={22} aria-hidden="true" />
        <strong>카카오 지도 로딩</strong>
      </div>
    );
  }

  return (
    <>
      <Map
        className="nearby-map-canvas"
        center={KOREA_CENTER}
        level={12}
        minLevel={12}
        maxLevel={3}
        keyboardShortcuts
        onCreate={setMap}
        onDragEnd={clampToKorea}
        onIdle={clampToKorea}
        aria-label="전국 파충류 판매처 카카오 지도"
      >
        <MapTypeControl position="TOPRIGHT" />
        <ZoomControl position="RIGHT" />

        {referenceLocation && (
          <CustomOverlayMap
            position={{
              lat: referenceLocation.point.latitude,
              lng: referenceLocation.point.longitude,
            }}
            yAnchor={0.5}
            zIndex={9}
          >
            <span className="donawa-map-reference" aria-label={referenceLocation.label}>
              <span />
              <strong>{referenceLocation.label}</strong>
            </span>
          </CustomOverlayMap>
        )}

        <MarkerClusterer
          averageCenter
          minLevel={7}
          minClusterSize={3}
          gridSize={56}
          styles={[{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "#20251f",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "900",
            border: "3px solid #fff",
            boxShadow: "0 5px 14px rgb(26 36 45 / 25%)",
          }]}
        >
          {positionedShops.map((shop) => (
            <CustomOverlayMap
              position={shop.position}
              clickable
              yAnchor={1}
              zIndex={shop.id === selectedShopId ? 8 : 4}
              key={shop.id}
            >
              <button
                type="button"
                className={`donawa-map-marker${shop.id === selectedShopId ? " is-active" : ""}`}
                aria-label={`${shop.name} 지도에서 선택`}
                onClick={() => onSelectShop(shop.id)}
              >
                <span aria-hidden="true" />
              </button>
            </CustomOverlayMap>
          ))}
        </MarkerClusterer>
      </Map>

      {referenceLocation && (
        <div className="nearby-map-location-pill">
          {referenceLocation.kind === "GPS"
            ? <LocateFixed size={16} aria-hidden="true" />
            : <MapPin size={16} aria-hidden="true" />}
          <span>{referenceLocation.label} 기준</span>
        </div>
      )}
      <button className="nearby-map-reset" type="button" onClick={resetMap}>
        전국
      </button>
      {geocoding && (
        <span className="nearby-map-geocoding" role="status">주소 확인 중</span>
      )}

      {selectedShop && (
        <article className="nearby-map-selected" aria-live="polite">
          <span className="nearby-map-selected__icon"><Store size={18} aria-hidden="true" /></span>
          <div>
            <h3>{selectedShop.name}</h3>
            <p>{selectedShop.roadAddress}</p>
            <div className="nearby-map-selected__facts">
              {selectedShop.distance !== undefined && (
                <span><Navigation size={12} aria-hidden="true" /> 직선 {selectedShop.distance < 10 ? `${selectedShop.distance.toFixed(1)}km` : `${Math.round(selectedShop.distance)}km`}</span>
              )}
              <span>{selectedShop.source === "KAKAO" ? "카카오 지도검색" : selectedShop.activeListingCount > 0 ? `매물 ${selectedShop.activeListingCount}` : "가격 미연동"}</span>
              {selectedShop.minPrice !== undefined && <strong>최저 {formatKRW(selectedShop.minPrice)}</strong>}
            </div>
          </div>
          <div className="nearby-map-selected__actions">
            <a href={selectedShop.kakaoMapUrl} target="_blank" rel="noreferrer">
              카카오맵 <ExternalLink size={12} aria-hidden="true" />
            </a>
            {selectedShop.homepageUrl && (
              <a href={selectedShop.homepageUrl} target="_blank" rel="noreferrer">
                판매처 <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
          </div>
        </article>
      )}
    </>
  );
}

export function NearbyShopMap({
  shops,
  referenceLocation,
  locationSearchRequest,
  selectedShopId,
  onSelectShop,
  onPlacesDiscovered,
  onPlaceSearchStatusChange,
  onLocationSearchResolved,
  onLocationSearchStatusChange,
}: {
  shops: NearbyMapShop[];
  referenceLocation?: NearbyMapReference;
  locationSearchRequest?: NearbyLocationSearchRequest;
  selectedShopId?: string;
  onSelectShop: (shopId: string) => void;
  onPlacesDiscovered: (places: KakaoPlaceLocation[]) => void;
  onPlaceSearchStatusChange: (status: KakaoPlaceSearchStatus) => void;
  onLocationSearchResolved: (location: KakaoReferenceLocation) => void;
  onLocationSearchStatusChange: (status: KakaoLocationSearchStatus) => void;
}) {
  return (
    <section className="nearby-map-panel" id="nearby-map" aria-label="판매처 지도">
      <div className="nearby-map-stage">
        {KAKAO_APP_KEY ? (
          <KakaoShopMap
            shops={shops}
            referenceLocation={referenceLocation}
            locationSearchRequest={locationSearchRequest}
            selectedShopId={selectedShopId}
            onSelectShop={onSelectShop}
            onPlacesDiscovered={onPlacesDiscovered}
            onPlaceSearchStatusChange={onPlaceSearchStatusChange}
            onLocationSearchResolved={onLocationSearchResolved}
            onLocationSearchStatusChange={onLocationSearchStatusChange}
          />
        ) : (
          <div className="nearby-map-loading nearby-map-loading--config" role="status">
            <MapPin size={22} aria-hidden="true" />
            <strong>카카오 지도 키가 필요합니다</strong>
            <small>NEXT_PUBLIC_KAKAO_MAP_APP_KEY</small>
          </div>
        )}
      </div>
    </section>
  );
}
