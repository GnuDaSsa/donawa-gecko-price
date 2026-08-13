"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { formatKRW } from "@/lib/format";
import type { MorphMarketSummary } from "@/lib/types";

export function MorphCard({
  summary,
  index,
}: {
  summary: MorphMarketSummary;
  index: number;
}) {
  const { morph, listingCount, minPrice, platformCount } = summary;
  const [listingImageFailed, setListingImageFailed] = useState(false);
  const listingImageUrl = summary.representativeListingImageUrl?.trim();
  const useListingImage = Boolean(listingImageUrl) && !listingImageFailed;
  const imageUrl = useListingImage ? listingImageUrl! : morph.representativeImage;
  const imageAlt = useListingImage
    ? `${morph.nameKo} 중간 가격대 매물 이미지${summary.representativeListingTitle ? ` · ${summary.representativeListingTitle}` : ""}`
    : `${morph.nameKo} 대표 크레스티드 게코`;

  return (
    <Link className="morph-card" href={summary.href}>
      <div className="morph-card__image-wrap">
        <Image
          className="morph-card__image"
          src={imageUrl}
          alt={imageAlt}
          fill
          loading={index === 0 ? "eager" : "lazy"}
          sizes="(max-width: 600px) 50vw, (max-width: 820px) 33vw, (max-width: 1180px) 25vw, 17vw"
          style={{ objectPosition: useListingImage ? "center" : morph.imagePosition }}
          onError={useListingImage ? () => setListingImageFailed(true) : undefined}
        />
        <span className="morph-card__number">
          {listingCount > 0 ? `${listingCount}개 매물` : "데이터 준비 중"}
        </span>
      </div>
      <div className="morph-card__body">
        <div className="morph-card__identity">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{morph.nameKo}</h3>
          <p>{morph.nameEn}</p>
        </div>
        <div className="morph-card__market">
          <span>{platformCount > 0 ? `${platformCount}개 사이트 최저` : "현재 호가"}</span>
          <strong>{minPrice === undefined ? "—" : formatKRW(minPrice)}</strong>
          <span className="morph-card__arrow" aria-hidden="true">
            <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
