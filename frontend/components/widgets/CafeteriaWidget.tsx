"use client";
import { useState, useEffect } from "react";
import { UtensilsCrossed, MapPin } from "lucide-react";

interface MealData { specialItems: string[]; dailyItems: string[]; }
interface TodayMenu { day: string; menu: { breakfast: MealData; lunch: MealData; dinner: MealData }; timings: Record<string, string>; }
interface Eatery { name: string; type: string; location: string; popularItems: string[]; priceRating: string; timing: string; }

export function CafeteriaWidget() {
  const [tab, setTab] = useState<"menu" | "eateries">("menu");
  const [mealTab, setMealTab] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [todayMenu, setTodayMenu] = useState<TodayMenu | null>(null);
  const [eateries, setEateries] = useState<Eatery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 10) setMealTab("breakfast");
    else if (hr < 15) setMealTab("lunch");
    else setMealTab("dinner");

    fetch("/api/cafeteria/today").then(r => r.json()).then(d => { setTodayMenu(d); setLoading(false); }).catch(() => setLoading(false));
    fetch("/api/cafeteria/eateries").then(r => r.json()).then(d => setEateries(d.eateries || [])).catch(() => {});
  }, []);

  const mealData = todayMenu?.menu[mealTab];
  const allItems = [...(mealData?.specialItems || []), ...(mealData?.dailyItems || [])];

  const priceColor: Record<string, string> = { "₹": "var(--green)", "₹₹": "var(--amber)", "₹₹₹": "var(--red)" };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 380 }}>
      <div className="widget-header">
        <div className="widget-title">
          <span className="widget-title-dot" style={{ background: "var(--cafe-accent)" }} />
          <UtensilsCrossed size={14} color="var(--cafe-accent)" />
          <span>Cafeteria</span>
        </div>
        {todayMenu && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{todayMenu.day}'s Menu</span>}
      </div>

      <div className="tabs">
        {(["menu", "eateries"] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "menu" ? "Today's Menu" : "Eateries"}
          </button>
        ))}
      </div>

      <div className="widget-body" style={{ flex: 1 }}>
        {tab === "menu" ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {(["breakfast", "lunch", "dinner"] as const).map(m => (
                <button key={m} onClick={() => setMealTab(m)}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: "1px solid",
                    fontSize: 11, fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
                    background: mealTab === m ? "var(--cafe-dim)" : "transparent",
                    borderColor: mealTab === m ? "var(--cafe-accent)" : "var(--border)",
                    color: mealTab === m ? "var(--cafe-accent)" : "var(--text-3)" }}>
                  {m}
                </button>
              ))}
            </div>
            {loading ? (
              <>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 12, marginBottom: 8 }} />)}</>
            ) : allItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-3)", fontSize: 13 }}>Menu not available</div>
            ) : (
              <>
                {mealData?.specialItems && mealData.specialItems.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Today's Specials</div>
                    <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 10 }}>
                      {mealData.specialItems.map((item, i) => (
                        <span key={i} className="meal-item" style={{ background: "var(--cafe-dim)", borderColor: "rgba(249,115,22,0.2)", color: "var(--cafe-accent)" }}>{item}</span>
                      ))}
                    </div>
                  </>
                )}
                {mealData?.dailyItems && mealData.dailyItems.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Daily Items</div>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>
                      {mealData.dailyItems.map((item, i) => <span key={i} className="meal-item">{item}</span>)}
                    </div>
                  </>
                )}
                <div style={{ marginTop: 12, padding: "8px 10px", background: "var(--bg-3)", borderRadius: 7, fontSize: 11, color: "var(--text-3)" }}>
                  🕐 {todayMenu?.timings[mealTab]}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {eateries.length === 0 ? (
              <>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}</>
            ) : eateries.map((e, i) => (
              <div key={i} style={{ background: "var(--bg-3)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{e.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: priceColor[e.priceRating] || "var(--text-3)" }}>{e.priceRating}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MapPin size={10} color="var(--text-3)" />
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{e.location}</span>
                  <span className="badge badge-gray">{e.type}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>{e.popularItems?.join(", ")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
