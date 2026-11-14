/**
 * 오래된 ACTIVE 매물 재확인(reaper)의 판정 규칙.
 *
 * 수집기는 항상 "가장 새 매물"만 보기 때문에, 판매 완료·삭제된 매물이 ACTIVE로
 * 남는다. 재확인은 그 반대 방향으로 오래된 것부터 훑으면서 상태를 정리한다.
 *
 * 핵심 원칙: **확실할 때만 상태를 바꾼다.**
 * - HTTP 404/410은 상품이 사라졌다는 서버의 명시적 신호이므로 DELETED.
 * - 본문이 정상(2xx)이고 파서가 "판매 완료"를 확인하면 SOLD.
 * - 5xx·429·403·타임아웃·네트워크 오류는 일시 장애일 수 있으므로 기존 상태 유지.
 * - 2xx인데 파서가 상품을 못 읽은 경우도 삭제로 단정하지 않고 상태 유지.
 *   (Cafe24·Imweb의 삭제/이동 페이지는 200으로 응답할 수 있다.)
 */

export type RecheckParsedStatus = "ACTIVE" | "SOLD" | "UNKNOWN";

export type RecheckFetchOutcome =
  | { kind: "response"; statusCode: number; html: string }
  | { kind: "error" };

export type RecheckAction = "DELETED" | "SOLD" | "REOBSERVED" | "KEEP";

/** HTTP 상태 코드를 "사라짐 / 일시 장애 / 정상" 세 갈래로만 나눈다. */
export function classifyHttpStatus(
  statusCode: number,
): "GONE" | "TRANSIENT" | "OK" {
  if (statusCode === 404 || statusCode === 410) return "GONE";
  if (statusCode >= 200 && statusCode < 300) return "OK";
  return "TRANSIENT";
}

/**
 * 재확인 결과로 매물에 적용할 조치.
 *
 * `parsed`는 2xx 본문을 파서로 읽은 결과다. `null`은 "이 URL이 더 이상 우리가
 * 아는 상품 페이지가 아니다"라는 뜻이지만, 그것만으로 삭제라고 단정하지 않는다.
 */
export function decideRecheckAction(
  outcome: RecheckFetchOutcome,
  parsed: { status: RecheckParsedStatus } | null,
): RecheckAction {
  if (outcome.kind === "error") return "KEEP";

  const kind = classifyHttpStatus(outcome.statusCode);
  if (kind === "GONE") return "DELETED";
  if (kind === "TRANSIENT") return "KEEP";

  if (!parsed) return "KEEP";
  if (parsed.status === "SOLD") return "SOLD";
  if (parsed.status === "ACTIVE") return "REOBSERVED";
  return "KEEP";
}

/** 재확인 1건의 결과를 사람이 읽을 수 있는 사유 문자열로 만든다. */
export function describeRecheckAction(
  action: RecheckAction,
  outcome: RecheckFetchOutcome,
): string {
  const status = outcome.kind === "response" ? `http ${outcome.statusCode}` : "network error";

  switch (action) {
    case "DELETED":
      return `recheck: gone (${status})`;
    case "SOLD":
      return `recheck: sold (${status})`;
    case "REOBSERVED":
      return `recheck: still active (${status})`;
    default:
      return `recheck: inconclusive, status kept (${status})`;
  }
}

/**
 * `last_checked_at`이 오래된 ACTIVE 매물을 고를 때의 SQL 필터와 같은 조건을
 * 문서화한 상수다. 재확인 대상에서 제외해야 하는 호스트(수동 입력·비공개 소스)를
 * 걸러내는 데 쓴다.
 */
export const RECHECK_MAX_ITEMS = 40;
export const RECHECK_PRODUCT_DELAY_MS = 150;
export const RECHECK_FETCH_TIMEOUT_MS = 8_000;
