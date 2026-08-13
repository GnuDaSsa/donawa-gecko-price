import { describe, expect, it } from "vitest";

import {
  expoEvents,
  formatExpoDateRange,
  getKoreaDateKey,
  getUpcomingExpoEvents,
} from "@/lib/expo-events";

describe("expo event visibility", () => {
  it("keeps an event visible through its final day in Korea", () => {
    const endOfSuwonFair = new Date("2026-08-16T14:59:59.000Z");
    const upcoming = getUpcomingExpoEvents(
      expoEvents,
      getKoreaDateKey(endOfSuwonFair),
    );

    expect(upcoming[0]?.id).toBe("2026-suwon-exotic-animal-fair");
  });

  it("removes an event at midnight after its final day in Korea", () => {
    const afterSuwonFair = new Date("2026-08-16T15:00:00.000Z");
    const upcoming = getUpcomingExpoEvents(
      expoEvents,
      getKoreaDateKey(afterSuwonFair),
    );

    expect(upcoming.map(({ id }) => id)).not.toContain(
      "2026-suwon-exotic-animal-fair",
    );
    expect(upcoming[0]?.id).toBe("2026-busan-reptile-fair-74");
  });

  it("sorts upcoming events by their start date", () => {
    const upcoming = getUpcomingExpoEvents(expoEvents, "2026-08-13");

    expect(upcoming.map(({ id }) => id)).toEqual([
      "2026-suwon-exotic-animal-fair",
      "2026-busan-reptile-fair-74",
      "2026-daejeon-dinosaur-reptile-expo",
      "2026-cheongju-reptile-companion",
    ]);
  });

  it("formats a compact Korean-friendly date range", () => {
    expect(formatExpoDateRange("2026-08-15", "2026-08-16")).toBe("8.15–16");
    expect(formatExpoDateRange("2026-08-31", "2026-09-01")).toBe("8.31–9.01");
  });
});
