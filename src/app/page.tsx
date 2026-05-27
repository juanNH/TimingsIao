"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BOSSES, type Boss } from "@/lib/bosses";
import {
  addMinutes,
  formatDateForInput,
  formatDisplayDate,
  formatDisplayTime,
  formatTimeForInput,
  parseLocalDateTime
} from "@/lib/time";
import {
  loadRecords,
  saveRecord,
  type BossRecord,
  type StorageMode
} from "@/lib/storage";
import {
  subscribeToBossRecords,
  type RealtimeStatus
} from "@/lib/realtime";

type Draft = {
  date: string;
  time: string;
};

type WindowState = {
  start: Date;
  end: Date;
  status: "upcoming" | "active" | "lost";
};

function calculateWindow(boss: Boss, lastSeenAt: Date, now: Date): WindowState {
  const start = addMinutes(lastSeenAt, boss.respawnMinMinutes);
  const end = addMinutes(lastSeenAt, boss.respawnMaxMinutes);

  if (now > end) {
    return { start, end, status: "lost" };
  }

  if (now >= start && now <= end) {
    return { start, end, status: "active" };
  }

  return { start, end, status: "upcoming" };
}

function statusLabel(status: WindowState["status"]) {
  if (status === "lost") return "Spawn perdido";
  if (status === "active") return "Apareciendo";
  return "Pendiente";
}

function makeDraft(date: Date): Draft {
  return {
    date: formatDateForInput(date),
    time: formatTimeForInput(date)
  };
}

function realtimeStatusLabel(status: RealtimeStatus) {
  if (status === "connected") return "conectado";
  if (status === "connecting") return "conectando";
  if (status === "error") return "error";
  if (status === "closed") return "cerrado";
  return "desactivado";
}

