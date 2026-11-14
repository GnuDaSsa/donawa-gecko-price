import { VisitorCounter } from "@/components/visitor-counter";

export function SiteFooter() {
  return (
    <footer className="site-footer page-shell">
      <div>
        <strong>도나와</strong>
        <p>크레스티드 게코 모프별 최저 호가 비교</p>
      </div>

      <p className="site-footer__notice">
        가격과 재고는 판매처가 공개한 정보를 모은 것으로, 실제 거래 조건과 다를 수 있습니다.
      </p>

      <VisitorCounter />
    </footer>
  );
}
