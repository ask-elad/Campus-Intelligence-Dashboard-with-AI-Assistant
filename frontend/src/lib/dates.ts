/**
 * Small, dependency-free date helpers. The backend gives dates as ISO
 * strings, sometimes as ranges like "2026-07-14 to 2026-07-15" — always
 * take the first date in a range for sorting/filtering purposes.
 */

function firstDate(raw: string): Date | null {
  const first = raw.split(" to ")[0]?.trim();
  if (!first) return null;
  const d = new Date(first);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatShortDate(raw: string): string {
  const d = firstDate(raw);
  if (!d) return raw;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeLabel(raw: string): string {
  const d = firstDate(raw);
  if (!d) return "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86_400_000);

  if (diffDays < 0) return "past";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 30) return `in ${diffDays} days`;
  return "";
}

/**
 * Filters + sorts a list of items to only those whose date falls within
 * the next `windowDays` (default: no upper bound, just future + sorted).
 */
export function upcoming<T>(
  items: T[],
  getDate: (item: T) => string,
  windowDays?: number
): T[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const cutoff = windowDays
    ? new Date(now.getTime() + windowDays * 86_400_000)
    : null;

  return items
    .map((item) => ({ item, date: firstDate(getDate(item)) }))
    .filter(
      (x): x is { item: T; date: Date } =>
        x.date !== null && x.date >= now && (!cutoff || x.date <= cutoff)
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((x) => x.item);
}

/**
 * Returns the next N items by date, sorted nearest-first, regardless of
 * how far out they are — unlike upcoming()'s day-window, this always
 * returns something useful even if events are sparse or clustered.
 */
export function takeUpcoming<T>(items: T[], getDate: (item: T) => string, count: number): T[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return items
    .map((item) => ({ item, date: firstDate(getDate(item)) }))
    .filter((x): x is { item: T; date: Date } => x.date !== null && x.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, count)
    .map((x) => x.item);
}