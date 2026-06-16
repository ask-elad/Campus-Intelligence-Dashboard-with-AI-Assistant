"use client";
import { useState, useEffect } from "react";
import { BookOpen, Search, Clock, AlertCircle } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import Link from "next/link";

interface Book { id: string; title: string; authors: string; status: string; availableCopies: number; totalCopies: number; callNumber: string; location: string; }
interface BorrowedBook { bookId: string; title: string; authors: string[]; dueDate: string; }

export function LibraryWidget() {
  const { profile } = useApp();
  const [tab, setTab] = useState<"search" | "borrowed">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [borrowed, setBorrowed] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch("/api/library/hours").then(r => r.json()).then(d => setHours(d)).catch(() => {});
    fetchBorrowed();
  }, [profile.id]);

  const fetchBorrowed = async () => {
    try {
      const r = await fetch(`/api/library/borrowed?student_id=${encodeURIComponent(profile.id)}`);
      const d = await r.json();
      setBorrowed(d.books || []);
    } catch {}
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/library/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults((d.books || []).slice(0, 6));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { const t = setTimeout(() => doSearch(query), 350); return () => clearTimeout(t); }, [query]);

  const daysUntil = (due: string) => Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 380 }}>
      <div className="widget-header">
        <div className="widget-title">
          <span className="widget-title-dot" style={{ background: "var(--lib-accent)" }} />
          <BookOpen size={14} color="var(--lib-accent)" />
          <span>MGCL Library</span>
        </div>
        {hours && <span style={{ fontSize: 11, color: "var(--text-3)" }}>Open till midnight</span>}
      </div>

      <div className="tabs">
        {(["search", "borrowed"] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "search" ? "Search Catalog" : `Borrowed (${borrowed.length})`}
          </button>
        ))}
      </div>

      <div className="widget-body" style={{ flex: 1 }}>
        {tab === "search" ? (
          <>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by title, author, call number…"
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            {loading && <div className="skeleton" style={{ height: 14, marginBottom: 8 }} />}
            {results.length === 0 && !loading && query.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-3)", fontSize: 13 }}>
                <BookOpen size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                <div>Type to search the catalog</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Or <Link href="/assistant" style={{ color: "var(--accent)" }}>ask the AI</Link> for recommendations</div>
              </div>
            )}
            {results.map(book => (
              <div key={book.id} className="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{book.authors}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge ${book.status === "Available" ? "badge-green" : "badge-amber"}`}>{book.status}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{book.availableCopies}/{book.totalCopies} copies · {book.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {borrowed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-3)", fontSize: 13 }}>
                <Clock size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                <div>No books currently borrowed</div>
              </div>
            ) : borrowed.map(b => {
              const days = daysUntil(b.dueDate);
              return (
                <div key={b.bookId} className="list-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{b.authors.join(", ")}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={11} color={days <= 3 ? "var(--red)" : "var(--amber)"} />
                      <span style={{ fontSize: 11, color: days <= 3 ? "var(--red)" : "var(--amber)" }}>
                        Due {new Date(b.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ({days}d)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
