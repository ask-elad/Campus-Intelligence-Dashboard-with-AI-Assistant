import { CalendarHeart } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { WidgetCard, Tabs, WidgetSkeleton, WidgetError, EmptyState, deriveStatus } from "./WidgetCard";
import { formatShortDate, relativeLabel, upcoming, takeUpcoming } from "@/lib/dates";
import type { EventsResponse } from "@/lib/types";

export function EventsWidget({ events }: { events: UseQueryResult<EventsResponse> }) {
  const status = deriveStatus(events);

  if (events.isPending)
    return (
      <WidgetCard title="Events" subtitle="Clubs, fests and everything in between" icon={CalendarHeart} domain="events" status={status}>
        <WidgetSkeleton />
      </WidgetCard>
    );
  if (events.isError)
    return (
      <WidgetCard title="Events" subtitle="Clubs, fests and everything in between" icon={CalendarHeart} domain="events" status={status}>
        <WidgetError onRetry={() => void events.refetch()} />
      </WidgetCard>
    );

  const clubEvents = events.data ? takeUpcoming(events.data.events, (e) => e.date, 5) : [];
  const fests = events.data ? upcoming(events.data.fests, (f) => f.dates, 30) : [];

  return (
    <WidgetCard title="Events" subtitle="Clubs, fests and everything in between" icon={CalendarHeart} domain="events" status={status}>
      <Tabs tabs={["Club Events", "Annual Fests"]} defaultTab="Club Events">
        {(active) =>
          active === "Club Events" ? (
            clubEvents.length === 0 ? (
              <EmptyState>No upcoming club events.</EmptyState>
            ) : (
              <ul className="scroll-soft fade-in h-full space-y-3 overflow-y-auto px-6 py-5">
                {clubEvents.map((e) => (
                  <li key={e.id} className="flex gap-4 rounded-lg border border-border-soft bg-surface-raised/60 p-3.5">
                    <div className="w-14 shrink-0 border-r border-border-soft pr-3.5 text-center">
                      <p className="font-data text-sm font-medium text-events">{formatShortDate(e.date)}</p>
                      <p className="font-data mt-0.5 text-[0.7rem] text-ink-faint">{e.time}</p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm leading-snug font-medium text-ink">{e.eventName}</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {e.club} · {e.venue}
                      </p>
                      <p className="font-data mt-1.5 text-xs text-brass">{relativeLabel(e.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : fests.length === 0 ? (
            <EmptyState>No fests in the next 30 days.</EmptyState>
          ) : (
            <div className="scroll-soft fade-in h-full space-y-3 overflow-y-auto px-6 py-5">
              {fests.map((f) => (
                <article key={f.name} className="rounded-lg border border-border-soft bg-surface-raised/60 p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium text-ink">{f.name}</h3>
                    <span className="font-data shrink-0 text-xs text-brass">{relativeLabel(f.dates)}</span>
                  </div>
                  <p className="font-data mt-0.5 text-xs text-ink-faint">
                    {f.type} · {f.dates}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{f.description}</p>
                </article>
              ))}
            </div>
          )
        }
      </Tabs>
    </WidgetCard>
  );
}
