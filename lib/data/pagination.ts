/**
 * Supabase/PostgREST는 `Range` 헤더가 없으면 응답을 서버 기본값(1,000행)에서 자른다.
 * 무음 절단은 합계·최저가·플랫폼 수를 조용히 틀리게 만들기 때문에, 행을 전부
 * 읽어야 하는 조회는 반드시 이 헬퍼를 통해 `range()`로 나눠 받는다.
 */
export const SUPABASE_PAGE_SIZE = 1000;

/** 안전장치: 서버가 range를 무시해도 무한 루프에 빠지지 않는다 (100 × 1,000행). */
const MAX_PAGES = 100;

/** `.in()` 필터 URL 길이 폭주를 막기 위한 id 배치 크기. */
export const ID_CHUNK_SIZE = 200;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * `fetchPage(from, to)`를 1,000행 단위로 호출해 전부 이어 붙인다.
 *
 * 호출자는 **결정적 정렬**(고유 컬럼을 마지막 tie-breaker로 두는 `.order()`)을
 * 보장해야 한다. 정렬이 불안정하면 페이지 경계에서 행이 중복되거나 누락된다.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  errorMessage: string,
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * SUPABASE_PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) throw new Error(`${errorMessage}: ${error.message}`);

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < SUPABASE_PAGE_SIZE) return rows;
  }

  return rows;
}

/** `.in("id", ...)` 한 번에 넣기엔 긴 id 목록을 200개씩 나눈다. */
export function chunkIds(ids: string[], size = ID_CHUNK_SIZE): string[][] {
  if (size < 1) throw new Error("chunkIds size must be positive");

  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}
