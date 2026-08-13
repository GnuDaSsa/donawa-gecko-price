export type GeoPoint = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6_371.0088;

function radians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function isValidGeoPoint(point: GeoPoint): boolean {
  return Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180;
}

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to)) {
    throw new RangeError("위도·경도 범위가 올바르지 않습니다.");
  }

  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function formatDistanceKm(distance: number): string {
  if (!Number.isFinite(distance) || distance < 0) return "거리 미확인";
  if (distance < 0.01) return "10m 이내";
  if (distance < 1) return `${Math.max(10, Math.round(distance * 1_000 / 10) * 10)}m`;
  if (distance < 10) return `${distance.toFixed(1)}km`;
  return `${Math.round(distance)}km`;
}

export function buildKakaoMapUrl({
  name,
  address,
  point,
}: {
  name: string;
  address: string;
  point?: GeoPoint;
}): string {
  if (!point) {
    return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
  }
  if (!isValidGeoPoint(point)) {
    throw new RangeError("카카오맵 좌표 범위가 올바르지 않습니다.");
  }
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}
