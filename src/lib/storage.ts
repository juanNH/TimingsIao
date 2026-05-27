export type BossRecord = {
  bossId: string;
  lastSeenAt: string;
  updatedAt: string;
  lastNotifiedWindow: string | null;
};

export type StorageMode = "loading" | "supabase" | "local";

export type SupabaseBossRecord = {
  boss_id: string;
  last_seen_at: string;
  updated_at: string;
  last_notified_window: string | null;
};

const localStorageKey = "timings-iao-records";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseTable = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? "boss_records";

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function toRecord(row: SupabaseBossRecord): BossRecord {
  return {
    bossId: row.boss_id,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
    lastNotifiedWindow: row.last_notified_window
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

async function supabaseRequest(path: string, init?: RequestInit) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase no esta configurado.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Supabase rechazo la operacion.");
  }

  return response.json();
}

export async function loadRecords(): Promise<{
  records: BossRecord[];
  mode: StorageMode;
}> {
  if (!hasSupabaseConfig()) {
    return { records: readLocalRecords(), mode: "local" };
  }

  try {
    const rows = (await supabaseRequest(
      `${supabaseTable}?select=boss_id,last_seen_at,updated_at,last_notified_window`
    )) as SupabaseBossRecord[];

    return { records: rows.map(toRecord), mode: "supabase" };
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
    lastNotifiedWindow: input.lastNotifiedWindow ?? null
  };

  if (!hasSupabaseConfig()) {
    writeLocalRecord(record);
    return { record, mode: "local" };
  }

  try {
    const rows = (await supabaseRequest(`${supabaseTable}?on_conflict=boss_id`, {
      method: "POST",
      body: JSON.stringify({
        boss_id: record.bossId,
        last_seen_at: record.lastSeenAt,
        updated_at: record.updatedAt,
        last_notified_window: record.lastNotifiedWindow
      }),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      }
    })) as SupabaseBossRecord[];

    return { record: toRecord(rows[0]), mode: "supabase" };
  } catch {
    writeLocalRecord(record);
    return { record, mode: "local" };
  }
}
