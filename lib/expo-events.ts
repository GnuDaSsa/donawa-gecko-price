export type ExpoEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  sourceLabel: string;
  checkedAt: string;
};

export const expoEvents: ExpoEvent[] = [
  {
    id: "2026-suwon-exotic-animal-fair",
    title: "이색 동물 박람회 in 수원",
    startDate: "2026-08-15",
    endDate: "2026-08-16",
    venue: "수원컨벤션센터",
    href: "https://kiwo.kr/program/3",
    imageSrc: "/expos/2026-suwon-exotic-animal-fair.jpg",
    imageAlt: "2026 이색 동물 박람회 수원 공식 포스터",
    imagePosition: "center 42%",
    sourceLabel: "키워 행사 페이지",
    checkedAt: "2026-08-13",
  },
  {
    id: "2026-busan-reptile-fair-74",
    title: "제74회 렙타일페어 부산",
    startDate: "2026-08-22",
    endDate: "2026-08-23",
    venue: "벡스코 제1전시장 3A홀",
    href: "https://bighorn.co.kr/product/x/4219/category/439/display/1/",
    imageSrc: "/expos/2026-busan-reptile-fair-74.png",
    imageAlt: "2026 부산 제74회 렙타일페어 공식 포스터",
    imagePosition: "center",
    sourceLabel: "빅혼 공식 예매 페이지",
    checkedAt: "2026-08-13",
  },
  {
    id: "2026-daejeon-dinosaur-reptile-expo",
    title: "제3회 공룡·파충류 박람회",
    startDate: "2026-09-05",
    endDate: "2026-09-06",
    venue: "대전컨벤션센터 제2전시장",
    href: "https://showala.com/ex/ex_detail.php?idx=4228",
    imageSrc: "/expos/2026-daejeon-dinosaur-reptile-expo.jpg",
    imageAlt: "2026 대전 제3회 공룡 파충류 박람회 공식 포스터",
    imagePosition: "center 34%",
    sourceLabel: "SHOWALA 행사 페이지",
    checkedAt: "2026-08-13",
  },
  {
    id: "2026-cheongju-reptile-companion",
    title: "파충류 동반자",
    startDate: "2026-11-14",
    endDate: "2026-11-15",
    venue: "청주오스코",
    href: "https://osco.or.kr/event_schedule/event_calendar?mod=document&uid=689",
    imageSrc: "/expos/2026-cheongju-reptile-companion.jpg",
    imageAlt: "청주오스코 파충류 동반자 행사 이미지",
    imagePosition: "center",
    sourceLabel: "청주오스코 공식 일정",
    checkedAt: "2026-08-13",
  },
];

export function getKoreaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getUpcomingExpoEvents(
  events: ExpoEvent[],
  koreaDateKey: string,
): ExpoEvent[] {
  return events
    .filter(({ endDate }) => endDate >= koreaDateKey)
    .sort((a, b) =>
      a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title, "ko"),
    );
}

export function formatExpoDateRange(startDate: string, endDate: string): string {
  const [, startMonth, startDay] = startDate.split("-");
  const [, endMonth, endDay] = endDate.split("-");

  return startMonth === endMonth
    ? `${Number(startMonth)}.${startDay}–${endDay}`
    : `${Number(startMonth)}.${startDay}–${Number(endMonth)}.${endDay}`;
}
