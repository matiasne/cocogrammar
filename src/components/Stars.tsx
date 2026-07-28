// Renders a 1–3 star score (filled lime, empty dim). Reused on the chapter
// header, sidebar items, and the Overview list.
export function Stars({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex tracking-tight ${className}`}
      title={`${score} of 3 stars`}
      aria-label={`${score} of 3 stars`}
    >
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= score ? "text-lime" : "text-cream/25"}>
          ★
        </span>
      ))}
    </span>
  );
}