export default function Home() {
  const [records, setRecords] = useState<Record<string, BossRecord>>({});
  const [undoRecords, setUndoRecords] = useState<Record<string, BossRecord>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [now, setNow] = useState(() => new Date());
  const [storageMode, setStorageMode] = useState<StorageMode>("loading");
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("disabled");
  const [savingBossId, setSavingBossId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let alive = true;

    loadRecords()
      .then(({ records: loadedRecords, mode }) => {
        if (!alive) return;

        const nextRecords = Object.fromEntries(
          loadedRecords.map((record) => [record.bossId, record])
        );
        const nextDrafts = Object.fromEntries(
          BOSSES.map((boss) => {
            const record = nextRecords[boss.id];
            const date = record ? new Date(record.lastSeenAt) : new Date();
            return [boss.id, makeDraft(date)];
          })
        );

        setRecords(nextRecords);
        setDrafts(nextDrafts);
        setStorageMode(mode);
      })
      .catch((loadError) => {
        if (!alive) return;
        setStorageMode("local");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los registros."
        );
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (storageMode !== "supabase") return;

    return subscribeToBossRecords({
      onRecord: (record) => {
        setRecords((current) => ({ ...current, [record.bossId]: record }));
        setDrafts((current) => ({
          ...current,
          [record.bossId]: makeDraft(new Date(record.lastSeenAt))
        }));
      },
      onStatus: setRealtimeStatus
    });
  }, [storageMode]);

  const sortedBosses = useMemo(() => BOSSES, []);

  async function registerBoss(boss: Boss, useCurrentDate: boolean) {
    setError(null);
    setSavingBossId(boss.id);

    try {
      const lastSeenAt = useCurrentDate
        ? new Date()
        : parseLocalDateTime(drafts[boss.id]?.date, drafts[boss.id]?.time);

      if (!lastSeenAt) {
        throw new Error("Revisa la fecha y hora antes de registrar.");
      }

      const saved = await saveRecord({
        bossId: boss.id,
        lastSeenAt: lastSeenAt.toISOString()
      });

      setUndoRecords((current) => {
        const previousRecord = records[boss.id];
        if (!previousRecord) return current;
        return { ...current, [boss.id]: previousRecord };
      });
      setRecords((current) => ({ ...current, [boss.id]: saved.record }));
      setDrafts((current) => ({
        ...current,
        [boss.id]: makeDraft(lastSeenAt)
      }));
      setStorageMode(saved.mode);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el registro."
      );
    } finally {
      setSavingBossId(null);
    }
  }

  async function undoBoss(boss: Boss) {
    const recordToRestore = undoRecords[boss.id];
    if (!recordToRestore) return;

    setError(null);
    setSavingBossId(boss.id);

    try {
      const saved = await saveRecord({
        bossId: boss.id,
        lastSeenAt: recordToRestore.lastSeenAt,
        lastNotifiedWindow: recordToRestore.lastNotifiedWindow
      });

      setUndoRecords((current) => {
        const next = { ...current };
        const currentRecord = records[boss.id];
        if (currentRecord) {
          next[boss.id] = currentRecord;
        } else {
          delete next[boss.id];
        }
        return next;
      });
      setRecords((current) => ({ ...current, [boss.id]: saved.record }));
      setDrafts((current) => ({
        ...current,
        [boss.id]: makeDraft(new Date(saved.record.lastSeenAt))
      }));
      setStorageMode(saved.mode);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo deshacer el registro."
      );
    } finally {
      setSavingBossId(null);
    }
  }

  return (
    <main className="page">
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
        {sortedBosses.map((boss) => {
          const record = records[boss.id];
          const lastSeenAt = record ? new Date(record.lastSeenAt) : null;
          const windowState = lastSeenAt
            ? calculateWindow(boss, lastSeenAt, now)
            : null;
          const draft = drafts[boss.id] ?? makeDraft(now);
          const isSaving = savingBossId === boss.id;
          const canUndo = Boolean(undoRecords[boss.id]);

          return (
            <article
              className={`boss-card ${windowState?.status ?? ""}`}
              key={boss.id}
            >
              <div className="boss-media" aria-hidden="true">
                <Image
                  className="boss-image"
                  src={boss.image}
                  alt=""
                  sizes="96px"
                  priority={boss.id === "garveloth" || boss.id === "archimago"}
                />
              </div>

              <div>
                <h2 className="boss-name">{boss.name}</h2>
                <p className="respawn">{boss.respawnLabel}</p>
              </div>

              <label>
                <span className="field-label">Ultima hora</span>
                <div className="time-row">
                  <input
                    className="time-input"
                    type="time"
                    value={draft.time}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [boss.id]: { ...draft, time: event.target.value }
                      }))
                    }
                  />
                  <input
                    className="date-input"
                    type="date"
                    value={draft.date}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [boss.id]: { ...draft, date: event.target.value }
                      }))
                    }
                  />
                </div>
              </label>

              <p className="last-record">
                {lastSeenAt
                  ? `Ultimo registro: ${formatDisplayTime(lastSeenAt)} - ${formatDisplayDate(lastSeenAt)}`
                  : "Sin registros todavia"}
              </p>

              <div className="actions-row">
                <button
                  className="register-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => registerBoss(boss, false)}
                >
                  {isSaving ? "Guardando..." : "Registrar"}
                </button>

                <button
                  className="register-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => registerBoss(boss, true)}
                >
                  Ahora
                </button>
              </div>

              <button
                className="undo-button"
                type="button"
                disabled={isSaving || !canUndo}
                onClick={() => undoBoss(boss)}
              >
                Deshacer ultimo cambio
              </button>

              <div className="card-footer">
                <span
                  className={`status-pill ${windowState?.status ?? "upcoming"}`}
                >
                  {windowState ? statusLabel(windowState.status) : "Sin datos"}
                </span>
              </div>

              <div>
                <span className="field-label">Aparece</span>
                <div className="window">
                  {windowState
                    ? `${formatDisplayTime(windowState.start)} a ${formatDisplayTime(windowState.end)}`
                    : "--:-- a --:--"}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
