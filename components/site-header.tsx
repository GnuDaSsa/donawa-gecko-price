"use client";

import { MapPin, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { HeaderBackButton } from "@/components/header-back-button";

export function SiteHeader({
  query = "",
}: {
  query?: string;
}) {
  const pathname = usePathname();
  const showBack = pathname !== "/";

  return (
    <header className="site-header page-shell">
      <div className="site-header__topline">
        <div className="site-header__identity">
          {showBack && <HeaderBackButton />}
          <Link className="brand" href="/" aria-label="도나와 홈">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">도나와</span>
          </Link>
        </div>

        <div className="site-header__actions">
          <Link className="nearby-nav-link" href="/nearby">
            <MapPin size={15} aria-hidden="true" />
            내 주변 매장
          </Link>
        </div>
      </div>

      <div className="market-nav">
        <form className="market-search" action="/" role="search">
          <label className="sr-only" htmlFor="morph-search">
            모프 이름 검색
          </label>
          <input
            id="morph-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="모프 키워드 검색"
          />
          <button type="submit" aria-label="모프 검색">
            <Search size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}
