/**
 * 사이트의 정식 주소와 기본 메타데이터.
 *
 * 검색·공유 크롤러는 상대 경로를 해석하지 못하므로 canonical·OG·sitemap은 모두
 * 이 파일의 절대 URL을 쓴다. 배포 도메인이 바뀌면 `NEXT_PUBLIC_SITE_URL`만
 * 설정하면 되고, 값이 없으면 현재 정식 배포 주소를 쓴다.
 */
import { hasMorphOgCard, hasTraitOgCard } from "@/lib/og-cards";

export const SITE_NAME = "도나와";
export const SITE_TITLE = "도나와 — 크레스티드 게코 모프별 가격 비교";
export const SITE_DESCRIPTION =
  "크레스티드 게코 모프별 현재 최저 호가·판매 매물·플랫폼별 가격 비교";

/** 모든 페이지가 공유 미리보기에 쓰는 카드. 크림 바탕에 오렌지 액센트 한 줄. */
export const DEFAULT_OG_IMAGE_PATH = "/og/donawa-og.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * 상세 페이지의 공유 미리보기 이미지.
 *
 * 모프·키워드마다 이름만 크게 넣은 카드가 `public/og/`에 있으면 그걸 쓰고,
 * 없으면(새로 추가된 모프 등) 사이트 기본 카드로 떨어진다.
 * 카드에는 가격을 넣지 않는다. 하루 두 번 바뀌는 값을 그림에 굽지 않기 위해서다.
 */
export function detailOgImagePath(kind: "morph" | "trait", slug: string): string {
  const hasCard = kind === "morph" ? hasMorphOgCard(slug) : hasTraitOgCard(slug);
  return hasCard ? `/og/${kind}/${slug}.png` : DEFAULT_OG_IMAGE_PATH;
}

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
