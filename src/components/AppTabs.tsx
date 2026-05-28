export type AppTab = "history" | "timings";

type AppTabsProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

export function AppTabs({ activeTab, onTabChange }: AppTabsProps) {
  return (
    <nav className="tabs" aria-label="Secciones">
      <button
        className={`tab-button ${activeTab === "timings" ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("timings")}
      >
        Timings
      </button>
      <button
        className={`tab-button ${activeTab === "history" ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("history")}
      >
        Historial
      </button>
    </nav>
  );
}
