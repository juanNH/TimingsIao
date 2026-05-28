"use client";

import { useState } from "react";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import { HistoryView } from "@/components/HistoryView";
import { TimingsView } from "@/components/TimingsView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("timings");

  return (
    <main className="page">
      <AppTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "timings" ? <TimingsView /> : <HistoryView />}
    </main>
  );
}
