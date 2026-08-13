import { access } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { morphs } from "@/lib/data/morphs";
import { catalogTraits } from "@/lib/data/catalog-traits";

describe("curated fallback images", () => {
  it("keeps the original 20 reviewed local fallback assets unique", async () => {
    const visibleSubjects = [
      ...morphs.filter((morph) => morph.visibleOnHome),
      ...catalogTraits.map(({ subject }) => subject),
    ];
    const imagePaths = visibleSubjects.map((subject) => subject.representativeImage);

    expect(visibleSubjects).toHaveLength(20);
    expect(new Set(imagePaths)).toHaveLength(visibleSubjects.length);

    await Promise.all(
      imagePaths.map(async (imagePath) => {
        expect(imagePath).toMatch(/^\/morphs\/[a-z-]+\.webp$/);
        await expect(
          access(join(process.cwd(), "public", imagePath.slice(1))),
        ).resolves.toBeUndefined();
      }),
    );
  });
});
