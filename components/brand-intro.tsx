"use client";

import { useEffect, useRef } from "react";

import { shouldPlayBrandIntro } from "@/lib/brand-intro-policy";

let introPlayedInCurrentDocument = false;

export function BrandIntro() {
  const wordmark = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const play = shouldPlayBrandIntro({
      alreadyPlayed: introPlayedInCurrentDocument,
      currentPath: window.location.pathname,
      originalNavigationUrl: navigation?.name,
    });
    if (!play) return;

    introPlayedInCurrentDocument = true;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wordmark.current?.setAttribute("data-playing", "");
    }
  }, []);

  return (
    <span
      ref={wordmark}
      className="brand__name brand-intro"
      onAnimationEnd={(event) => {
        if (event.animationName === "brand-vowel-turn") {
          event.currentTarget.removeAttribute("data-playing");
        }
      }}
    >
      <span className="brand-intro__label">도나와</span>
      <span className="brand-intro__wordmark" aria-hidden="true">
        <span className="brand-intro__syllable">
          <span className="brand-intro__consonant" />
          <span className="brand-intro__vowel">
            <span className="brand-intro__vowel-main" />
            <span className="brand-intro__vowel-arm" />
          </span>
        </span>
        <span className="brand-intro__rest">나와</span>
      </span>
    </span>
  );
}
