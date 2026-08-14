import { GraduationCap, Quote } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { WidgetCard, Tabs, WidgetSkeleton, WidgetError, EmptyState, deriveStatus } from "./WidgetCard";
import { formatShortDate, relativeLabel, upcoming } from "@/lib/dates";
import type { AcademicsResponse } from "@/lib/types";

export function AcademicsWidget({ academics }: { academics: UseQueryResult<AcademicsResponse> }) {
  const status = deriveStatus(academics);

  if (academics.isPending)
    return (
      <WidgetCard title="Academics" subtitle="Calendar, holidays and campus lore" icon={GraduationCap} domain="academics" status={status}>
        <WidgetSkeleton />
      </WidgetCard>
    );
  if (academics.isError)
    return (
      <WidgetCard title="Academics" subtitle="Calendar, holidays and campus lore" icon={GraduationCap} domain="academics" status={status}>
        <WidgetError onRetry={() => void academics.refetch()} />
      </WidgetCard>
    );

  const calendar = academics.data ? upcoming(academics.data.academicCalendar, (e) => e.date) : [];
  const holidays = academics.data ? upcoming(academics.data.holidays, (h) => h.date) : [];
  const rules = academics.data?.inaneRules ?? [];

  return (
    <WidgetCard title="Academics" subtitle="Calendar, holidays and campus lore" icon={GraduationCap} domain="academics" status={status}>
      <Tabs tabs={["Calendar", "Holidays", "Rules"]} defaultTab="Calendar">
        {(active) => {
          if (active === "Calendar") {
            return calendar.length === 0 ? (
              <EmptyState>No upcoming entries.</EmptyState>
            ) : (
              <ul className="scroll-soft fade-in h-full divide-y divide-border-soft overflow-y-auto px-6 py-2">
                {calendar.map((entry, i) => (
                  <li key={`${entry.event}-${i}`} className="flex items-baseline gap-4 py-3">
                    <span className="font-data w-16 shrink-0 text-sm text-academics">{formatShortDate(entry.date)}</span>
                    <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{entry.event}</span>
                  </li>
                ))}
              </ul>
            );
          }
          if (active === "Holidays") {
            return holidays.length === 0 ? (
              <EmptyState>No holidays ahead.</EmptyState>
            ) : (
              <ul className="scroll-soft fade-in h-full divide-y divide-border-soft overflow-y-auto px-6 py-2">
                {holidays.map((h, i) => (
                  <li key={`${h.name}-${i}`} className="flex items-baseline gap-4 py-3">
                    <span className="font-data w-16 shrink-0 text-sm text-academics">{formatShortDate(h.date)}</span>
                    <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{h.name}</span>
                    <span className="font-data shrink-0 text-xs text-brass">{relativeLabel(h.date)}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return rules.length === 0 ? (
            <EmptyState>No rules recorded.</EmptyState>
          ) : (
            <div className="scroll-soft fade-in h-full space-y-3.5 overflow-y-auto px-6 py-5">
              <p className="text-xs text-ink-faint italic">Unwritten law of Roorkee, written down.</p>
              {rules.map((rule, i) => (
                <article key={rule.ruleId} className="relative rounded-lg border border-dashed border-brass-dim/50 bg-brass-soft px-5 py-4">
                  <span className="font-data absolute -top-2.5 left-4 rounded-full border border-brass-dim/50 bg-surface px-2 py-0.5 text-xs text-brass">
                    №{i + 1}
                  </span>
                  <Quote className="absolute top-3.5 right-4 size-4 text-brass/25" strokeWidth={1.5} />
                  <h3 className="pr-6 text-sm font-medium text-ink">{rule.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{rule.description}</p>
                </article>
              ))}
            </div>
          );
        }}
      </Tabs>
    </WidgetCard>
  );
}
