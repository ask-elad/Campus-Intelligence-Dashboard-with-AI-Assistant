import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Dashboard } from "@/components/Dashboard";
import { AiAssistant } from "@/components/AiAssistant";
import { useCampusData, serverStatuses } from "@/hooks/useCampusData";

type View = "dashboard" | "assistant";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const data = useCampusData();
  const statuses = serverStatuses(data);

  function askFromDashboard(message: string) {
    setPendingMessage(message);
    setView("assistant");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <Sidebar view={view} onViewChange={setView} statuses={statuses} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} onViewChange={setView} />
        <main className="min-h-0 flex-1">
          {view === "dashboard" ? (
            <Dashboard data={data} onAsk={askFromDashboard} />
          ) : (
            <AiAssistant
              pendingMessage={pendingMessage}
              onConsumedPending={() => setPendingMessage(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
