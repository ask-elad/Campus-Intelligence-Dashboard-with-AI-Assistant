"use client";
import { useApp } from "./context/AppContext";
import { QuickAsk } from "@/components/widgets/QuickAsk";
import { LibraryWidget } from "@/components/widgets/LibraryWidget";
import { CafeteriaWidget } from "@/components/widgets/CafeteriaWidget";
import { EventsWidget } from "@/components/widgets/EventsWidget";
import { AcademicsWidget } from "@/components/widgets/AcademicsWidget";

export default function DashboardPage() {
  const { profile } = useApp();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
          {greeting}, {profile.name.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-2)" }}>
          {profile.branch} · {profile.year} · Here's your campus at a glance
        </p>
      </div>

      {/* Quick Ask */}
      <QuickAsk />

      {/* Widget Grid */}
      <div className="dashboard-grid">
        <LibraryWidget />
        <CafeteriaWidget />
        <EventsWidget />
        <AcademicsWidget />
      </div>
    </div>
  );
}
