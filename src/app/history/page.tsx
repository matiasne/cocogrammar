import Link from "next/link";
import { getHistory, countHistory } from "@/db/queries";
import { getUserOrNull } from "@/lib/auth";
import { FeedbackPanel } from "@/components/FeedbackPanel";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getUserOrNull();

  // Public page: guests see an invitation to log in rather than someone's log.
  if (!user) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">
          Every slip, filed away
        </p>
        <h1 className="mt-3 font-sans text-5xl font-extralight leading-tight text-cream md:text-6xl">
          Your log
        </h1>
        <p className="mt-4 font-reading text-lg font-normal leading-relaxed text-cream/85">
          Log in to see every sentence you&rsquo;ve tasted and the lessons pressed
          from them.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright hover:text-ink"
        >
          Log in →
        </Link>
      </div>
    );
  }

  const { page: pageParam } = await searchParams;

  const total = await countHistory(user.id);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1),
  );
  const history = await getHistory(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">
          Every slip, filed away
        </p>
        <h1 className="mt-3 font-sans text-5xl font-extralight leading-tight text-cream md:text-6xl">
          Your log
        </h1>
        <p className="mt-2 font-script text-3xl text-lime md:text-4xl">
          {total} sentence{total === 1 ? "" : "s"} tasted
        </p>
      </header>

      {total === 0 ? (
        <p className="max-w-lg text-base font-light leading-relaxed text-cream/50">
          Nothing yet. Head to <span className="text-cream">Write</span> to check your
          first sentence.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-px overflow-hidden rounded-2xl bg-cream/10">
            {history.map((item) => (
              <li key={item.submissionId} className="bg-cocoa-panel p-6">
                <details>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full border border-lime/40 px-2.5 py-0.5 text-[11px] font-light uppercase tracking-[0.1em] text-lime">
                          {item.analysis.levelEstimate}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-cream/40">
                          {item.analysis.mistakes.length} slip
                          {item.analysis.mistakes.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <span className="text-xs font-light text-cream/40">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-lg font-extralight text-cream/80">
                      {item.originalText}
                    </p>
                  </summary>

                  <div className="mt-5 grid gap-6 border-t border-cream/10 pt-5 md:grid-cols-2">
                    <div>
                      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
                        Original
                      </p>
                      <p className="whitespace-pre-wrap font-reading text-base font-normal text-cream/80">
                        {item.originalText}
                      </p>
                      <p className="mb-1.5 mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
                        Corrected
                      </p>
                      <p className="whitespace-pre-wrap font-reading text-base font-normal text-cream">
                        {item.correctedText}
                      </p>
                    </div>
                    <FeedbackPanel analysis={item.analysis} />
                  </div>
                </details>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-4 pt-2">
              {page > 1 ? (
                <Link
                  href={`/history?page=${page - 1}`}
                  className="rounded-3xl border border-cream/28 px-5 py-2 text-[13px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
                >
                  ← Newer
                </Link>
              ) : (
                <span className="rounded-3xl border border-cream/10 px-5 py-2 text-[13px] font-light uppercase tracking-[0.12em] text-cream/25">
                  ← Newer
                </span>
              )}

              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={`/history?page=${page + 1}`}
                  className="rounded-3xl border border-cream/28 px-5 py-2 text-[13px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
                >
                  Older →
                </Link>
              ) : (
                <span className="rounded-3xl border border-cream/10 px-5 py-2 text-[13px] font-light uppercase tracking-[0.12em] text-cream/25">
                  Older →
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
