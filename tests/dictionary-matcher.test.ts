import { describe, expect, it } from "vitest";

import {
  matchDictionary,
  type DictionaryRow,
} from "@/supabase/functions/_shared/dictionary";

const rows: DictionaryRow[] = [
  { id: "lw", slug: "lilly-white", name_ko: "릴리화이트", aliases: ["릴리화이트", "릴리"] },
  { id: "ax", slug: "axanthic", name_ko: "아잔틱", aliases: ["아잔틱"] },
  { id: "la", slug: "lilly-axanthic", name_ko: "릴잔틱", aliases: ["릴잔틱"] },
  { id: "cap", slug: "cappuccino", name_ko: "카푸치노", aliases: ["카푸치노"] },
  { id: "frap", slug: "frappuccino", name_ko: "프라푸치노", aliases: ["프라푸치노"] },
  { id: "sable", slug: "sable", name_ko: "세이블", aliases: ["세이블"] },
];

describe("collector dictionary matching", () => {
  it("does not classify non-Lilly animals as Lilly White", () => {
    expect(matchDictionary("토리멀 논릴리 베이비", rows)).toBeUndefined();
    expect(matchDictionary("non-lilly whitewall", rows)).toBeUndefined();
  });

  it("treats het Axanthic as a trait, not the visual Axanthic morph", () => {
    expect(matchDictionary("세이블 헷100 아잔틱", rows)?.slug).toBe("sable");
    expect(matchDictionary("릴리 100% 헷 아잔틱", rows)?.slug).toBe("lilly-white");
  });

  it("recognizes explicit compound genetic morphs", () => {
    expect(matchDictionary("릴리화이트 카푸치노", rows)?.slug).toBe("frappuccino");
    expect(matchDictionary("릴리화이트 아잔틱", rows)?.slug).toBe("lilly-axanthic");
  });
});
