"use client";

import { useState } from "react";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import { AuthGate } from "@/components/AuthGate";
import { HistoryView } from "@/components/HistoryView";
import { TimingsView } from "@/components/TimingsView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("timings");

  return (
    <AuthGate>
      <main className="page">
        <AppTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === "timings" ? <TimingsView /> : <HistoryView />}
      </main>
    </AuthGate>
  );
}
