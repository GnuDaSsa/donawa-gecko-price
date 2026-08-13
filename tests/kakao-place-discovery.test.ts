import { describe, expect, it } from "vitest";

import {
  dedupeKakaoPlaces,
  filterKakaoPlaces,
  getKakaoPlaceRegion,
  isDuplicateOfVerifiedShop,
  normalizeKakaoPlace,
  normalizeKakaoReferencePlace,
  type KakaoPlaceLocation,
} from "@/lib/kakao-place-discovery";

function place(overrides: Partial<KakaoPlaceLocation> = {}): KakaoPlaceLocation {
  return {
    id: "kakao:1",
    name: "도심속도마뱀 파충류샵",
    categoryName: "가정,생활 > 반려동물 > 반려동물분양",
    roadAddress: "서울 구로구 구로동로 214",
    regionLabel: "서울",
    latitude: 37.5,
    longitude: 126.88,
    kakaoMapUrl: "https://place.map.kakao.com/1",
    ...overrides,
  };
}

describe("Kakao place discovery", () => {
  it("normalizes safe Korean place fields without phone data", () => {
    const normalized = normalizeKakaoPlace({
      id: "123",
      place_name: "테스트 렙타일",
      category_name: "가정,생활 > 반려동물",
      address_name: "서울 구로구 구로동 1",
      road_address_name: "서울 구로구 테스트로 1",
      x: "126.9",
      y: "37.5",
      place_url: "http://place.map.kakao.com/123",
    });

    expect(normalized).toEqual({
      id: "kakao:123",
      name: "테스트 렙타일",
      categoryName: "가정,생활 > 반려동물",
      roadAddress: "서울 구로구 테스트로 1",
      regionLabel: "서울",
      latitude: 37.5,
      longitude: 126.9,
      kakaoMapUrl: "https://place.map.kakao.com/123",
    });
    expect(normalized).not.toHaveProperty("phone");
  });

  it("rejects irrelevant aquarium results and invalid coordinates", () => {
    expect(normalizeKakaoPlace({
      id: "1",
      place_name: "수족관",
      category_name: "반려동물 > 수족관",
      address_name: "서울 종로구 1",
      road_address_name: "",
      x: "126.9",
      y: "37.5",
      place_url: "https://place.map.kakao.com/1",
    })).toBeUndefined();
  });

  it("accepts a general Korean landmark as a map reference", () => {
    expect(normalizeKakaoReferencePlace({
      id: "8372426",
      place_name: "성남시청",
      category_name: "사회,공공기관 > 지방행정기관 > 시청",
      address_name: "경기 성남시 중원구 여수동 200",
      road_address_name: "경기 성남시 중원구 성남대로 997",
      x: "127.126230",
      y: "37.420026",
      place_url: "https://place.map.kakao.com/8372426",
    }, "성남시청")).toEqual({
      label: "성남시청",
      address: "경기 성남시 중원구 성남대로 997",
      point: { latitude: 37.420026, longitude: 127.12623 },
    });
  });

  it("deduplicates Kakao ids and removes an already verified store", () => {
    expect(dedupeKakaoPlaces([place(), place()])).toHaveLength(1);
    expect(isDuplicateOfVerifiedShop(place(), [{
      name: "도심속도마뱀",
      roadAddress: "서울특별시 구로구 구로동로 214 2층",
    }])).toBe(true);
  });

  it("filters by region and sorts by distance only with GPS", () => {
    const places = [
      place(),
      place({ id: "kakao:2", name: "부산 렙타일", roadAddress: "부산 연제구 테스트로 2", regionLabel: "부산", latitude: 35.18, longitude: 129.08 }),
    ];

    expect(getKakaoPlaceRegion("경기도 성남시 테스트로 1")).toBe("경기");
    expect(filterKakaoPlaces(places, { region: "부산" })[0]?.place.id).toBe("kakao:2");
    expect(filterKakaoPlaces(places, {
      point: { latitude: 37.5, longitude: 126.88 },
    })[0]?.place.id).toBe("kakao:1");
  });
});
