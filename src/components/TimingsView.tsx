"use client";

import { useEffect, useState } from "react";
import { BossCard } from "@/components/BossCard";
import { useBossTimings } from "@/hooks/useBossTimings";
import { BOSSES } from "@/lib/bosses";
import { realtimeStatusLabel } from "@/lib/realtime-status";

export function TimingsView() {
  const [now, setNow] = useState(() => new Date());
  const {
    drafts,
    error,
    realtimeStatus,
    recentHistory,
    records,
    savingBossId,
    storageMode,
    undoRecords,
    registerBoss,
    undoBoss,
    updateDraft
  } = useBossTimings();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <section className="topbar" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Control de respawns</p>
          <h1 id="page-title">Timings IAO</h1>
          <p className="lead">
            Registra la ultima hora de muerte de cada boss. La app calcula la
            ventana de aparicion, marca cuando esta activa y avisa si el spawn
            ya se perdio.
          </p>
        </div>

        <aside className="sync-panel" aria-label="Estado de guardado">
          <p className="sync-title">Guardado</p>
          <p className="sync-status">
            {storageMode === "loading" && "Cargando..."}
            {storageMode === "supabase" && "Supabase"}
            {storageMode === "local" && "Local del navegador"}
          </p>
          <p className="sync-help">
            {storageMode === "supabase"
              ? `Los registros se comparten entre dispositivos. Tiempo real: ${realtimeStatusLabel(realtimeStatus)}.`
              : "Configura Supabase para compartir los datos online."}
          </p>
        </aside>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="grid" aria-label="Listado de bosses">
        {BOSSES.map((boss) => (
          <BossCard
            boss={boss}
            canUndo={Boolean(undoRecords[boss.id])}
            draft={drafts[boss.id]}
            isSaving={savingBossId === boss.id}
            isWriteDisabled={false}
            key={boss.id}
            now={now}
            recentHistory={recentHistory[boss.id] ?? []}
            record={records[boss.id]}
            onDraftChange={updateDraft}
            onRegister={registerBoss}
            onUndo={undoBoss}
          />
        ))}
      </section>
    </>
  );
}
