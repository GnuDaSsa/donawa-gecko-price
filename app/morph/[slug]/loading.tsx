export default function LoadingMorph() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <div className="route-state__mark" aria-hidden="true" />
      <p className="eyebrow">LIVE ASKING PRICES</p>
      <h1>최신 매물 확인 중</h1>
      <p>판매 중 · 고정가 기준</p>
    </main>
  );
}
