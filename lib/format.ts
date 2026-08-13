import type { Listing } from "@/lib/types";

export function formatKRW(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatListingMeta(listing: Listing): string {
  const parts = [
    listing.sex === "FEMALE" ? "암컷" : listing.sex === "MALE" ? "수컷" : "미구분",
  ];

  if (listing.weightG !== undefined) {
    parts.push(`${listing.weightG}g`);
  }

  return parts.join(" · ");
}

export function formatCheckedAt(listing: Listing): string {
  if (listing.platform.collectorType === "MANUAL") {
    return "사용자 등록";
  }

  const date = new Date(listing.lastCheckedAt);
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);

  return `${formatted} 확인`;
}
