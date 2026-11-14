import { afterEach, describe, expect, it, vi } from "vitest";

import {
  VISIT_COOKIE_NAME,
  VISIT_THRESHOLD,
  buildVisitStatus,
  counterEndpoint,
  readVisitCount,
  recordVisit,
  shouldCountVisit,
} from "@/lib/visitor-counter";

const CONTACT_EMAIL = "help@donawa.example";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("buildVisitStatus", () => {
  it("5,000 미만이면 문의 메일을 숨긴다", () => {
    vi.stubEnv("DONAWA_CONTACT_EMAIL", CONTACT_EMAIL);

    for (const count of [0, 1, 4998, VISIT_THRESHOLD - 1]) {
      const status = buildVisitStatus(count);

      expect(status.count).toBe(count);
      expect(status.threshold).toBe(5000);
      expect(status.contactVisible).toBe(false);
      expect(status.contactEmail).toBeNull();
    }
  });

  it("5,000 이상이면 문의 메일을 연다", () => {
    vi.stubEnv("DONAWA_CONTACT_EMAIL", CONTACT_EMAIL);

    for (const count of [VISIT_THRESHOLD, 5001, 12000]) {
      const status = buildVisitStatus(count);

      expect(status.contactVisible).toBe(true);
      expect(status.contactEmail).toBe(CONTACT_EMAIL);
    }
  });

  it("카운터를 읽지 못하면(null) 메일을 숨긴다", () => {
    vi.stubEnv("DONAWA_CONTACT_EMAIL", CONTACT_EMAIL);

    const status = buildVisitStatus(null);

    expect(status.count).toBeNull();
    expect(status.contactVisible).toBe(false);
    expect(status.contactEmail).toBeNull();
  });

  it("문의 메일 환경변수가 없거나 형식이 이상하면 5,000을 넘겨도 링크를 만들지 않는다", () => {
    vi.stubEnv("DONAWA_CONTACT_EMAIL", "");
    expect(buildVisitStatus(9000).contactEmail).toBeNull();

    vi.stubEnv("DONAWA_CONTACT_EMAIL", "not-an-address");
    const status = buildVisitStatus(9000);

    expect(status.contactVisible).toBe(false);
    expect(status.contactEmail).toBeNull();
  });
});

describe("shouldCountVisit", () => {
  const human = {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    secFetchSite: "same-origin",
    hasVisitCookie: false,
  };

  it("사람의 첫 요청만 센다", () => {
    expect(shouldCountVisit(human)).toBe(true);
  });

  it("같은 세션에서 이미 센 브라우저는 다시 세지 않는다", () => {
    expect(shouldCountVisit({ ...human, hasVisitCookie: true })).toBe(false);
  });

  it("크롤러·프리뷰·모니터링 요청은 세지 않는다", () => {
    const botAgents = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "facebookexternalhit/1.1",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 HeadlessChrome/120.0.0.0 Safari/537.36",
      "curl/8.5.0",
      "Vercel-Screenshot/1.0",
    ];

    for (const userAgent of botAgents) {
      expect(shouldCountVisit({ ...human, userAgent })).toBe(false);
    }
  });

  it("User-Agent가 없으면 세지 않는다", () => {
    expect(shouldCountVisit({ ...human, userAgent: null })).toBe(false);
    expect(shouldCountVisit({ ...human, userAgent: "  " })).toBe(false);
  });

  it("다른 사이트에서 보낸 요청은 세지 않는다", () => {
    expect(shouldCountVisit({ ...human, secFetchSite: "cross-site" })).toBe(false);
  });

  it("Sec-Fetch-Site 헤더가 없는 브라우저는 막지 않는다", () => {
    expect(shouldCountVisit({ ...human, secFetchSite: null })).toBe(true);
  });
});

describe("counter endpoints", () => {
  it("기본은 도나와 도메인 네임스페이스의 visits 키를 쓴다", () => {
    vi.stubEnv("DONAWA_VISIT_COUNTER_URL", "");
    vi.stubEnv("DONAWA_VISIT_COUNTER_NAMESPACE", "");
    vi.stubEnv("DONAWA_VISIT_COUNTER_KEY", "");

    expect(counterEndpoint("hit")).toBe(
      "https://abacus.jasoncameron.dev/hit/donawa-gecko-price.vercel.app/visits",
    );
  });

  it("환경변수로 저장소를 바꿀 수 있다", () => {
    vi.stubEnv("DONAWA_VISIT_COUNTER_URL", "https://counter.example/");
    vi.stubEnv("DONAWA_VISIT_COUNTER_NAMESPACE", "donawa site");
    vi.stubEnv("DONAWA_VISIT_COUNTER_KEY", "views");

    expect(counterEndpoint("get")).toBe("https://counter.example/get/donawa%20site/views");
  });

  it("조회는 카운터 값을 그대로 돌려주고, 없는 키는 0으로 본다", async () => {
    vi.stubEnv("DONAWA_VISIT_COUNTER_URL", "https://counter.example");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 4999 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Key not found" }), { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readVisitCount()).resolves.toBe(4999);
    await expect(readVisitCount()).resolves.toBe(0);
  });

  it("방문 기록은 hit 엔드포인트를 호출하고 갱신된 수를 돌려준다", async () => {
    vi.stubEnv("DONAWA_VISIT_COUNTER_URL", "https://counter.example");

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: 5000 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(recordVisit()).resolves.toBe(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://counter.example/hit/donawa-gecko-price.vercel.app/visits");
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.method ?? "GET").toBe("GET");
  });

  it("카운터가 실패하면 마지막으로 읽은 값을 유지한다", async () => {
    vi.stubEnv("DONAWA_VISIT_COUNTER_URL", "https://counter.example");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 321 }), { status: 200 }))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readVisitCount()).resolves.toBe(321);
    await expect(readVisitCount()).resolves.toBe(321);
  });

  it("쿠키 이름은 방문 세션을 구분하는 값 하나로 고정한다", () => {
    expect(VISIT_COOKIE_NAME).toBe("donawa_visit");
  });
});
