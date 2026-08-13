import { MorphCard } from "@/components/morph-card";
import type { MorphMarketSummary } from "@/lib/types";

export function MorphGrid({ morphs }: { morphs: MorphMarketSummary[] }) {
  return (
    <div className="morph-grid">
      {morphs.map((summary, index) => (
        <MorphCard key={summary.morph.id} summary={summary} index={index} />
      ))}
    </div>
  );
}
