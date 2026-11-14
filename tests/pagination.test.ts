import { describe, expect, it } from "vitest";

import { chunkIds, fetchAllPages, SUPABASE_PAGE_SIZE } from "@/lib/data/pagination";

function rows(count: number, prefix = "row") {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index).padStart(5, "0")}`,
  }));
}

describe("Supabase page reader", () => {
  it("returns a single short page without a second request", async () => {
    const calls: Array<[number, number]> = [];
    const data = rows(17);

    const result = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: data.slice(from, to + 1), error: null };
    }, "불러오기 실패");

    expect(result).toHaveLength(17);
    expect(calls).toEqual([[0, SUPABASE_PAGE_SIZE - 1]]);
  });

  it("keeps reading past the 1,000-row PostgREST cap until the last short page", async () => {
    const calls: Array<[number, number]> = [];
    const data = rows(2_347);

    const result = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: data.slice(from, to + 1), error: null };
    }, "불러오기 실패");

    expect(result).toHaveLength(2_347);
    expect(result[0]?.id).toBe("row-00000");
    expect(result.at(-1)?.id).toBe("row-02346");
    expect(calls).toEqual([
      [0, 999],
      [1_000, 1_999],
      [2_000, 2_999],
    ]);
  });

  it("requests one extra empty page when the total is an exact multiple", async () => {
    const calls: Array<[number, number]> = [];
    const data = rows(SUPABASE_PAGE_SIZE * 2);

    const result = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: data.slice(from, to + 1), error: null };
    }, "불러오기 실패");

    expect(result).toHaveLength(SUPABASE_PAGE_SIZE * 2);
    expect(calls).toHaveLength(3);
    expect(calls.at(-1)).toEqual([2_000, 2_999]);
  });

  it("surfaces the underlying Supabase error message", async () => {
    await expect(
      fetchAllPages(async () => ({ data: null, error: { message: "connection reset" } }), "매물 조회 실패"),
    ).rejects.toThrow("매물 조회 실패: connection reset");
  });

  it("splits long id lists into bounded chunks", () => {
    const ids = rows(451, "id").map(({ id }) => id);

    const chunks = chunkIds(ids);

    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.length)).toEqual([200, 200, 51]);
    expect(chunks.flat()).toEqual(ids);
    expect(chunkIds([], 200)).toEqual([]);
  });
});
