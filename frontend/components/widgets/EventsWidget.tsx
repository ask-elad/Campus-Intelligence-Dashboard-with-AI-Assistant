"use client";
import { useState, useEffect } from "react";
import { Calendar, Star } from "lucide-react";

interface ClubEvent { id: string; club: string; eventName: string; date: string; time: string; venue: string; description: string; }
interface Fest { name: string; type: string; dates: string; description: string; eventsList: { name: string; description: string }[]; }

export function EventsWidget() {
  const [tab, setTab] = useState<"upcoming" | "fests">("upcoming");
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [fests, setFests] = useState<Fest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFest, setExpandedFest] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events/upcoming?days=60").then(r => r.json()).then(d => { setEvents(d.events || []); setLoading(false); }).catch(() => setLoading(false));
    fetch("/api/events/fests").then(r => r.json()).then(d => setFests(d.fests || [])).catch(() => {});
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return { day: d.getDate(), month: d.toLocaleString("en", { month: "short" }), weekday: d.toLocaleString("en", { weekday: "short" }) };
  };

  const daysBetween = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 380 }}>
      <div className="widget-header">
        <div className="widget-title">
          <span className="widget-title-dot" style={{ background: "var(--evt-accent)" }} />
          <Calendar size={14} color="var(--evt-accent)" />
          <span>Events</span>
        </div>
        <span className="badge badge-green">{events.length} upcoming</span>
      </div>

      <div className="tabs">
        {(["upcoming", "fests"] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "upcoming" ? "Club Events" : `Annual Fests (${fests.length})`}
          </button>
        ))}
      </div>

      <div className="widget-body" style={{ flex: 1, overflowY: "auto", maxHeight: 310 }}>
        {tab === "upcoming" ? (
          loading ? (
            <>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 8 }} />)}</>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Calendar size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div>No upcoming events in the next 60 days</div>
            </div>
          ) : events.map(ev => {
            const { day, month, weekday } = formatDate(ev.date);
            const daysLeft = daysBetween(ev.date);
            return (
              <div key={ev.id} className="list-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <div style={{ textAlign: "center", background: "var(--evt-dim)", border: "1px solid rgba(52,211,153,0.2)",
                  borderRadius: 8, padding: "6px 10px", flexShrink: 0, minWidth: 48 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--evt-accent)", lineHeight: 1 }}>{day}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600 }}>{month}</div>
                  <div style={{ fontSize: 9, color: "var(--text-3)" }}>{weekday}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{ev.eventName}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                    <span className="badge badge-blue">{ev.club}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>📍 {ev.venue}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>🕐 {ev.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{ev.description}</div>
                  {daysLeft <= 7 && <span className="badge badge-amber" style={{ marginTop: 4 }}>In {daysLeft}d</span>}
                </div>
              </div>
            );
          })
        ) : (
          fests.map(f => (
            <div key={f.name} style={{ background: "var(--bg-3)", borderRadius: 8, padding: "12px", marginBottom: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>📅 {f.dates}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="badge badge-violet">{f.type}</span>
                  <button onClick={() => setExpandedFest(expandedFest === f.name ? null : f.name)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 11 }}>
                    {expandedFest === f.name ? "▲" : "▼"}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: expandedFest === f.name ? 8 : 0 }}>{f.description}</div>
              {expandedFest === f.name && f.eventsList && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Sub-events</div>
                  {f.eventsList.map((se, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                      <Star size={10} color="var(--evt-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{se.name}</span>
                        {se.description && <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>— {se.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
