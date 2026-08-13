import { haversineDistanceKm, type GeoPoint } from "@/lib/geo";

export const KAKAO_PLACE_CACHE_KEY = "donawa:kakao-place-directory:v1";
export const KAKAO_PLACE_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

export const KAKAO_DISCOVERY_AREAS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "수원", "성남", "고양", "용인", "부천", "안산", "안양", "남양주",
  "화성", "평택", "의정부", "파주", "김포", "광주 경기",
  "춘천", "원주", "강릉", "청주", "충주", "제천",
  "천안", "아산", "공주", "당진", "서산",
  "전주", "군산", "익산", "목포", "순천", "여수",
  "포항", "경주", "구미", "안동", "창원", "김해", "진주", "양산",
  "제주", "서귀포",
] as const;

export const KOREA_REGION_OPTIONS = [
  "전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
  "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

const KOREA_LIMITS = { south: 33, west: 124.8, north: 38.3, east: 130.3 };

const REGION_ALIASES: Record<string, string> = {
  서울특별시: "서울", 서울: "서울", 부산광역시: "부산", 부산: "부산",
  대구광역시: "대구", 대구: "대구", 인천광역시: "인천", 인천: "인천",
  광주광역시: "광주", 광주: "광주", 대전광역시: "대전", 대전: "대전",
  울산광역시: "울산", 울산: "울산", 세종특별자치시: "세종", 세종: "세종",
  경기도: "경기", 경기: "경기", 강원특별자치도: "강원", 강원도: "강원", 강원: "강원",
  충청북도: "충북", 충북: "충북", 충청남도: "충남", 충남: "충남",
  전북특별자치도: "전북", 전라북도: "전북", 전북: "전북",
  전라남도: "전남", 전남: "전남", 경상북도: "경북", 경북: "경북",
  경상남도: "경남", 경남: "경남", 제주특별자치도: "제주", 제주: "제주",
};

const EXCLUDED_CATEGORY_WORDS = ["동물병원", "수족관", "음식점", "숙박", "펜션", "공원", "관광"];

export interface KakaoPlaceResultLike {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
}

export interface KakaoPlaceLocation {
  id: string;
  name: string;
  categoryName: string;
  roadAddress: string;
  regionLabel: string;
  latitude: number;
  longitude: number;
  kakaoMapUrl: string;
}

export interface KakaoReferenceLocation {
  label: string;
  address: string;
  point: GeoPoint;
}

export interface ComparableShopLocation {
  name: string;
  roadAddress: string;
  latitude?: number;
  longitude?: number;
}

function compact(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/[\s·.,()\[\]{}\-_]/g, "");
}

function compactShopName(value: string): string {
  return compact(value)
    .replace(/파충류전문샵|파충류샵|렙타일샵/g, "")
    .replace(/파충류$/g, "");
}

function compactAddress(value: string): string {
  return compact(value)
    .replace(/^서울특별시/, "서울").replace(/^부산광역시/, "부산")
    .replace(/^대구광역시/, "대구").replace(/^인천광역시/, "인천")
    .replace(/^광주광역시/, "광주").replace(/^대전광역시/, "대전")
    .replace(/^울산광역시/, "울산").replace(/^세종특별자치시/, "세종")
    .replace(/^경기도/, "경기").replace(/^강원특별자치도|^강원도/, "강원")
    .replace(/^충청북도/, "충북").replace(/^충청남도/, "충남")
    .replace(/^전북특별자치도|^전라북도/, "전북").replace(/^전라남도/, "전남")
    .replace(/^경상북도/, "경북").replace(/^경상남도/, "경남")
    .replace(/^제주특별자치도/, "제주");
}

export function getKakaoPlaceRegion(address: string): string {
  const firstToken = address.trim().split(/\s+/)[0] ?? "";
  return REGION_ALIASES[firstToken] ?? firstToken;
}

