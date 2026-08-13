import type { Platform } from "@/lib/types";

export const platforms: Platform[] = [
  {
    id: "platform-feedle",
    name: "피들",
    homepageUrl: "https://www.feedle.me",
    collectorType: "AUTO_WEB",
    isActive: true,
  },
  {
    id: "platform-kiwo",
    name: "키워",
    homepageUrl: "https://kiwo.kr/products?category=%EA%B2%8C%EC%BD%94",
    collectorType: "AUTO_WEB",
    isActive: true,
  },
  {
    id: "platform-watertail",
    name: "워터테일",
    homepageUrl: "https://watertail.com/listsofanimals",
    collectorType: "AUTO_WEB",
    isActive: true,
  },
  {
    id: "platform-mybreeders",
    name: "마이브리더즈",
    homepageUrl: "https://mybreeders.com",
    collectorType: "AUTO_WEB",
    isActive: true,
  },
  {
    id: "platform-newrun",
    name: "뉴런렙타일",
    homepageUrl: "https://newrunreptile.co.kr/product/list.html?cate_no=197",
    collectorType: "AUTO_WEB",
    isActive: true,
  },
  {
    id: "platform-pasamo",
    name: "파사모",
    homepageUrl: "https://cafe.naver.com/reptilia",
    collectorType: "BROWSER_HELPER",
    isActive: false,
  },
  {
    id: "platform-animal-attic",
    name: "동물다락",
    homepageUrl: "https://www.dongda.co.kr",
    collectorType: "CSV_IMPORT",
    isActive: false,
  },
];
