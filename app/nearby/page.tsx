import type { Metadata } from "next";

import { NearbyShopFinder } from "@/components/nearby-shop-finder";
import { SiteHeader } from "@/components/site-header";
import { getNearbyShopLocations } from "@/lib/data/repository";

export const metadata: Metadata = {
  title: "내 주변 매장",
  description: "크레스티드 게코 판매처 거리순·배송·온라인 매물",
};

export default async function NearbyPage() {
  const shops = await getNearbyShopLocations();

  return (
    <main className="market-app nearby-page">
      <SiteHeader />
      <div className="nearby-content page-shell">
        {shops.length > 0 ? (
          <NearbyShopFinder shops={shops} />
        ) : (
          <section className="empty-state nearby-empty-state">
            <div>
              <h2>확인된 매장 위치 없음</h2>
              <p>공식 주소·좌표 확인 후 반영</p>
            </div>
          </section>
        )}
      </div>

    </main>
  );
}