export function normalizeKakaoPlace(result: KakaoPlaceResultLike): KakaoPlaceLocation | undefined {
  const latitude = Number(result.y);
  const longitude = Number(result.x);
  const roadAddress = (result.road_address_name || result.address_name).trim();
  const name = result.place_name.trim();
  const categoryName = result.category_name.trim();

  if (
    !result.id || !name || !roadAddress || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < KOREA_LIMITS.south || latitude > KOREA_LIMITS.north
    || longitude < KOREA_LIMITS.west || longitude > KOREA_LIMITS.east
    || EXCLUDED_CATEGORY_WORDS.some((word) => categoryName.includes(word))
  ) return undefined;

  const kakaoMapUrl = result.place_url.trim().replace(/^http:/, "https:");
  if (!/^https:\/\/(?:place\.)?map\.kakao\.com\//.test(kakaoMapUrl)) return undefined;

  return {
    id: `kakao:${result.id}`,
    name,
    categoryName,
    roadAddress,
    regionLabel: getKakaoPlaceRegion(roadAddress),
    latitude,
    longitude,
    kakaoMapUrl,
  };
}

export function normalizeKakaoReferencePlace(
  result: KakaoPlaceResultLike,
  fallbackLabel: string,
): KakaoReferenceLocation | undefined {
  const latitude = Number(result.y);
  const longitude = Number(result.x);
  const label = (result.place_name || fallbackLabel).trim();
  const address = (result.road_address_name || result.address_name || fallbackLabel).trim();

  if (
    !label || !address || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < KOREA_LIMITS.south || latitude > KOREA_LIMITS.north
    || longitude < KOREA_LIMITS.west || longitude > KOREA_LIMITS.east
  ) return undefined;

  return { label, address, point: { latitude, longitude } };
}

export function dedupeKakaoPlaces(places: KakaoPlaceLocation[]): KakaoPlaceLocation[] {
  return [...new Map(places.map((place) => [place.id, place])).values()]
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

export function isDuplicateOfVerifiedShop(place: KakaoPlaceLocation, shops: ComparableShopLocation[]): boolean {
  const placeName = compactShopName(place.name);
  const placeAddress = compactAddress(place.roadAddress);

  return shops.some((shop) => {
    const shopName = compactShopName(shop.name);
    const shopAddress = compactAddress(shop.roadAddress);
    const nameMatches = placeName === shopName
      || (Math.min(placeName.length, shopName.length) >= 4
        && (placeName.includes(shopName) || shopName.includes(placeName)));
    const addressMatches = Math.min(placeAddress.length, shopAddress.length) >= 10
      && (placeAddress.includes(shopAddress) || shopAddress.includes(placeAddress));

    if (nameMatches && addressMatches) return true;
    if (!nameMatches || shop.latitude === undefined || shop.longitude === undefined) return false;

    return haversineDistanceKm(
      { latitude: place.latitude, longitude: place.longitude },
      { latitude: shop.latitude, longitude: shop.longitude },
    ) <= 0.25;
  });
}

export function filterKakaoPlaces(
  places: KakaoPlaceLocation[],
  { query = "", region = "전체", point }: { query?: string; region?: string; point?: GeoPoint } = {},
): Array<{ place: KakaoPlaceLocation; distance?: number }> {
  const normalizedQuery = compact(query);
  return places
    .filter((place) => region === "전체" || place.regionLabel === region)
    .filter((place) => !normalizedQuery || [place.name, place.roadAddress, place.categoryName]
      .some((value) => compact(value).includes(normalizedQuery)))
    .map((place) => ({
      place,
      distance: point ? haversineDistanceKm(point, {
        latitude: place.latitude,
        longitude: place.longitude,
      }) : undefined,
    }))
    .sort((left, right) => left.distance !== undefined && right.distance !== undefined
      ? left.distance - right.distance || left.place.name.localeCompare(right.place.name, "ko")
      : left.place.name.localeCompare(right.place.name, "ko"));
}
