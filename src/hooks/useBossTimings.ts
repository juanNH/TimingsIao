"use client";

import { useCallback, useEffect, useState } from "react";
import { BOSSES, type Boss } from "@/lib/bosses";
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
import { makeDraft, type Draft } from "@/lib/timings";
import { parseLocalDateTime } from "@/lib/time";

function indexRecords(records: BossRecord[]) {
  return Object.fromEntries(records.map((record) => [record.bossId, record]));
}

function buildDrafts(records: Record<string, BossRecord>) {
  return Object.fromEntries(
    BOSSES.map((boss) => {
      const record = records[boss.id];
      const date = record ? new Date(record.lastSeenAt) : new Date();
      return [boss.id, makeDraft(date)];
    })
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useBossTimings() {
  const [records, setRecords] = useState<Record<string, BossRecord>>({});
  const [undoRecords, setUndoRecords] = useState<Record<string, BossRecord>>(
    {}
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [storageMode, setStorageMode] = useState<StorageMode>("loading");
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("disabled");
  const [savingBossId, setSavingBossId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitialRecords() {
      try {
        const { records: loadedRecords, mode } = await loadRecords();
        if (!active) return;

        const nextRecords = indexRecords(loadedRecords);
        setRecords(nextRecords);
        setDrafts(buildDrafts(nextRecords));
        setStorageMode(mode);
      } catch (loadError) {
        if (!active) return;

        setStorageMode("local");
        setError(errorMessage(loadError, "No se pudieron cargar los registros."));
      }
    }

    void loadInitialRecords();

    return () => {
      active = false;
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

  const updateDraft = useCallback((bossId: string, draft: Draft) => {
    setDrafts((current) => ({ ...current, [bossId]: draft }));
  }, []);

  const registerBoss = useCallback(
    async (boss: Boss, useCurrentDate: boolean) => {
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
        setError(errorMessage(saveError, "No se pudo guardar el registro."));
      } finally {
        setSavingBossId(null);
      }
    },
    [drafts, records]
  );

  const undoBoss = useCallback(
    async (boss: Boss) => {
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
          delete next[boss.id];
          return next;
        });
        setRecords((current) => ({ ...current, [boss.id]: saved.record }));
        setDrafts((current) => ({
          ...current,
          [boss.id]: makeDraft(new Date(saved.record.lastSeenAt))
        }));
        setStorageMode(saved.mode);
      } catch (saveError) {
        setError(errorMessage(saveError, "No se pudo deshacer el registro."));
      } finally {
        setSavingBossId(null);
      }
    },
    [undoRecords]
  );

  return {
    drafts,
    error,
    realtimeStatus,
    records,
    savingBossId,
    storageMode,
    undoRecords,
    registerBoss,
    undoBoss,
    updateDraft
  };
}
