import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUsername } from "@/lib/auth";

export type BossRecord = {
  bossId: string;
  lastSeenAt: string;
  updatedAt: string;
  lastNotifiedWindow: string | null;
  changedByUserId: string | null;
  changedByUsername: string | null;
};

export type StorageMode = "loading" | "supabase" | "local";

export type SupabaseBossRecord = {
  boss_id: string;
  last_seen_at: string;
  updated_at: string;
  last_notified_window: string | null;
  changed_by_user_id: string | null;
  changed_by_username: string | null;
};

export type BossRecordHistoryItem = {
  id: number;
  bossId: string;
  operation: string;
  previousLastSeenAt: string | null;
  newLastSeenAt: string;
  previousRecord: Record<string, unknown> | null;
  newRecord: Record<string, unknown> | null;
  changedByUserId: string | null;
  changedByUsername: string | null;
  changedAt: string;
};

type SupabaseBossRecordHistoryItem = {
  id: number;
  boss_id: string;
  operation: string;
  previous_last_seen_at: string | null;
  new_last_seen_at: string;
  previous_record: Record<string, unknown> | null;
  new_record: Record<string, unknown> | null;
  changed_by_user_id: string | null;
  changed_by_username: string | null;
  changed_at: string;
};

const localStorageKey = "timings-iao-records";
const supabaseTable = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? "boss_records";

export function toRecord(row: SupabaseBossRecord): BossRecord {
  return {
    bossId: row.boss_id,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
    lastNotifiedWindow: row.last_notified_window,
    changedByUserId: row.changed_by_user_id,
    changedByUsername: row.changed_by_username
  };
}

function toHistoryItem(
  row: SupabaseBossRecordHistoryItem
): BossRecordHistoryItem {
  return {
    id: row.id,
    bossId: row.boss_id,
    operation: row.operation,
    previousLastSeenAt: row.previous_last_seen_at,
    newLastSeenAt: row.new_last_seen_at,
    previousRecord: row.previous_record,
    newRecord: row.new_record,
    changedByUserId: row.changed_by_user_id,
    changedByUsername: row.changed_by_username,
    changedAt: row.changed_at
  };
}

function readLocalRecords(): BossRecord[] {
  if (typeof window === "undefined") return [];

  const rawRecords = window.localStorage.getItem(localStorageKey);
  if (!rawRecords) return [];

  try {
    const records = JSON.parse(rawRecords) as BossRecord[];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeLocalRecord(record: BossRecord) {
  const records = readLocalRecords();
  const nextRecords = [
    ...records.filter((current) => current.bossId !== record.bossId),
    record
  ];
  window.localStorage.setItem(localStorageKey, JSON.stringify(nextRecords));
}

export async function loadRecords(): Promise<{
  records: BossRecord[];
  mode: StorageMode;
}> {
  if (!hasSupabaseConfig() || !supabase) {
    return { records: readLocalRecords(), mode: "local" };
  }

  try {
    const { data, error } = await supabase
      .from(supabaseTable)
      .select(
        "boss_id,last_seen_at,updated_at,last_notified_window,changed_by_user_id,changed_by_username"
      );

    if (error) throw error;

    return {
      records: ((data ?? []) as SupabaseBossRecord[]).map(toRecord),
      mode: "supabase"
    };
  } catch {
    return { records: readLocalRecords(), mode: "local" };
  }
}

export async function saveRecord(input: {
  bossId: string;
  lastSeenAt: string;
  lastNotifiedWindow?: string | null;
}): Promise<{ record: BossRecord; mode: StorageMode }> {
  const record: BossRecord = {
    bossId: input.bossId,
    lastSeenAt: input.lastSeenAt,
    updatedAt: new Date().toISOString(),
    lastNotifiedWindow: input.lastNotifiedWindow ?? null,
    changedByUserId: null,
    changedByUsername: getSessionUsername()
  };

  if (!hasSupabaseConfig() || !supabase) {
    writeLocalRecord(record);
    return { record, mode: "local" };
  }

  try {
    const username = getSessionUsername();
    if (!username) throw new Error("Tenes que iniciar sesion.");

    const { data, error } = await supabase.rpc("save_boss_record", {
      p_boss_id: record.bossId,
      p_last_notified_window: record.lastNotifiedWindow,
      p_last_seen_at: record.lastSeenAt,
      p_username: username
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return { record: toRecord(row as SupabaseBossRecord), mode: "supabase" };
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("No se pudo guardar el registro.");
  }
}

export async function loadHistory(input: {
  page: number;
  pageSize: number;
}): Promise<{
  items: BossRecordHistoryItem[];
  total: number;
}> {
  if (!hasSupabaseConfig() || !supabase) {
    return { items: [], total: 0 };
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  const { count, data, error } = await supabase
    .from("boss_record_history")
    .select(
      "id,boss_id,operation,previous_last_seen_at,new_last_seen_at,previous_record,new_record,changed_by_user_id,changed_by_username,changed_at",
      { count: "exact" }
    )
    .order("changed_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    items: ((data ?? []) as SupabaseBossRecordHistoryItem[]).map(toHistoryItem),
    total: count ?? 0
  };
}
