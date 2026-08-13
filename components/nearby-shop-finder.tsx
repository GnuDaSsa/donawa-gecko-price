"use client";

import {
  BusFront,
  ChevronDown,
  ExternalLink,
  LocateFixed,
  MapPin,
  Package,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import type {
  KakaoLocationSearchStatus,
  KakaoPlaceSearchStatus,
  NearbyLocationSearchRequest,
  NearbyMapReference,
  NearbyMapShop,
} from "@/components/nearby-shop-map";
import { formatKRW } from "@/lib/format";
import { buildKakaoMapUrl, formatDistanceKm, isValidGeoPoint } from "@/lib/geo";
import {
  filterKakaoPlaces,
  isDuplicateOfVerifiedShop,
  KOREA_REGION_OPTIONS,
  type KakaoPlaceLocation,
  type KakaoReferenceLocation,
} from "@/lib/kakao-place-discovery";
import {
  filterNearbyShops,
  getNearbyRegions,
  type NearbyInventoryFilter,
} from "@/lib/nearby-shops";
import type { FulfillmentMode, NearbyShopLocation } from "@/lib/types";

const NearbyShopMap = dynamic(
  () => import("@/components/nearby-shop-map").then((module) => module.NearbyShopMap),
  {
    ssr: false,
    loading: () => (
      <section className="nearby-map-panel" aria-label="매장 지도 준비 중">
        <div className="nearby-map-stage">
          <div className="nearby-map-loading" role="status">
            <MapPin size={22} aria-hidden="true" />
            <strong>지도 로딩</strong>
          </div>
        </div>
      </section>
    ),
  },
);

const inventoryFilters: Array<{ value: NearbyInventoryFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "WITH_LISTINGS", label: "매물 연결" },
  { value: "LOCATION_ONLY", label: "가격 미연동" },
];

const INITIAL_RESULT_LIMIT = 120;
const RESULT_PAGE_SIZE = 120;

type GeolocationStatus = "idle" | "requesting" | "active" | "denied" | "error" | "unsupported";

type DirectoryResult =
  | {
      source: "VERIFIED";
      id: string;
      name: string;
      roadAddress: string;
      regionLabel: string;
      latitude?: number;
      longitude?: number;
      distance?: number;
      shop: NearbyShopLocation;
    }
  | {
      source: "KAKAO";
      id: string;
      name: string;
      roadAddress: string;
      regionLabel: string;
      latitude: number;
      longitude: number;
      distance?: number;
      place: KakaoPlaceLocation;
    };

const modeLabels: Partial<Record<FulfillmentMode, string>> = {
  STORE_PICKUP: "방문수령",
  PARCEL: "택배",
  REGISTERED_MAIL: "등기",
  EXPRESS_BUS: "고속택배",
  QUICK: "퀵",
  SPECIALIZED_COURIER: "전문배송",
};

function ModeIcon({ mode }: { mode: FulfillmentMode }) {
  if (mode === "EXPRESS_BUS") return <BusFront size={13} aria-hidden="true" />;
  if (mode === "STORE_PICKUP") return <Store size={13} aria-hidden="true" />;
  if (mode === "PARCEL" || mode === "REGISTERED_MAIL") {
    return <Package size={13} aria-hidden="true" />;
  }
  return <Truck size={13} aria-hidden="true" />;
}

function locationLabel(shop: NearbyShopLocation): string {
  if (shop.locationType === "BUSINESS_ADDRESS") return "사업장 주소";
  if (shop.locationType === "PICKUP_POINT") return "픽업 지점";
  if (shop.locationType === "SHOWROOM") return "쇼룸";
  return "매장";
}

