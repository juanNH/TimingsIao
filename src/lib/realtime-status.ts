import { type RealtimeStatus } from "@/lib/realtime";

export function realtimeStatusLabel(status: RealtimeStatus) {
  if (status === "connected") return "conectado";
  if (status === "connecting") return "conectando";
  if (status === "error") return "error";
  if (status === "closed") return "cerrado";
  return "desactivado";
}
