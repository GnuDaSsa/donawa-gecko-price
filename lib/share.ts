import { formatKRW } from "@/lib/format";
import { absoluteUrl, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_NAME } from "@/lib/site";

export type DetailShare = {
  /** 공유 시트·복사본에 쓰는 제목. */
  title: string;
  /** 링크 앞에 붙는 한 줄. 숫자가 없으면 빈 문자열. */
  text: string;
  /** 공유할 절대 주소. */
  url: string;
  /** 미리보기 카드 경로. */
  image: string;
};

/**
 * 상세 페이지(모프·키워드)의 공유 문구.
 *
 * 카톡·커뮤니티에 붙였을 때 제목만 보고도 뭘 비교하는 표인지 알 수 있게
 * 모프 이름과 최저 호가를 앞에 둔다. 가격을 못 읽은 날은 숫자 없이 이름만 남긴다.
 */
export function buildDetailShare(input: {
  nameKo: string;
  path: string;
  minPrice?: number;
  siteCount: number;
  listingCount: number;
  image: string;
}): DetailShare {
  const { nameKo, path, minPrice, siteCount, listingCount, image } = input;

  const title = minPrice !== undefined ? `${nameKo} 최저 ${formatKRW(minPrice)}` : `${nameKo} 최저 호가 비교`;
  const counts =
    siteCount > 0
      ? `${siteCount}개 사이트 · 매물 ${listingCount.toLocaleString("ko-KR")}건`
      : `매물 ${listingCount.toLocaleString("ko-KR")}건`;

  return {
    title,
    text: `${SITE_NAME} | ${nameKo} ${counts}`,
    url: absoluteUrl(path),
    image,
  };
}

export const OG_IMAGE_DIMENSIONS = { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT } as const;
