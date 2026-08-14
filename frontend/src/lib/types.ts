// Mirrors the orchestrator's API contract exactly.

export interface LibraryInfo {
  libraryName: string;
  institution: string;
  established: { year: string; note: string };
  building: {
    areaSqFt: string;
    floors: number;
    designedCapacityUsers: number;
    features: string[];
  };
  hours: { generalSection: string; tbls: string };
  contact: {
    librarianEmail: string;
    libraryEmail: string;
    phone: string;
    address: string;
  };
}

export interface LibrarySearchResult {
  title: string;
  authors: string[];
  firstPublishYear: number | null;
  coverImageUrl: string | null;
}

export interface LibrarySearchResponse {
  query: string;
  totalFound: number;
  results: LibrarySearchResult[];
  fromCache: boolean;
}

export interface MenuSlot {
  special: string;
  daily: string;
}

export interface TodaysMenu {
  day: string;
  breakfast: MenuSlot;
  lunch: MenuSlot;
  dinner: MenuSlot;
}

export interface Eatery {
  name: string;
  type: string;
  location: string;
  popularItems: string[];
  priceRating: string;
  timing: string;
}

export interface EateriesResponse {
  query: string;
  count: number;
  results: Eatery[];
}

export interface ClubEvent {
  id: string;
  club: string;
  eventName: string;
  date: string;
  time: string;
  venue: string;
  description: string;
}

export interface Fest {
  name: string;
  type: string;
  dates: string;
  description: string;
  eventsList: Array<{ name: string; time?: string; venue?: string; rules?: string }>;
}

export interface EventsResponse {
  events: ClubEvent[];
  fests: Fest[];
}

export interface CalendarEntry {
  event: string;
  date: string;
  day: string;
}

export interface Holiday {
  name: string;
  date: string;
  day: string;
}

export interface BranchCutoff {
  branch: string;
  cutoff: number;
}

export interface InaneRule {
  ruleId: string;
  title: string;
  description: string;
}

export interface AcademicsResponse {
  academicCalendar: CalendarEntry[];
  holidays: Holiday[];
  branchChangeCutoffs2024: BranchCutoff[];
  inaneRules: InaneRule[];
  acads101: {
    grading: string;
    backsPolicy: string;
    extracurricularRequirement: string;
    creditsDescription: string;
  };
  sparkFellowship: { description: string; eligibility: string };
}

export type ChatStreamEvent =
  | { type: "tool_call"; toolName: string }
  | { type: "tool_result"; toolName: string }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps: string[];
  streaming?: boolean;
}
