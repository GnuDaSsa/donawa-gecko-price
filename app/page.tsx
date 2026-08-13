import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

import { BrandIntro } from "@/components/brand-intro";
import { MorphGrid } from "@/components/morph-grid";
import { SiteHeader } from "@/components/site-header";
import { getHomeMarketSnapshot } from "@/lib/data/repository";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function Home({ searchParams }: Props) {
  const [{ q }, snapshot] = await Promise.all([
    searchParams,
    getHomeMarketSnapshot(),
  ]);
  const query = q?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("ko");
  const availableMorphs = snapshot.morphs.filter(
    ({ listingCount, minPrice }) => listingCount > 0 && minPrice !== undefined,
  );
  const morphs = normalizedQuery
    ? availableMorphs.filter(({ morph }) =>
        [morph.nameKo, morph.nameEn, ...morph.aliases].some((name) =>
          name.toLocaleLowerCase("ko").includes(normalizedQuery),
        ),
      )
    : availableMorphs;
  return (
    <main className="market-app">
      <BrandIntro />
      <SiteHeader query={query} />

      <div className="home-content page-shell">
        <section className="home-nearby-feature" aria-labelledby="home-nearby-title">
          <div className="home-nearby-feature__main">
            <span className="home-nearby-feature__icon" aria-hidden="true">
              <MapPin size={22} />
            </span>
            <div>
              <h2 id="home-nearby-title">내 주변 판매처</h2>
            </div>
          </div>
          <Link className="home-nearby-feature__cta" href="/nearby">
            주변 매장 보기 <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="morph-section" id="morph-catalog" aria-labelledby="morph-heading">
          <div className="section-heading">
            <div>
              <h2 id="morph-heading">
                {query ? `‘${query}’ 검색 결과` : "모프·키워드 가격 찾기"}
              </h2>
            </div>
          </div>

          {morphs.length > 0 ? (
            <MorphGrid morphs={morphs} />
          ) : (
            <div className="empty-state home-empty-state">
              <div>
                <h3>{query ? "검색 결과 없음" : "비교 가능한 매물 없음"}</h3>
                <p>
                  {query
                    ? "다른 이름 또는 한글 표기로 검색"
                    : "다음 매물 갱신 대기"}
                </p>
                {query && <Link href="/#morph-catalog">검색 초기화</Link>}
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
