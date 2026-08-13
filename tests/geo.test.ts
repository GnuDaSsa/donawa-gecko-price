import { describe, expect, it } from "vitest";

import {
  buildKakaoMapUrl,
  formatDistanceKm,
  haversineDistanceKm,
  isValidGeoPoint,
} from "@/lib/geo";

describe("nearby-shop geolocation helpers", () => {
  it("calculates a stable straight-line distance", () => {
    const distance = haversineDistanceKm(
      { latitude: 37.5665, longitude: 126.9780 },
      { latitude: 35.1796, longitude: 129.0756 },
    );
    expect(distance).toBeGreaterThan(320);
    expect(distance).toBeLessThan(330);
  });

  it("keeps identical positions at zero and formats short distances", () => {
    const point = { latitude: 37.497762, longitude: 126.883524 };
    expect(haversineDistanceKm(point, point)).toBe(0);
    expect(formatDistanceKm(0)).toBe("10m 이내");
    expect(formatDistanceKm(2.46)).toBe("2.5km");
    expect(formatDistanceKm(18.7)).toBe("19km");
  });

  it("rejects coordinates outside the earth bounds", () => {
    expect(isValidGeoPoint({ latitude: 91, longitude: 127 })).toBe(false);
    expect(() => haversineDistanceKm(
      { latitude: 37, longitude: 127 },
      { latitude: -92, longitude: 0 },
    )).toThrow(RangeError);
  });

  it("builds Kakao map links with a coordinate or address fallback", () => {
    expect(buildKakaoMapUrl({
      name: "더쥬 송파점",
      address: "서울특별시 송파구 중대로16길 12",
      point: { latitude: 37.495634, longitude: 127.125980 },
    })).toBe(
      "https://map.kakao.com/link/map/%EB%8D%94%EC%A5%AC%20%EC%86%A1%ED%8C%8C%EC%A0%90,37.495634,127.125980",
    );
    expect(buildKakaoMapUrl({
      name: "좌표 미확인 매장",
      address: "서울특별시 송파구 양재대로 1218",
    })).toBe(
      "https://map.kakao.com/link/search/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EC%86%A1%ED%8C%8C%EA%B5%AC%20%EC%96%91%EC%9E%AC%EB%8C%80%EB%A1%9C%201218",
    );
  });
});
