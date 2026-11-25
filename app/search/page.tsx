import type { Metadata } from "next";

import { HomeMarketPage } from "@/components/home-market-page";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : q;
  return <HomeMarketPage query={query?.trim()} />;
}
