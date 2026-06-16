"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import { MessageCircle, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { profile } = useApp();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="navbar">
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-2)" }}>{dateStr}</span>
      </div>
      <nav style={{ display: "flex", gap: 4 }}>
        {[{ href: "/", label: "Dashboard", icon: <LayoutDashboard size={14} /> },
          { href: "/assistant", label: "AI Assistant", icon: <MessageCircle size={14} /> }
        ].map(item => (
          <Link key={item.href} href={item.href}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7,
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              background: pathname === item.href ? "var(--primary-dim)" : "transparent",
              color: pathname === item.href ? "var(--primary)" : "var(--text-2)",
              border: pathname === item.href ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent" }}>
            {item.icon}{item.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>Welcome,</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{profile.name.split(" ")[0]}</span>
      </div>
    </header>
  );
}
