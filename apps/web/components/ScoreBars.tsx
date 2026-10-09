import type { Methodology, ProductScores } from "@veredito/core";
import { score } from "@/lib/format";

export function ScoreBars({ scores, methodology }: { scores: ProductScores; methodology: Methodology }) {
  return (
    <div className="bars">
      {methodology.criteria.map((c) => {
        const v = scores.criteria[c.key]?.final;
        return (
          <div className="bar" key={c.key}>
            <span>{c.label}</span>
            <span className="track" aria-hidden="true">
              <span className="fill" style={{ width: `${(v ?? 0) * 10}%`, display: "block" }} />
            </span>
            <strong aria-label={`${c.label}: ${v == null ? "sem dados" : score(v)}`}>{score(v)}</strong>
          </div>
        );
      })}
    </div>
  );
}
