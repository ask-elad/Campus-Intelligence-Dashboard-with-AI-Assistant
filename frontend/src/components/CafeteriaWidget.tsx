import { useState } from "react";
import { Utensils } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { WidgetCard, Tabs, WidgetSkeleton, WidgetError, EmptyState, deriveStatus } from "./WidgetCard";
import { cn } from "@/lib/utils";
import type { EateriesResponse, MenuSlot, TodaysMenu } from "@/lib/types";

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;
type Meal = (typeof MEALS)[number];

function MenuSlotView({ slot }: { slot: MenuSlot }) {
  return (
    <div className="fade-in space-y-4 px-6 py-5">
      <div>
        <p className="font-data text-[0.7rem] tracking-wide text-cafeteria uppercase">Today's special</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink">{slot.special}</p>
      </div>
      <div>
        <p className="font-data text-[0.7rem] tracking-wide text-ink-faint uppercase">Always available</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{slot.daily}</p>
      </div>
    </div>
  );
}

function TodaysMenuTab({ menu }: { menu: TodaysMenu }) {
  const [meal, setMeal] = useState<Meal>("Breakfast");
  const slot = menu[meal.toLowerCase() as "breakfast" | "lunch" | "dinner"];

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 px-6 pt-4">
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              meal === m
                ? "border-brass-dim bg-brass-soft text-brass"
                : "border-border-soft text-ink-muted hover:text-ink"
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MenuSlotView slot={slot} />
      </div>
    </div>
  );
}

function EateriesTab({ data }: { data: EateriesResponse }) {
  if (data.results.length === 0) return <EmptyState>No eateries listed.</EmptyState>;
  return (
    <ul className="scroll-soft fade-in h-full space-y-3 overflow-y-auto px-6 py-5">
      {data.results.map((e) => (
        <li key={e.name} className="rounded-lg border border-border-soft bg-surface-raised/60 p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-ink">{e.name}</h3>
            <span className="font-data shrink-0 text-xs text-brass">{e.priceRating}</span>
          </div>
          <p className="font-data mt-0.5 text-xs text-ink-faint">
            {e.type} · {e.location}
          </p>
          <p className="mt-1.5 text-xs text-ink-muted">{e.popularItems.join(", ")}</p>
          <p className="font-data mt-1.5 text-[0.7rem] text-ink-faint">{e.timing}</p>
        </li>
      ))}
    </ul>
  );
}

export function CafeteriaWidget({
  menu,
  eateries,
}: {
  menu: UseQueryResult<TodaysMenu>;
  eateries: UseQueryResult<EateriesResponse>;
}) {
  return (
    <WidgetCard
      title="Cafeteria"
      subtitle="Mess menu & nearby eateries"
      icon={Utensils}
      domain="cafeteria"
      status={deriveStatus(menu, eateries)}
    >
      <Tabs tabs={["Today's Menu", "Eateries"]} defaultTab="Today's Menu">
        {(active) =>
          active === "Today's Menu" ? (
            menu.isPending ? (
              <WidgetSkeleton />
            ) : menu.isError ? (
              <WidgetError onRetry={() => void menu.refetch()} />
            ) : menu.data ? (
              <TodaysMenuTab menu={menu.data} />
            ) : null
          ) : eateries.isPending ? (
            <WidgetSkeleton />
          ) : eateries.isError ? (
            <WidgetError onRetry={() => void eateries.refetch()} />
          ) : eateries.data ? (
            <EateriesTab data={eateries.data} />
          ) : null
        }
      </Tabs>
    </WidgetCard>
  );
}
