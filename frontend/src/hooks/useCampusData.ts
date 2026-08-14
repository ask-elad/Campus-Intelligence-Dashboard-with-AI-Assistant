import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const common = { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } as const;

export function useCampusData() {
  const libraryInfo = useQuery({
    queryKey: ["library-info"],
    queryFn: ({ signal }) => api.libraryInfo(signal),
    ...common,
  });
  const menu = useQuery({
    queryKey: ["todays-menu"],
    queryFn: ({ signal }) => api.todaysMenu(signal),
    ...common,
  });
  const eateries = useQuery({
    queryKey: ["eateries"],
    queryFn: ({ signal }) => api.eateries(signal),
    ...common,
  });
  const events = useQuery({
    queryKey: ["events"],
    queryFn: ({ signal }) => api.events(signal),
    ...common,
  });
  const academics = useQuery({
    queryKey: ["academics"],
    queryFn: ({ signal }) => api.academics(signal),
    ...common,
  });

  return { libraryInfo, menu, eateries, events, academics };
}

export type CampusData = ReturnType<typeof useCampusData>;
export type ServerStatus = "loading" | "online" | "offline";

function statusOf(q: { isPending: boolean; isError: boolean }): ServerStatus {
  if (q.isError) return "offline";
  if (q.isPending) return "loading";
  return "online";
}

function merge(...states: ServerStatus[]): ServerStatus {
  if (states.includes("offline")) return "offline";
  if (states.includes("loading")) return "loading";
  return "online";
}

export function serverStatuses(d: CampusData): Record<string, ServerStatus> {
  return {
    library: statusOf(d.libraryInfo),
    cafeteria: merge(statusOf(d.menu), statusOf(d.eateries)),
    events: statusOf(d.events),
    academics: statusOf(d.academics),
  };
}
