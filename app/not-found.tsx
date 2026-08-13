import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="not-found-page page-shell">
        <p className="not-found-page__code">404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <Link href="/">홈으로</Link>
      </main>
    </div>
  );
}
