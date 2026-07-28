import type { Analysis } from "@/lib/schemas";

export function FeedbackPanel({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-lime/40 px-3 py-1 text-xs font-light uppercase tracking-[0.12em] text-lime">
          Level {analysis.levelEstimate}
        </span>
      </div>

      {analysis.grammarNotes && (
        <p className="font-reading text-sm font-normal leading-relaxed text-cream/70">
          {analysis.grammarNotes}
        </p>
      )}

      <section>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
          Slips ({analysis.mistakes.length})
        </p>
        {analysis.mistakes.length === 0 ? (
          <p className="text-sm font-light text-cream/50">No grammar slips found. 🍫</p>
        ) : (
          <div className="flex flex-col gap-px overflow-hidden rounded-xl bg-cream/10">
            {analysis.mistakes.map((m, i) => (
              <div key={i} className="bg-cocoa-panel p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
                    {m.category}
                  </span>
                </div>
                <p className="font-reading text-lg font-normal leading-relaxed text-cream">
                  <span className="text-cream/35 line-through decoration-lime/70">
                    {m.excerpt}
                  </span>{" "}
                  <span className="text-lime">{m.correction}</span>
                </p>
                <p className="mt-1.5 font-reading text-sm font-normal text-cream/60">
                  {m.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {analysis.typos.length > 0 && (
        <section>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
            Typos ({analysis.typos.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {analysis.typos.map((t, i) => (
              <li
                key={i}
                className="rounded-full border border-cream/15 px-3 py-1 text-sm font-light"
              >
                <span className="text-cream/40 line-through decoration-lime/60">
                  {t.original}
                </span>
                <span className="mx-1.5 text-cream/40">→</span>
                <span className="text-lime">{t.corrected}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
          What you did well
        </p>
        {analysis.strengths.length === 0 ? (
          <p className="text-sm font-light text-cream/40">—</p>
        ) : (
          <ul className="space-y-1.5 text-sm font-light text-cream/75">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-lime">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
