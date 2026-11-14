"use client";

import { useEffect, useState } from "react";

type VisitStatus = {
  count: number | null;
  threshold: number;
  contactVisible: boolean;
  contactEmail: string | null;
};

const numberFormat = new Intl.NumberFormat("ko-KR");

/**
 * 누적 방문 수를 보여 주고, 5,000 조회를 넘겼을 때만 입점·광고·제휴 문의 메일을 낸다.
 *
 * 페이지는 정적 그대로 두고 브라우저에서 `/api/visit` 을 한 번 호출해 방문을 기록한다.
 * 서버 응답이 없으면 아무것도 그리지 않는다(메일은 절대 추측으로 노출하지 않는다).
 */
export function VisitorCounter() {
  const [status, setStatus] = useState<VisitStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function record() {
      try {
        const response = await fetch("/api/visit", {
          method: "POST",
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null) {
          return;
        }

        const { count, threshold, contactVisible, contactEmail } = payload as Partial<VisitStatus>;
        if (typeof count !== "number" || typeof threshold !== "number") {
          return;
        }

        setStatus({
          count,
          threshold,
          contactVisible: contactVisible === true,
          contactEmail: typeof contactEmail === "string" ? contactEmail : null,
        });
      } catch {
        // 카운터에 닿지 못하면 방문 수 줄 자체를 그리지 않는다.
      }
    }

    void record();

    return () => controller.abort();
  }, []);

  if (!status || status.count === null) {
    return null;
  }

  const contactEmail = status.contactVisible ? status.contactEmail : null;

  return (
    <div className="site-footer__counter">
      <span>누적 방문 {numberFormat.format(status.count)}회</span>
      {contactEmail ? (
        <a
          className="site-footer__contact"
          href={`mailto:${contactEmail}?subject=${encodeURIComponent("도나와 입점·광고·제휴 문의")}`}
        >
          입점·광고·제휴 문의
        </a>
      ) : null}
    </div>
  );
}
