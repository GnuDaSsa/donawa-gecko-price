import { describe, expect, it } from "vitest";

import {
  classifyHttpStatus,
  decideRecheckAction,
  describeRecheckAction,
  RECHECK_MAX_ITEMS,
} from "@/supabase/functions/_shared/recheck";

const response = (statusCode: number) =>
  ({ kind: "response", statusCode, html: "" }) as const;
const networkError = { kind: "error" } as const;

describe("stale-listing recheck decisions", () => {
  it("marks 404 and 410 responses as DELETED", () => {
    expect(classifyHttpStatus(404)).toBe("GONE");
    expect(classifyHttpStatus(410)).toBe("GONE");

    expect(decideRecheckAction(response(404), null)).toBe("DELETED");
    expect(decideRecheckAction(response(410), null)).toBe("DELETED");
    // 410 응답이라면 본문을 읽을 필요도 없다.
    expect(decideRecheckAction(response(410), { status: "SOLD" })).toBe("DELETED");
  });

  it("keeps the current status on 5xx, rate limits, blocks, and timeouts", () => {
    for (const statusCode of [500, 502, 503, 504, 429, 403, 401]) {
      expect(classifyHttpStatus(statusCode)).toBe("TRANSIENT");
      expect(decideRecheckAction(response(statusCode), { status: "ACTIVE" })).toBe("KEEP");
      expect(decideRecheckAction(response(statusCode), { status: "SOLD" })).toBe("KEEP");
    }

    expect(decideRecheckAction(networkError, null)).toBe("KEEP");
    expect(decideRecheckAction(networkError, { status: "SOLD" })).toBe("KEEP");
  });

  it("does not treat an unreadable 2xx page as a deletion", () => {
    expect(decideRecheckAction(response(200), null)).toBe("KEEP");
    expect(decideRecheckAction(response(200), { status: "UNKNOWN" })).toBe("KEEP");
  });

  it("moves explicitly sold products to SOLD and re-observes active ones", () => {
    expect(decideRecheckAction(response(200), { status: "SOLD" })).toBe("SOLD");
    expect(decideRecheckAction(response(200), { status: "ACTIVE" })).toBe("REOBSERVED");
  });

  it("writes an auditable reason for every outcome", () => {
    expect(describeRecheckAction("DELETED", response(410))).toBe("recheck: gone (http 410)");
    expect(describeRecheckAction("SOLD", response(200))).toBe("recheck: sold (http 200)");
    expect(describeRecheckAction("REOBSERVED", response(200))).toBe(
      "recheck: still active (http 200)",
    );
    expect(describeRecheckAction("KEEP", response(503))).toBe(
      "recheck: inconclusive, status kept (http 503)",
    );
    expect(describeRecheckAction("KEEP", networkError)).toBe(
      "recheck: inconclusive, status kept (network error)",
    );
  });

  it("caps one recheck run so it fits the Edge wall-clock budget", () => {
    expect(RECHECK_MAX_ITEMS).toBeGreaterThan(0);
    expect(RECHECK_MAX_ITEMS).toBeLessThanOrEqual(60);
  });
});
