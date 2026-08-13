"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { ListingCard } from "@/components/listing-card";
import type { Listing, Morph } from "@/lib/types";

const PAGE_SIZE = 12;

export function AllListings({
  morph,
  listings,
}: {
  morph: Morph;
  listings: Listing[];
}) {
  const [platformId, setPlatformId] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const platforms = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();

    for (const listing of listings) {
      const current = counts.get(listing.platform.id);
      counts.set(listing.platform.id, {
        id: listing.platform.id,
        name: listing.platform.name,
        count: (current?.count ?? 0) + 1,
      });
    }

    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"),
    );
  }, [listings]);
  const filtered = platformId === "all"
    ? listings
    : listings.filter((listing) => listing.platform.id === platformId);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  function selectPlatform(nextPlatformId: string) {
    setPlatformId(nextPlatformId);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section className="all-listings" id="all-listings" aria-labelledby="all-listings-title">
      <div className="all-listings__heading">
        <div>
          <h2 id="all-listings-title">현재 판매 중인 전체 매물</h2>
        </div>
      </div>

      <div className="platform-filter" role="group" aria-label="전체 매물 플랫폼 필터">
        <button
          type="button"
          aria-pressed={platformId === "all"}
          onClick={() => selectPlatform("all")}
        >
          전체 <span>{listings.length}</span>
        </button>
        {platforms.map((platform) => (
          <button
            type="button"
            key={platform.id}
            aria-pressed={platformId === platform.id}
            onClick={() => selectPlatform(platform.id)}
          >
            {platform.name} <span>{platform.count}</span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="listing-grid listing-grid--catalog">
          {visible.map((listing) => (
            <ListingCard key={listing.id} listing={listing} morph={morph} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div>
            <h3>선택한 사이트에 매물 없음</h3>
            <p>다른 사이트 선택 또는 다음 갱신 대기</p>
          </div>
        </div>
      )}

      <div className="all-listings__footer">
        <p>
          <strong>{visible.length}</strong> / {filtered.length}건 표시
        </p>
        {hasMore && (
          <button
            type="button"
            className="load-more-button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            매물 더 보기
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