export function NearbyShopFinder({ shops }: { shops: NearbyShopLocation[] }) {
  const [query, setQuery] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [region, setRegion] = useState("전체");
  const [inventory, setInventory] = useState<NearbyInventoryFilter>("ALL");
  const [selectedShopId, setSelectedShopId] = useState<string>();
  const [kakaoPlaces, setKakaoPlaces] = useState<KakaoPlaceLocation[]>([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState<KakaoPlaceSearchStatus>("idle");
  const [referenceLocation, setReferenceLocation] = useState<NearbyMapReference>();
  const [locationSearchRequest, setLocationSearchRequest] = useState<NearbyLocationSearchRequest>();
  const [locationSearchStatus, setLocationSearchStatus] = useState<KakaoLocationSearchStatus>("idle");
  const [geolocationStatus, setGeolocationStatus] = useState<GeolocationStatus>("idle");
  const [resultLimit, setResultLimit] = useState(INITIAL_RESULT_LIMIT);

  const regions = useMemo(
    () => KOREA_REGION_OPTIONS.filter((item) => item === "전체"
      || getNearbyRegions(shops).includes(item)
      || kakaoPlaces.some(({ regionLabel }) => regionLabel === item)),
    [kakaoPlaces, shops],
  );

  const discoveredPlaces = useMemo(
    () => kakaoPlaces.filter((place) => !isDuplicateOfVerifiedShop(place, shops)),
    [kakaoPlaces, shops],
  );

  const directoryResults = useMemo<DirectoryResult[]>(() => {
    const verified = filterNearbyShops(shops, {
      query: filterQuery,
      region,
      inventory,
      point: referenceLocation?.point,
    })
      .map(({ shop, distance }) => ({
        source: "VERIFIED" as const,
        id: shop.id,
        name: shop.name,
        roadAddress: shop.roadAddress,
        regionLabel: shop.regionLabel,
        latitude: shop.latitude,
        longitude: shop.longitude,
        distance,
        shop,
      }));
    const discovered = inventory === "WITH_LISTINGS" ? [] : filterKakaoPlaces(discoveredPlaces, {
      query: filterQuery,
      region,
      point: referenceLocation?.point,
    }).map(({ place, distance }) => ({
      source: "KAKAO" as const,
      id: place.id,
      name: place.name,
      roadAddress: place.roadAddress,
      regionLabel: place.regionLabel,
      latitude: place.latitude,
      longitude: place.longitude,
      distance,
      place,
    }));

    return [...verified, ...discovered].sort((left, right) => {
      if (left.distance !== undefined && right.distance !== undefined) {
        return left.distance - right.distance || left.name.localeCompare(right.name, "ko");
      }
      if (left.distance !== undefined) return -1;
      if (right.distance !== undefined) return 1;
      return left.regionLabel.localeCompare(right.regionLabel, "ko")
        || left.name.localeCompare(right.name, "ko");
    });
  }, [discoveredPlaces, filterQuery, inventory, referenceLocation, region, shops]);

  const displayedResults = useMemo(
    () => directoryResults.slice(0, resultLimit),
    [directoryResults, resultLimit],
  );

  const mapShops = useMemo<NearbyMapShop[]>(
    () => directoryResults.map((result) => result.source === "VERIFIED" ? {
      id: result.id,
      name: result.name,
      platformName: result.shop.platform.name,
      homepageUrl: result.shop.platform.homepageUrl,
      roadAddress: result.roadAddress,
      latitude: result.latitude,
      longitude: result.longitude,
      distance: result.distance,
      activeListingCount: result.shop.activeListingCount,
      minPrice: result.shop.minPrice,
      kakaoMapUrl: buildKakaoMapUrl({
        name: result.name,
        address: result.roadAddress,
        point: result.latitude === undefined || result.longitude === undefined
          ? undefined
          : { latitude: result.latitude, longitude: result.longitude },
      }),
      source: "VERIFIED",
    } : {
      id: result.id,
      name: result.name,
      platformName: "Kakao Places",
      roadAddress: result.roadAddress,
      latitude: result.latitude,
      longitude: result.longitude,
      distance: result.distance,
      activeListingCount: 0,
      kakaoMapUrl: result.place.kakaoMapUrl,
      source: "KAKAO",
    }),
    [directoryResults],
  );

  const selectedVisibleShopId = selectedShopId && directoryResults.some(({ id }) => id === selectedShopId)
    ? selectedShopId
    : undefined;

  const selectShop = useCallback((shopId: string) => {
    setSelectedShopId(shopId);
  }, []);

  const clearFilters = () => {
    setQuery("");
    setFilterQuery("");
    setRegion("전체");
    setInventory("ALL");
    setReferenceLocation(undefined);
    setLocationSearchRequest(undefined);
    setLocationSearchStatus("idle");
    setResultLimit(INITIAL_RESULT_LIMIT);
  };

  const handlePlacesDiscovered = useCallback((places: KakaoPlaceLocation[]) => {
    setKakaoPlaces(places);
  }, []);

  const handlePlaceSearchStatusChange = useCallback((status: KakaoPlaceSearchStatus) => {
    setPlaceSearchStatus(status);
  }, []);

  const handleLocationSearchResolved = useCallback((location: KakaoReferenceLocation) => {
    setReferenceLocation({ ...location, kind: "SEARCH" });
    setFilterQuery("");
    setRegion("전체");
    setSelectedShopId(undefined);
    setGeolocationStatus("idle");
    setResultLimit(INITIAL_RESULT_LIMIT);
  }, []);

  const handleLocationSearchStatusChange = useCallback((status: KakaoLocationSearchStatus) => {
    setLocationSearchStatus(status);
  }, []);

  const submitLocationSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSelectedShopId(undefined);
    setLocationSearchRequest((current) => ({
      id: (current?.id ?? 0) + 1,
      query: trimmed,
    }));
  };

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeolocationStatus("unsupported");
      return;
    }
    setGeolocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextPoint = { latitude: coords.latitude, longitude: coords.longitude };
        if (!isValidGeoPoint(nextPoint)) {
          setGeolocationStatus("error");
          return;
        }
        setReferenceLocation({
          kind: "GPS",
          label: "내 위치",
          address: "내 위치",
          point: nextPoint,
        });
        setQuery("");
        setFilterQuery("");
        setRegion("전체");
        setSelectedShopId(undefined);
        setLocationSearchRequest(undefined);
        setLocationSearchStatus("idle");
        setGeolocationStatus("active");
        setResultLimit(INITIAL_RESULT_LIMIT);
      },
      (error) => {
        setGeolocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  const geolocationMessage = geolocationStatus === "denied"
    ? "위치 권한 거부"
    : geolocationStatus === "error"
      ? "위치 확인 실패"
      : geolocationStatus === "unsupported"
        ? "GPS 미지원"
        : undefined;

  const totalDirectoryCount = shops.length + discoveredPlaces.length;
  const locationSearchMessage = locationSearchStatus === "loading"
    ? "장소 검색 중"
    : locationSearchStatus === "not_found"
      ? "장소를 찾지 못함"
      : locationSearchStatus === "error"
        ? "장소 검색 실패"
        : undefined;

  return (
    <section className="nearby-directory" aria-labelledby="nearby-title">
      <header className="nearby-directory__header">
        <div>
          <h1 id="nearby-title">내 주변 파충류샵</h1>
          <p>{referenceLocation ? `${referenceLocation.label} 기준 거리순` : "전국 매장"}</p>
        </div>
        <div className="nearby-directory__actions">
          {geolocationMessage && <span role="status">{geolocationMessage}</span>}
          <button
            type="button"
            className={referenceLocation?.kind === "GPS" ? "is-active" : undefined}
            onClick={requestUserLocation}
            disabled={geolocationStatus === "requesting"}
          >
            <LocateFixed size={15} aria-hidden="true" />
            {geolocationStatus === "requesting"
              ? "위치 확인 중"
              : referenceLocation?.kind === "GPS" ? "위치 새로고침" : "내 위치"}
          </button>
          <span className="nearby-directory__count">
            {placeSearchStatus === "loading" ? `${shops.length}+` : totalDirectoryCount}곳
          </span>
        </div>
      </header>

      <div className="nearby-toolbar" aria-label="매장 검색 및 필터">
        <form className="nearby-search" onSubmit={submitLocationSearch}>
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="nearby-query">매장명, 지역, 주소 또는 장소 검색</label>
          <input
            id="nearby-query"
            type="search"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setFilterQuery(nextQuery);
              if (referenceLocation?.kind === "SEARCH") setReferenceLocation(undefined);
              setLocationSearchRequest(undefined);
              setLocationSearchStatus("idle");
              setResultLimit(INITIAL_RESULT_LIMIT);
            }}
            placeholder="매장명·지역·주소 검색"
          />
          {query && (
            <button type="button" onClick={() => {
              setQuery("");
              setFilterQuery("");
              if (referenceLocation?.kind === "SEARCH") setReferenceLocation(undefined);
              setLocationSearchRequest(undefined);
              setLocationSearchStatus("idle");
              setResultLimit(INITIAL_RESULT_LIMIT);
            }} aria-label="검색어 지우기">
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="submit"
            className="nearby-search__submit"
            aria-label="주소 또는 장소를 지도에서 검색"
            disabled={!query.trim() || locationSearchStatus === "loading"}
          >
            <MapPin size={16} aria-hidden="true" />
          </button>
        </form>

        <label className="nearby-region-select">
          <span className="sr-only">지역 선택</span>
          <select value={region} onChange={(event) => {
            setRegion(event.target.value);
            setResultLimit(INITIAL_RESULT_LIMIT);
          }}>
            {regions.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>

        <div className="nearby-filter-tabs" role="group" aria-label="매물 연결 상태">
          {inventoryFilters.map(({ value, label }) => (
            <button
              type="button"
              className={inventory === value ? "is-active" : undefined}
              aria-pressed={inventory === value}
              onClick={() => {
                setInventory(value);
                setResultLimit(INITIAL_RESULT_LIMIT);
              }}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="nearby-explorer">
        <aside className="nearby-results" aria-label="판매처 목록">
          <div className="nearby-results__summary">
            <strong>{directoryResults.length}곳</strong>
            <span role={locationSearchMessage ? "status" : undefined}>
              {locationSearchMessage ?? `검증 ${shops.length} · 지도검색 ${discoveredPlaces.length}`}
            </span>
          </div>

          {directoryResults.length > 0 ? (
            <div className="nearby-results__list">
              {displayedResults.map((result) => {
                const selected = selectedVisibleShopId === result.id;
                const verified = result.source === "VERIFIED" ? result.shop : undefined;
                const mapUrl = result.source === "KAKAO" ? result.place.kakaoMapUrl : buildKakaoMapUrl({
                  name: result.name,
                  address: result.roadAddress,
                  point: result.latitude === undefined || result.longitude === undefined
                    ? undefined
                    : { latitude: result.latitude, longitude: result.longitude },
                });
                const fulfillment = verified?.fulfillmentOptions
                  .filter(({ availability }) => availability !== "NOT_AVAILABLE") ?? [];

                return (
                  <article className={`nearby-result-card${selected ? " is-selected" : ""}`} key={result.id}>
                    <button
                      type="button"
                      className="nearby-result-card__main"
                      onClick={() => selectShop(result.id)}
                      aria-pressed={selected}
                    >
                      <span className="nearby-result-card__marker" aria-hidden="true">
                        <b />
                      </span>
                      <span className="nearby-result-card__body">
                        <span className="nearby-result-card__title-row">
                          <strong>{result.name}</strong>
                          {result.distance !== undefined && <em>직선 {formatDistanceKm(result.distance)}</em>}
                        </span>
                        <span className="nearby-result-card__address">{result.roadAddress}</span>
                        <span className="nearby-result-card__badges">
                          <i>{result.source === "KAKAO" ? "지도검색" : locationLabel(result.shop)}</i>
                          {verified && verified.activeListingCount > 0 ? (
                            <i className="has-listings">매물 {verified.activeListingCount}</i>
                          ) : (
                            <i className="location-only">가격 미연동</i>
                          )}
                        </span>
                      </span>
                    </button>

                    {selected && (
                      <div className="nearby-result-card__details">
                        {fulfillment.length > 0 && (
                          <div className="nearby-result-card__delivery" aria-label="배송 및 수령 방식">
                            {fulfillment.slice(0, 3).map((option) => (
                              <span key={option.id}>
                                <ModeIcon mode={option.mode} />
                                {modeLabels[option.mode]}
                                {option.availability === "CONFIRM_REQUIRED" && " 확인"}
                              </span>
                            ))}
                          </div>
                        )}

                        {verified && verified.previewListings.length > 0 && (
                          <div className="nearby-result-card__prices">
                            {verified.previewListings.slice(0, 2).map((listing) => (
                              <a href={listing.originalUrl} target="_blank" rel="noreferrer" key={listing.id}>
                                <span>{listing.title}</span>
                                <strong>{formatKRW(listing.price)}</strong>
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="nearby-result-card__actions">
                          <a className="kakao-map-link" href={mapUrl} target="_blank" rel="noreferrer">
                            카카오맵 <ExternalLink size={12} aria-hidden="true" />
                          </a>
                          {verified && (
                            <>
                              <a href={verified.platform.homepageUrl} target="_blank" rel="noreferrer">
                                판매처 <ExternalLink size={12} aria-hidden="true" />
                              </a>
                              <a href={verified.evidenceUrl} target="_blank" rel="noreferrer">
                                주소 출처 <ExternalLink size={12} aria-hidden="true" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {displayedResults.length < directoryResults.length && (
                <button
                  type="button"
                  className="nearby-results__more"
                  onClick={() => setResultLimit((current) => current + RESULT_PAGE_SIZE)}
                >
                  더보기 {Math.min(RESULT_PAGE_SIZE, directoryResults.length - displayedResults.length)}곳
                </button>
              )}
            </div>
          ) : (
            <div className="nearby-results__empty">
              <Store size={22} aria-hidden="true" />
              <strong>검색 결과 없음</strong>
              <button type="button" onClick={clearFilters}>필터 초기화</button>
            </div>
          )}
        </aside>

        <NearbyShopMap
          shops={mapShops}
          referenceLocation={referenceLocation}
          locationSearchRequest={locationSearchRequest}
          selectedShopId={selectedVisibleShopId}
          onSelectShop={selectShop}
          onPlacesDiscovered={handlePlacesDiscovered}
          onPlaceSearchStatusChange={handlePlaceSearchStatusChange}
          onLocationSearchResolved={handleLocationSearchResolved}
          onLocationSearchStatusChange={handleLocationSearchStatusChange}
        />
      </div>

    </section>
  );
}
