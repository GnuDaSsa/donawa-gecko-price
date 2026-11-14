import { Mail } from "lucide-react";

const PARTNERSHIP_INQUIRY_HREF =
  "mailto:sajw1994@gmail.com?subject=%5B%EB%8F%84%EB%82%98%EC%99%80%20%EC%A0%9C%ED%9C%B4%C2%B7%EA%B4%91%EA%B3%A0%20%EB%AC%B8%EC%9D%98%5D%20";

export function SiteFooter() {
  return (
    <footer className="site-footer page-shell">
      <div>
        <strong>도나와</strong>
        <p>크레스티드 게코 모프별 최저 호가 비교</p>
      </div>

      <p className="site-footer__partnership">
        <a
          className="site-footer__contact"
          href={PARTNERSHIP_INQUIRY_HREF}
          aria-label="입점·광고·제휴 문의 메일 보내기"
        >
          <Mail size={13} aria-hidden="true" />
          입점·광고·제휴 문의
        </a>
        <span className="site-footer__contact-note">입점 · 배너 광고 · 박람회 제휴 문의</span>
      </p>

      <p className="site-footer__notice">
        가격과 재고는 판매처가 공개한 정보를 모은 것으로, 실제 거래 조건과 다를 수 있습니다.
      </p>
    </footer>
  );
}
