import Link from "next/link";

import { HomeFeatureShowcase } from "@/components/home-feature-showcase";
import { MorphGrid } from "@/components/morph-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getHomeMarketSnapshot } from "@/lib/data/repository";
import { expoEvents, getKoreaDateKey } from "@/lib/expo-events";
import { buildWebsiteJsonLd } from "@/lib/structured-data";

export async function HomeMarketPage({ query = "" }: { query?: string }) {
  const snapshot = await getHomeMarketSnapshot();
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildWebsiteJsonLd() }}
      />
      <SiteHeader query={query} home />

      <div className="home-content page-shell">
        <HomeFeatureShowcase
          events={expoEvents}
          initialKoreaDate={getKoreaDateKey(new Date())}
        />

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
      <SiteFooter />
    </main>
  );
}
