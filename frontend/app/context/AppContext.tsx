"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface StudentProfile {
  name: string;
  id: string;
  branch: string;
  year: string;
}

const DEMO_PROFILES: StudentProfile[] = [
  { name: "Aryan Rai", id: "STU-2021-ME-001", branch: "Mechanical Engineering", year: "4th Year" },
  { name: "Virat Kohli",   id: "STU-2022-ME-042",  branch: "Mechanical Engineering",  year: "3rd Year" }
];

interface AppContextValue {
  profile: StudentProfile;
  setProfile: (p: StudentProfile) => void;
  demoProfiles: StudentProfile[];
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<StudentProfile>(DEMO_PROFILES[0]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ci_profile");
    if (saved) { try { setProfileState(JSON.parse(saved)); } catch {} }
    const savedTheme = localStorage.getItem("ci_theme") as "dark" | "light" | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      document.documentElement.style.setProperty("--bg", "#f0f4f9");
      document.documentElement.style.setProperty("--bg-2", "#e5ecf5");
      document.documentElement.style.setProperty("--bg-3", "#d8e3ef");
      document.documentElement.style.setProperty("--card", "#ffffff");
      document.documentElement.style.setProperty("--card-hover", "#f5f8fc");
      document.documentElement.style.setProperty("--border", "#c8d8ea");
      document.documentElement.style.setProperty("--border-2", "#a8c0d8");
      document.documentElement.style.setProperty("--text", "#0d1a2e");
      document.documentElement.style.setProperty("--text-2", "#3a5472");
      document.documentElement.style.setProperty("--text-3", "#6b8aaa");
    } else {
      document.documentElement.style.setProperty("--bg", "#080d1a");
      document.documentElement.style.setProperty("--bg-2", "#0d1526");
      document.documentElement.style.setProperty("--bg-3", "#111d35");
      document.documentElement.style.setProperty("--card", "#0e1829");
      document.documentElement.style.setProperty("--card-hover", "#13213a");
      document.documentElement.style.setProperty("--border", "#1a2d4a");
      document.documentElement.style.setProperty("--border-2", "#243d60");
      document.documentElement.style.setProperty("--text", "#e8edf5");
      document.documentElement.style.setProperty("--text-2", "#8fa3c0");
      document.documentElement.style.setProperty("--text-3", "#5a7499");
    }
  }, [theme]);

  const setProfile = (p: StudentProfile) => {
    setProfileState(p);
    localStorage.setItem("ci_profile", JSON.stringify(p));
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ci_theme", next);
  };

  return (
    <AppContext.Provider value={{ profile, setProfile, demoProfiles: DEMO_PROFILES, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
