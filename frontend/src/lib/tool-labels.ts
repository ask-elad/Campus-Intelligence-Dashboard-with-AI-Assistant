/**
 * Maps raw MCP tool names to a human-readable "doing X..." label shown
 * in the chat while the assistant is working. Never show a raw tool
 * name to the user.
 */
export const TOOL_LABELS: Record<string, string> = {
  search_program_structure: "Looking up course structure",
  get_academic_facts: "Checking the academic calendar",
  get_todays_menu: "Checking today's menu",
  get_menu_by_day: "Checking the mess menu",
  search_eateries: "Looking up eateries",
  get_eatery_details: "Checking eatery details",
  get_bhawan_list: "Checking hostel list",
  get_library_info: "Checking library hours",
  search_books: "Searching the library catalog",
  get_upcoming_club_events: "Checking upcoming events",
  get_fests: "Checking annual fests",
  get_fest_details: "Checking fest details",
  get_events_by_club: "Checking club events",
  search_events: "Searching events",
};

export function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Checking ${toolName.replace(/_/g, " ")}`;
}
