/**
 * 사이트의 정식 주소와 기본 메타데이터.
 *
 * 검색·공유 크롤러는 상대 경로를 해석하지 못하므로 canonical·OG·sitemap은 모두
 * 이 파일의 절대 URL을 쓴다. 배포 도메인이 바뀌면 `NEXT_PUBLIC_SITE_URL`만
 * 설정하면 되고, 값이 없으면 현재 정식 배포 주소를 쓴다.
 */
export const SITE_NAME = "도나와";
export const SITE_TITLE = "도나와 — 크레스티드 게코 모프별 가격 비교";
export const SITE_DESCRIPTION =
  "크레스티드 게코 모프별 현재 최저 호가·판매 매물·플랫폼별 가격 비교";

const FALLBACK_SITE_URL = "https://donawa-gecko-price.vercel.app";

export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // 형식이 잘못된 값은 무시하고 정식 배포 주소로 돌아간다.
    }
  }

  return new URL(FALLBACK_SITE_URL);
}

export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
