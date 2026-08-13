"use client";

import { ExternalLink, ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { TraitBadge } from "@/components/trait-badge";
import { formatCheckedAt, formatKRW, formatListingMeta } from "@/lib/format";
import type { Listing, Morph } from "@/lib/types";

export function ListingCard({ listing, morph }: { listing: Listing; morph: Morph }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = listing.imageUrl?.trim();

  return (
    <article className="listing-card">
      <div className="listing-card__image-wrap">
        {imageUrl && !imageFailed ? (
          <Image
            className="listing-card__image"
            src={imageUrl}
            alt={`${listing.originalTitle} 매물 이미지`}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1180px) 50vw, 25vw"
            style={{ objectPosition: listing.imagePosition ?? "center" }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="listing-card__image-empty"
            role="img"
            aria-label={`${listing.originalTitle} 이미지 없음`}
          >
            <ImageOff size={22} aria-hidden="true" />
            <span>이미지 없음</span>
          </div>
        )}
        <span className="listing-card__platform">{listing.platform.name}</span>
      </div>
      <div className="listing-card__body">
        <p className="listing-card__price">{formatKRW(listing.currentPrice!)}</p>
        <p className="listing-card__meta">
          {morph.nameKo} · {formatListingMeta(listing)}
        </p>
        <h3 className="listing-card__title">{listing.originalTitle}</h3>
        <div className="trait-list">
          {listing.traits.map((trait) => (
            <TraitBadge key={trait.id} name={trait.nameKo} />
          ))}
        </div>
        <div className="listing-card__footer">
          <span>{formatCheckedAt(listing)}</span>
          <a
            className="listing-card__link"
            href={listing.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            원문 보기 <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
