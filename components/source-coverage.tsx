import { ExternalLink } from "lucide-react";

import type { Listing, Platform } from "@/lib/types";

function sourceState(platform: Platform, count: number) {
  if (count > 0) {
    return { label: `현재 ${count}건 반영`, tone: "live" };
  }

  if (platform.name === "워터테일") {
    return { label: "현재 매물 없음 · 품절만 확인", tone: "empty" };
  }

  if (platform.name === "파사모") {
    return { label: "로그인 후 선택 매물 검토", tone: "review" };
  }

  if (platform.name === "동물다락") {
    return { label: "공개 매물 목록 미제공", tone: "review" };
  }

  if (platform.collectorType === "AUTO_WEB") {
    return { label: "현재 비교 매물 없음", tone: "empty" };
  }

  return { label: "검토 자료 필요", tone: "review" };
}

export function SourceCoverage({
  platforms,
  listings,
}: {
  platforms: Platform[];
  listings: Listing[];
}) {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    counts.set(listing.platform.id, (counts.get(listing.platform.id) ?? 0) + 1);
  }

  return (
    <section
      className="source-coverage"
      id="source-coverage"
      aria-labelledby="source-coverage-title"
    >
      <div className="source-coverage__heading">
        <div>
          <p className="eyebrow">SOURCE COVERAGE</p>
          <h2 id="source-coverage-title">연결 소스 현황</h2>
        </div>
        <p>등록된 수집 대상 전체 표시</p>
      </div>
      <div className="source-coverage__grid">
        {platforms.map((platform) => {
          const state = sourceState(platform, counts.get(platform.id) ?? 0);
          return (
            <a
              href={platform.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="source-coverage__item"
              key={platform.id}
            >
              <span className="platform-mark" aria-hidden="true">
                {platform.name.slice(0, 1)}
              </span>
              <span className="source-coverage__name">
                <strong>{platform.name}</strong>
                <small className={`source-status source-status--${state.tone}`}>
                  {state.label}
                </small>
              </span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
