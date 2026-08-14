import { useEffect, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { WidgetCard, Tabs, WidgetSkeleton, WidgetError, EmptyState, deriveStatus } from "./WidgetCard";
import { api } from "@/lib/api";
import type { LibraryInfo, LibrarySearchResult } from "@/lib/types";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function CatalogSearch() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 400);
  const [results, setResults] = useState<LibrarySearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      setError(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api
      .librarySearch(debounced, controller.signal)
      .then((res) => setResults(res.results))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative px-6 py-4">
        <Search className="absolute top-1/2 left-9 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, authors, subjects..."
          className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pr-4 pl-10 text-sm text-ink placeholder:text-ink-faint focus:border-brass-dim focus:outline-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        {!debounced.trim() ? (
          <EmptyState hints={["algorithms", "Ramanujan"]}>
            Start typing to search the catalog —
          </EmptyState>
        ) : loading ? (
          <WidgetSkeleton />
        ) : error ? (
          <EmptyState>Search failed. Try again.</EmptyState>
        ) : results && results.length === 0 ? (
          <EmptyState>No results for "{debounced}".</EmptyState>
        ) : (
          <ul className="fade-in space-y-2.5">
            {results?.slice(0, 6).map((r, i) => (
              <li
                key={`${r.title}-${i}`}
                className="flex gap-3 rounded-lg border border-border-soft bg-surface-raised/60 p-3"
              >
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-border-soft">
                  {r.coverImageUrl && (
                    <img src={r.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink">{r.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {r.authors.join(", ") || "Unknown author"}
                  </p>
                  {r.firstPublishYear && (
                    <p className="font-data mt-0.5 text-[0.7rem] text-ink-faint">{r.firstPublishYear}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoTab({ info }: { info: LibraryInfo }) {
  return (
    <div className="scroll-soft h-full space-y-5 overflow-y-auto px-6 py-5">
      <div>
        <p className="font-data text-[0.7rem] tracking-wide text-ink-faint uppercase">Hours</p>
        <p className="mt-1.5 text-sm text-ink">General Section — {info.hours.generalSection}</p>
        <p className="text-sm text-ink">TBLS — {info.hours.tbls}</p>
      </div>
      <div>
        <p className="font-data text-[0.7rem] tracking-wide text-ink-faint uppercase">Building</p>
        <p className="mt-1.5 text-sm text-ink">
          {info.building.floors} floors · {info.building.areaSqFt} sq. ft.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {info.building.features.map((f) => (
            <li key={f} className="rounded-full border border-border-soft px-2.5 py-1 text-xs text-ink-muted">
              {f}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-data text-[0.7rem] tracking-wide text-ink-faint uppercase">Contact</p>
        <p className="mt-1.5 text-sm text-ink">{info.contact.phone}</p>
        <p className="text-sm text-ink-muted">{info.contact.libraryEmail}</p>
      </div>
    </div>
  );
}

export function LibraryWidget({ libraryInfo }: { libraryInfo: UseQueryResult<LibraryInfo> }) {
  return (
    <WidgetCard
      title="Library"
      subtitle="Mahatma Gandhi Central Library"
      icon={BookOpen}
      domain="library"
      status={deriveStatus(libraryInfo)}
    >
      <Tabs tabs={["Search Catalog", "Info"]} defaultTab="Search Catalog">
        {(active) =>
          active === "Search Catalog" ? (
            <CatalogSearch />
          ) : libraryInfo.isPending ? (
            <WidgetSkeleton />
          ) : libraryInfo.isError ? (
            <WidgetError onRetry={() => void libraryInfo.refetch()} />
          ) : libraryInfo.data ? (
            <InfoTab info={libraryInfo.data} />
          ) : null
        }
      </Tabs>
    </WidgetCard>
  );
}
