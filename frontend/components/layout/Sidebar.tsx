"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import { useState, useEffect } from "react";
import { LayoutDashboard, MessageCircle, Moon, Sun, ChevronDown, ChevronUp, User } from "lucide-react";

interface ServerStatus { name: string; label: string; connected: boolean; latencyMs: number | null; }

export function Sidebar() {
  const pathname = usePathname();
  const { profile, setProfile, demoProfiles, theme, toggleTheme } = useApp();
  const [statuses, setStatuses] = useState<ServerStatus[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [customName, setCustomName] = useState(profile.name);
  const [customId, setCustomId] = useState(profile.id);
  const [customBranch, setCustomBranch] = useState(profile.branch);
  const [customYear, setCustomYear] = useState(profile.year);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const r = await fetch("/api/status");
        if (r.ok) { const d = await r.json(); setStatuses(d.servers || []); }
      } catch {}
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, []);

  const nav = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { href: "/assistant", label: "AI Assistant", icon: <MessageCircle size={16} /> }
  ];

  const initials = profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-orb">CP</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>Campus Pulse</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.05em" }}>IIT ROORKEE</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.08em", padding: "4px 12px 8px", textTransform: "uppercase" }}>Navigation</div>
        {nav.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`}>
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* MCP Server Status */}
        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.08em", padding: "16px 12px 8px", textTransform: "uppercase" }}>MCP Servers</div>
        {statuses.length === 0 ? (
          <div style={{ padding: "4px 12px" }}>
            {["Library", "Cafeteria", "Events", "Academics"].map(n => (
              <div key={n} className="list-row" style={{ padding: "5px 0", borderBottom: "none" }}>
                <div className="skeleton" style={{ width: "100%", height: 14 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "0 4px" }}>
            {statuses.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`status-dot ${s.connected ? "online" : "offline"}`} />
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>{s.label}</span>
                </div>
                {s.connected && s.latencyMs !== null && (
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>{s.latencyMs}ms</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Theme toggle */}
        <div style={{ marginTop: 12, padding: "0 4px" }}>
          <button className="nav-item" style={{ width: "100%" }} onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </nav>

      {/* Profile */}
      <div className="profile-section">
        <button
          onClick={() => setProfileOpen(o => !o)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, color: "var(--text)" }}
        >
          <div className="profile-avatar">{initials}</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{profile.year} · {profile.branch.split(" ")[0]}</div>
          </div>
          {profileOpen ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
        </button>

        {profileOpen && (
          <div style={{ marginTop: 8, padding: "10px", background: "var(--bg-3)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Quick switch:</div>
            {demoProfiles.map(p => (
              <button key={p.id} onClick={() => setProfile(p)}
                style={{ display: "block", width: "100%", textAlign: "left", background: profile.id === p.id ? "var(--primary-dim)" : "transparent",
                  border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 6,
                  color: profile.id === p.id ? "var(--primary)" : "var(--text-2)", fontSize: 12, marginBottom: 2 }}>
                {p.name} <span style={{ color: "var(--text-3)", fontSize: 10 }}>({p.branch.split(" ")[0]})</span>
              </button>
            ))}
            <div className="divider" />
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Custom profile:</div>
            {[["Name", customName, setCustomName], ["Student ID", customId, setCustomId],
              ["Branch", customBranch, setCustomBranch], ["Year", customYear, setCustomYear]].map(([label, val, setter]) => (
              <input key={label as string} className="input" style={{ marginBottom: 5, fontSize: 12, padding: "5px 8px" }}
                placeholder={label as string} value={val as string}
                onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)} />
            ))}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "6px" }}
              onClick={() => { setProfile({ name: customName, id: customId, branch: customBranch, year: customYear }); setProfileOpen(false); }}>
              <User size={12} /> Apply
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
