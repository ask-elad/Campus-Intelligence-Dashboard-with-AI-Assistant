"use client";
import { useState, useEffect } from "react";
import { GraduationCap, Info } from "lucide-react";

interface AcadEvent { event: string; date: string; day?: string; isUpcoming?: boolean | null; }
interface Holiday { name: string; date: string; day?: string; daysUntil?: number; }

export function AcademicsWidget() {
  const [tab, setTab] = useState<"calendar" | "holidays" | "rules">("calendar");
  const [events, setEvents] = useState<AcadEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [rules, setRules] = useState<{ ruleId: string; title: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/academics/calendar").then(r => r.json()).then(d => { setEvents(d.events || []); setLoading(false); }).catch(() => setLoading(false));
    fetch("/api/academics/holidays").then(r => r.json()).then(d => setHolidays(d.holidays || [])).catch(() => {});
    fetch("/api/academics/rules").then(r => r.json()).then(d => setRules(d.rules || [])).catch(() => {});
  }, []);

  const upcoming = events.filter(e => e.isUpcoming !== false).slice(0, 8);
  const nextHolidays = holidays.filter(h => (h.daysUntil ?? 0) >= 0).slice(0, 8);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return dateStr;
    if (dateStr.includes(" to ")) {
      const parts = dateStr.split(" to ");
      const start = new Date(parts[0].trim());
      const end = new Date(parts[1].trim());
      return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    }
    return new Date(dateStr.trim()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 380 }}>
      <div className="widget-header">
        <div className="widget-title">
          <span className="widget-title-dot" style={{ background: "var(--acad-accent)" }} />
          <GraduationCap size={14} color="var(--acad-accent)" />
          <span>Academics</span>
        </div>
        <span className="badge badge-violet">{upcoming.length} upcoming</span>
      </div>

      <div className="tabs">
        {(["calendar", "holidays", "rules"] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="widget-body" style={{ flex: 1, overflowY: "auto", maxHeight: 310 }}>
        {tab === "calendar" && (
          loading ? (
            <>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 7 }} />)}</>
          ) : upcoming.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>No upcoming academic events</div>
          ) : upcoming.map((ev, i) => (
            <div key={i} className="list-row">
              <div style={{ width: 3, borderRadius: 2, background: "var(--acad-accent)", alignSelf: "stretch", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{ev.event}</div>
                <div style={{ fontSize: 11, color: "var(--acad-accent)" }}>{formatDate(ev.date)}{ev.day ? ` · ${ev.day}` : ""}</div>
              </div>
            </div>
          ))
        )}

        {tab === "holidays" && (
          nextHolidays.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>No upcoming holidays</div>
          ) : nextHolidays.map((h, i) => (
            <div key={i} className="list-row">
              <div style={{ textAlign: "center", minWidth: 44, background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 7, padding: "5px 4px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>
                  {new Date(h.date).getDate()}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600 }}>
                  {new Date(h.date).toLocaleString("en", { month: "short" })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{h.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {h.day || new Date(h.date).toLocaleString("en", { weekday: "long" })}
                  {h.daysUntil !== undefined && h.daysUntil >= 0 && (
                    <span style={{ marginLeft: 8, color: "var(--green)" }}>in {h.daysUntil}d</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {tab === "rules" && (
          rules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
              <div>Rules not loaded.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Make sure the Academics MCP server is running.</div>
            </div>
          ) : rules.slice(0, 8).map(r => (
            <div key={r.ruleId} style={{ marginBottom: 10, padding: "10px 12px", background: "var(--bg-3)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
                <Info size={13} color="var(--acad-accent)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.title}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, paddingLeft: 19 }}>{r.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
