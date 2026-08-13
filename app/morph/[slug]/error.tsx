"use client";

export default function MorphError({ reset }: { reset: () => void }) {
  return (
    <main className="route-state" role="alert">
      <div className="route-state__mark route-state__mark--error" aria-hidden="true" />
      <p className="eyebrow">DATA CONNECTION ERROR</p>
      <h1>매물 로드 실패</h1>
      <p>잠시 후 다시 시도</p>
      <button type="button" className="route-state__button" onClick={reset}>
        다시 시도
      </button>
    </main>
  );
}
