import type { MetadataRoute } from "next";

import {
  getFilterableTraits,
  getVisibleMorphs,
} from "@/lib/data/repository";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

/**
 * 정적 경로 + 데이터에서 파생된 모프·키워드 상세 경로.
 *
 * Supabase가 응답하지 않아도 sitemap이 통째로 깨져서는 안 되므로, 동적 경로
 * 조회는 실패하면 조용히 빈 목록으로 떨어지고 정적 경로만 남긴다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl().origin;
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/nearby`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const [morphs, traits] = await Promise.all([
    getVisibleMorphs().catch(() => []),
    getFilterableTraits().catch(() => []),
  ]);

  const morphRoutes: MetadataRoute.Sitemap = morphs.map((morph) => ({
    url: `${origin}/morph/${morph.slug}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const traitRoutes: MetadataRoute.Sitemap = traits.map((trait) => ({
    url: `${origin}/trait/${trait.slug}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticRoutes, ...morphRoutes, ...traitRoutes];
}
