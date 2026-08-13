import { describe, expect, it } from "vitest";

import { shouldPlayBrandIntro } from "@/lib/brand-intro-policy";

describe("shouldPlayBrandIntro", () => {
  it("plays on a direct home document load", () => {
    expect(
      shouldPlayBrandIntro({
        alreadyPlayed: false,
        currentPath: "/",
        originalNavigationUrl: "http://localhost:3000/",
      }),
    ).toBe(true);
  });

  it("does not play when client navigation reaches home from another route", () => {
    expect(
      shouldPlayBrandIntro({
        alreadyPlayed: false,
        currentPath: "/",
        originalNavigationUrl: "http://localhost:3000/morph/lilly-white",
      }),
    ).toBe(false);
  });

  it("does not replay again in the same document", () => {
    expect(
      shouldPlayBrandIntro({
        alreadyPlayed: true,
        currentPath: "/",
        originalNavigationUrl: "http://localhost:3000/",
      }),
    ).toBe(false);
  });

  it("falls back to the current path when navigation metadata is unavailable", () => {
    expect(
      shouldPlayBrandIntro({
        alreadyPlayed: false,
        currentPath: "/",
      }),
    ).toBe(true);
    expect(
      shouldPlayBrandIntro({
        alreadyPlayed: false,
        currentPath: "/nearby",
      }),
    ).toBe(false);
  });
});
