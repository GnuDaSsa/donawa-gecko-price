"use client";

import { useEffect, useRef, useState } from "react";

import { shouldPlayBrandIntro } from "@/lib/brand-intro-policy";

let introPlayedInCurrentDocument = false;

function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return true;

  const navigation = window.performance
    .getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

  return shouldPlayBrandIntro({
    alreadyPlayed: introPlayedInCurrentDocument,
    currentPath: window.location.pathname,
    originalNavigationUrl: navigation?.name,
  });
}

export function BrandIntro() {
  const [visible, setVisible] = useState(shouldPlayIntro);
  const [exiting, setExiting] = useState(false);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    introPlayedInCurrentDocument = true;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const root = document.documentElement;
    root.classList.add("brand-intro-open");

    const exitTimer = window.setTimeout(
      () => setExiting(true),
      reducedMotion ? 650 : 2_850,
    );
    const hideTimer = window.setTimeout(
      () => {
        root.classList.remove("brand-intro-open");
        setVisible(false);
      },
      reducedMotion ? 1_050 : 3_500,
    );

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
      if (skipTimer.current) window.clearTimeout(skipTimer.current);
      root.classList.remove("brand-intro-open");
    };
  }, [visible]);

  function skipIntro() {
    setExiting(true);
    skipTimer.current = setTimeout(() => {
      document.documentElement.classList.remove("brand-intro-open");
      setVisible(false);
    }, 520);
  }

  if (!visible) return null;

  return (
    <section
      className={`brand-intro${exiting ? " brand-intro--exiting" : ""}`}
      aria-label="다나와에서 도나와로 바뀌는 브랜드 인트로"
    >
      <button className="brand-intro__skip" type="button" onClick={skipIntro}>
        바로 둘러보기
      </button>

      <div className="brand-intro__orb brand-intro__orb--one" aria-hidden="true" />
      <div className="brand-intro__orb brand-intro__orb--two" aria-hidden="true" />

      <div className="brand-intro__center">
        <p className="brand-intro__eyebrow">CRESTED GECKO PRICE FINDER</p>
        <div className="brand-intro__wordmark" aria-hidden="true">
          <span className="brand-intro__syllable">
            <span className="brand-intro__consonant" />
            <span className="brand-intro__vowel">
              <span className="brand-intro__vowel-main" />
              <span className="brand-intro__vowel-arm" />
            </span>
          </span>
          <span className="brand-intro__rest">나와</span>
        </div>
        <p className="sr-only">다나와의 ㅏ 회전 후 도나와</p>
        <p className="brand-intro__tagline">도마뱀 가격비교, <strong>도나와.</strong></p>
      </div>

      <div className="brand-intro__progress" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
