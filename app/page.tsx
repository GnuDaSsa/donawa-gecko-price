import type { Metadata } from "next";

import { HomeMarketPage } from "@/components/home-market-page";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const revalidate = 300;

export default function Home() {
  return <HomeMarketPage />;
}
