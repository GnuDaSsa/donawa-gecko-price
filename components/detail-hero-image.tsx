"use client";

import Image from "next/image";
import { useState } from "react";

export function DetailHeroImage({
  representativeImageUrl,
  fallbackImageUrl,
  fallbackImagePosition,
}: {
  representativeImageUrl?: string;
  fallbackImageUrl: string;
  fallbackImagePosition: string;
}) {
  const listingImageUrl = representativeImageUrl?.trim();
  const [failedListingImageUrl, setFailedListingImageUrl] = useState<string>();
  const useListingImage = Boolean(
    listingImageUrl && listingImageUrl !== failedListingImageUrl,
  );

  return (
    <Image
      src={useListingImage ? listingImageUrl! : fallbackImageUrl}
      alt=""
      fill
      loading="eager"
      sizes="(max-width: 820px) 100vw, 59vw"
      style={{ objectPosition: useListingImage ? "center" : fallbackImagePosition }}
      onError={
        useListingImage
          ? () => setFailedListingImageUrl(listingImageUrl)
          : undefined
      }
    />
  );
}
