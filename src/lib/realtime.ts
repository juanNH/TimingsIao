import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toRecord, type BossRecord, type SupabaseBossRecord } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

const supabaseTable = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? "boss_records";

export type RealtimeStatus =
  | "closed"
  | "connected"
  | "connecting"
  | "disabled"
  | "error";

export function subscribeToBossRecords(options: {
  onRecord: (record: BossRecord) => void;
  onStatus: (status: RealtimeStatus) => void;
}) {
  const client = supabase;

  if (!client) {
    options.onStatus("disabled");
    return () => undefined;
  }

  options.onStatus("connecting");

  const channel = client
    .channel("boss-records")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: supabaseTable
      },
      (payload: RealtimePostgresChangesPayload<SupabaseBossRecord>) => {
        if (payload.eventType === "DELETE") return;
        if (!payload.new) return;

        options.onRecord(toRecord(payload.new as SupabaseBossRecord));
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        options.onStatus("connected");
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        options.onStatus("error");
        return;
      }

      if (status === "CLOSED") {
        options.onStatus("closed");
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}
