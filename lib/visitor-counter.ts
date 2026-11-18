/**
 * 방문자 수 집계와 5,000 조회 게이트.
 *
 * 방문자 수는 배포 사이에도 살아 있어야 하는데, 이 Vercel 환경에는 쓰기 가능한
 * DB 자격증명(서비스 롤 키)이 없고 Supabase 테이블을 새로 만들 권한도 없다.
 * 그래서 서버에서만 호출하는 외부 카운터 API를 영속 저장소로 쓰고,
 * 카운터를 읽지 못하면 게이트는 닫힌 상태(문의 메일 숨김)로 둔다.
 *
 * 저장소를 바꾸려면 `DONAWA_VISIT_COUNTER_URL`(기본 abacus.jasoncameron.dev),
 * `DONAWA_VISIT_COUNTER_NAMESPACE`, `DONAWA_VISIT_COUNTER_KEY` 만 설정하면 된다.
 * 문의 메일 주소는 `DONAWA_CONTACT_EMAIL` 환경변수에만 두고 코드에는 남기지 않는다.
 */

export const VISIT_THRESHOLD = 5000;

/** 방문 1회로 세는 브라우저 표식. 세션 쿠키라 탭을 닫으면 새 방문으로 센다. */
export const VISIT_COOKIE_NAME = "donawa_visit";

const DEFAULT_COUNTER_BASE_URL = "https://abacus.jasoncameron.dev";
const DEFAULT_COUNTER_NAMESPACE = "donawa-gecko-price.vercel.app";
const DEFAULT_COUNTER_KEY = "visits";
const COUNTER_TIMEOUT_MS = 8000;
/**
 * 카운터 응답이 느려 값이 비어 나오던 문제 때문에 응답 시간을 8초까지 기다린다.
 * 읽기는 한 번 더 시도하고, 방문 기록(hit)은 두 번 보내면 두 번 세지므로 재시도하지 않는다.
 */
const READ_ATTEMPTS = 2;

const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|preview|monitor|uptime|curl|wget|python-requests|httpclient|headless|lighthouse|gtmetrix|facebookexternalhit|vercel-screenshot/i;

export type VisitStatus = {
  /** 누적 방문 수. 카운터에 닿지 못하면 null. */
  count: number | null;
  threshold: number;
  /** 5,000 조회를 넘겨 문의 메일을 노출해도 되는지. */
  contactVisible: boolean;
  /** 문의 메일 주소는 게이트가 열렸을 때만 값이 있다. */
  contactEmail: string | null;
};

/** 카운터 응답이 잠깐 실패해도 직전 값을 보여 주기 위한 인스턴스 메모. */
let lastKnownCount: number | null = null;

function counterBaseUrl(): string {
  const configured = process.env.DONAWA_VISIT_COUNTER_URL?.trim();
  return (configured || DEFAULT_COUNTER_BASE_URL).replace(/\/+$/, "");
}

function counterNamespace(): string {
  return process.env.DONAWA_VISIT_COUNTER_NAMESPACE?.trim() || DEFAULT_COUNTER_NAMESPACE;
}

function counterKey(): string {
  return process.env.DONAWA_VISIT_COUNTER_KEY?.trim() || DEFAULT_COUNTER_KEY;
}

export function counterEndpoint(mode: "get" | "hit"): string {
  return `${counterBaseUrl()}/${mode}/${encodeURIComponent(counterNamespace())}/${encodeURIComponent(counterKey())}`;
}

async function queryOnce(mode: "get" | "hit"): Promise<number | null> {
  try {
    const response = await fetch(counterEndpoint(mode), {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(COUNTER_TIMEOUT_MS),
    });

    if (response.status === 404 && mode === "get") {
      return 0;
    }

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const raw = typeof payload === "object" && payload !== null ? (payload as { value?: unknown }).value : undefined;
    const value = typeof raw === "number" ? raw : Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    return Math.trunc(value);
  } catch {
    return null;
  }
}

async function queryCounter(mode: "get" | "hit"): Promise<number | null> {
  const attempts = mode === "get" ? READ_ATTEMPTS : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await queryOnce(mode);

    if (value !== null) {
      lastKnownCount = value;
      return value;
    }
  }

  return lastKnownCount;
}

/** 현재 누적 방문 수를 읽는다. 카운터에 닿지 못하면 null. */
export async function readVisitCount(): Promise<number | null> {
  return queryCounter("get");
}

/** 방문 1회를 기록하고 갱신된 누적 방문 수를 돌려준다. */
export async function recordVisit(): Promise<number | null> {
  return queryCounter("hit");
}

function contactEmailFor(count: number | null): string | null {
  if (count === null || count < VISIT_THRESHOLD) {
    return null;
  }

  const email = process.env.DONAWA_CONTACT_EMAIL?.trim();
  return email && email.includes("@") ? email : null;
}

export function buildVisitStatus(count: number | null): VisitStatus {
  const contactEmail = contactEmailFor(count);

  return {
    count,
    threshold: VISIT_THRESHOLD,
    contactVisible: contactEmail !== null,
    contactEmail,
  };
}

/**
 * 이 요청을 방문 1회로 셀지 판단한다.
 *
 * - 같은 세션에서 이미 센 브라우저(쿠키)는 건너뛴다.
 * - 크롤러·프리뷰·모니터링·CLI의 요청과 빈 User-Agent는 건너뛴다.
 * - 다른 사이트에서 온 요청은 건너뛴다.
 */
export function shouldCountVisit(input: {
  userAgent?: string | null;
  secFetchSite?: string | null;
  hasVisitCookie: boolean;
}): boolean {
  if (input.hasVisitCookie) {
    return false;
  }

  const userAgent = input.userAgent?.trim() ?? "";
  if (!userAgent || BOT_USER_AGENT_PATTERN.test(userAgent)) {
    return false;
  }

  const fetchSite = input.secFetchSite?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site" && fetchSite !== "none") {
    return false;
  }

  return true;
}
