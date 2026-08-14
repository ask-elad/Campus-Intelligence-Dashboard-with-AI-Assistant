import { AskBar } from "./AskBar";
import { LibraryWidget } from "./LibraryWidget";
import { CafeteriaWidget } from "./CafeteriaWidget";
import { EventsWidget } from "./EventsWidget";
import { AcademicsWidget } from "./AcademicsWidget";
import { DEMO_PROFILE } from "@/config/profile";
import type { CampusData } from "@/hooks/useCampusData";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({ data, onAsk }: { data: CampusData; onAsk: (msg: string) => void }) {
  return (
    <div className="scroll-soft h-full overflow-y-auto px-8 py-8 sm:px-12 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">
          {greeting()}, {DEMO_PROFILE.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {DEMO_PROFILE.branch} · {DEMO_PROFILE.year}
          {DEMO_PROFILE.year === 1 ? "st" : DEMO_PROFILE.year === 2 ? "nd" : DEMO_PROFILE.year === 3 ? "rd" : "th"} Year ·{" "}
          {DEMO_PROFILE.bhawan}
        </p>

        <div className="mt-7">
          <AskBar onAsk={onAsk} />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <LibraryWidget libraryInfo={data.libraryInfo} />
          <CafeteriaWidget menu={data.menu} eateries={data.eateries} />
          <EventsWidget events={data.events} />
          <AcademicsWidget academics={data.academics} />
        </div>
      </div>
    </div>
  );
}
