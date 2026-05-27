import { type Boss } from "@/lib/bosses";
import {
  addMinutes,
  formatDateForInput,
  formatTimeForInput
} from "@/lib/time";

export type Draft = {
  date: string;
  time: string;
};

export type WindowState = {
  start: Date;
  end: Date;
  status: "upcoming" | "active" | "lost";
};

export function calculateWindow(
  boss: Boss,
  lastSeenAt: Date,
  now: Date
): WindowState {
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

export function makeDraft(date: Date): Draft {
  return {
    date: formatDateForInput(date),
    time: formatTimeForInput(date)
  };
}

export function statusLabel(status: WindowState["status"]) {
  if (status === "lost") return "Spawn perdido";
  if (status === "active") return "Apareciendo";
  return "Pendiente";
}
